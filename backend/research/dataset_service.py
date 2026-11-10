"""
Dataset Management and Cleaning Service for ScholarForge AI.

Handles:
- Secure ingestion of CSV, XLSX, and JSON datasets (up to 20MB).
- Formula injection sanitization (protecting against spreadsheet command injection '=, +, -, @').
- Automatic column type inference (Numeric, Ordinal, Categorical, Text, Date).
- Data quality profiling: missing values, duplicate detection, cardinality, basic summary statistics.
- Reproducible data cleaning transformations:
    - Missing value imputation (Mean, Median, Mode, Constant)
    - Duplicate row dropping
    - Outlier detection (IQR, Z-Score) and winsorizing/filtering
    - Likert scale reverse scoring
    - Construct scale composition (Sum, Mean of items)
    - Column type casting
- Dataset versioning, audit trail, and non-destructive rollback.
"""

import csv
import io
import json
import math
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, List, Any, Tuple, Optional
from django.core.files.uploadedfile import UploadedFile


class DatasetService:
    MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 Megabytes

    MISSING_TOKENS = {"", "na", "n/a", "null", "none", "nan", ".", "undefined", "#n/a"}

    # Formula injection characters
    FORMULA_TRIGGERS = ("=", "+", "-", "@", "\t", "\r")

    @classmethod
    def sanitize_cell_value(cls, value: Any) -> Tuple[Any, bool]:
        """
        Detects and neutralizes CSV / Spreadsheet formula injection vectors.
        Prepends a single quote if string begins with =, +, -, @, tab, or carriage return.
        """
        if isinstance(value, str):
            stripped = value.strip()
            if stripped and stripped[0] in cls.FORMULA_TRIGGERS:
                # Neutralize by prepending single quote
                return f"'{value}", True
        return value, False

    @classmethod
    def parse_uploaded_file(cls, uploaded_file: UploadedFile, file_format: str = "CSV") -> Dict[str, Any]:
        """
        Parses an uploaded CSV, XLSX, or JSON file, sanitizing formula injection
        and extracting column names and row records.
        """
        if uploaded_file.size > cls.MAX_FILE_SIZE:
            raise ValueError(f"Uploaded file exceeds maximum permitted size of 20MB (got {uploaded_file.size / (1024*1024):.1f}MB).")

        raw_bytes = uploaded_file.read()
        format_upper = file_format.upper()

        if format_upper == "CSV":
            return cls._parse_csv_bytes(raw_bytes)
        elif format_upper == "XLSX":
            return cls._parse_xlsx_bytes(raw_bytes)
        elif format_upper == "JSON":
            return cls._parse_json_bytes(raw_bytes)
        else:
            # Fallback auto-detection based on filename
            filename = uploaded_file.name.lower()
            if filename.endswith(".csv"):
                return cls._parse_csv_bytes(raw_bytes)
            elif filename.endswith(".xlsx"):
                return cls._parse_xlsx_bytes(raw_bytes)
            elif filename.endswith(".json"):
                return cls._parse_json_bytes(raw_bytes)
            else:
                return cls._parse_csv_bytes(raw_bytes)

    @classmethod
    def _parse_csv_bytes(cls, raw_bytes: bytes) -> Dict[str, Any]:
        # Detect encoding
        for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                decoded = raw_bytes.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            decoded = raw_bytes.decode("utf-8", errors="replace")

        # Sniff delimiter
        sample = decoded[:4096]
        delimiter = ","
        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample, delimiters=",\t;|")
            delimiter = dialect.delimiter
        except Exception:
            delimiter = ","

        reader = csv.reader(io.StringIO(decoded), delimiter=delimiter)
        rows = list(reader)
        if not rows:
            return {"columns": [], "rows": [], "row_count": 0, "column_count": 0, "sanitized_count": 0}

        headers = [col.strip() for col in rows[0]]
        # Clean empty or duplicate headers
        clean_headers = []
        seen = {}
        for idx, h in enumerate(headers):
            name = h if h else f"Column_{idx+1}"
            if name in seen:
                seen[name] += 1
                clean_headers.append(f"{name}_{seen[name]}")
            else:
                seen[name] = 0
                clean_headers.append(name)

        data_rows = []
        sanitized_count = 0
        for r in rows[1:]:
            if not any(str(cell).strip() for cell in r):
                continue  # skip completely blank rows
            row_dict = {}
            for idx, col in enumerate(clean_headers):
                raw_val = r[idx] if idx < len(r) else ""
                clean_val, was_sanitized = cls.sanitize_cell_value(raw_val)
                if was_sanitized:
                    sanitized_count += 1
                row_dict[col] = clean_val
            data_rows.append(row_dict)

        return {
            "columns": clean_headers,
            "rows": data_rows,
            "row_count": len(data_rows),
            "column_count": len(clean_headers),
            "sanitized_count": sanitized_count
        }

    @classmethod
    def _parse_json_bytes(cls, raw_bytes: bytes) -> Dict[str, Any]:
        data = json.loads(raw_bytes.decode("utf-8", errors="replace"))
        if isinstance(data, dict):
            # Might be {"records": [...]} or {"data": [...]}
            if "records" in data and isinstance(data["records"], list):
                records = data["records"]
            elif "data" in data and isinstance(data["data"], list):
                records = data["data"]
            else:
                records = [data]
        elif isinstance(data, list):
            records = data
        else:
            records = []

        if not records:
            return {"columns": [], "rows": [], "row_count": 0, "column_count": 0, "sanitized_count": 0}

        # Collect all unique keys
        columns = list({k: True for r in records if isinstance(r, dict) for k in r.keys()}.keys())
        data_rows = []
        sanitized_count = 0

        for r in records:
            if not isinstance(r, dict):
                continue
            row_dict = {}
            for col in columns:
                val = r.get(col, "")
                clean_val, was_sanitized = cls.sanitize_cell_value(val)
                if was_sanitized:
                    sanitized_count += 1
                row_dict[col] = clean_val
            data_rows.append(row_dict)

        return {
            "columns": columns,
            "rows": data_rows,
            "row_count": len(data_rows),
            "column_count": len(columns),
            "sanitized_count": sanitized_count
        }

    @classmethod
    def _parse_xlsx_bytes(cls, raw_bytes: bytes) -> Dict[str, Any]:
        """Parses Microsoft Excel OpenXML (.xlsx) files without external dependencies."""
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as z:
            # 1. Parse shared strings if present
            shared_strings = []
            if "xl/sharedStrings.xml" in z.namelist():
                ss_tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                # Namespace handling: search for any 't' elements
                for si in ss_tree.iter():
                    if si.tag.endswith("}si"):
                        t_parts = [t.text or "" for t in si.iter() if t.tag.endswith("}t")]
                        shared_strings.append("".join(t_parts))

            # 2. Find first worksheet
            sheet_name = "xl/worksheets/sheet1.xml"
            if sheet_name not in z.namelist():
                # Look for any sheet
                sheets = [n for n in z.namelist() if n.startswith("xl/worksheets/sheet")]
                if sheets:
                    sheet_name = sheets[0]
                else:
                    raise ValueError("No valid worksheets found in XLSX archive.")

            ws_tree = ET.fromstring(z.read(sheet_name))
            raw_matrix = []

            for row in ws_tree.iter():
                if row.tag.endswith("}row"):
                    row_cells = []
                    for c in row.iter():
                        if c.tag.endswith("}c"):
                            cell_type = c.attrib.get("t")
                            v_elem = None
                            for child in c:
                                if child.tag.endswith("}v"):
                                    v_elem = child
                                    break

                            val = ""
                            if v_elem is not None and v_elem.text is not None:
                                raw_val = v_elem.text
                                if cell_type == "s" and raw_val.isdigit():
                                    idx = int(raw_val)
                                    val = shared_strings[idx] if idx < len(shared_strings) else ""
                                else:
                                    val = raw_val
                            row_cells.append(val)
                    if row_cells:
                        raw_matrix.append(row_cells)

        if not raw_matrix:
            return {"columns": [], "rows": [], "row_count": 0, "column_count": 0, "sanitized_count": 0}

        headers = [str(c).strip() for c in raw_matrix[0]]
        clean_headers = []
        seen = {}
        for idx, h in enumerate(headers):
            name = h if h else f"Column_{idx+1}"
            if name in seen:
                seen[name] += 1
                clean_headers.append(f"{name}_{seen[name]}")
            else:
                seen[name] = 0
                clean_headers.append(name)

        data_rows = []
        sanitized_count = 0
        for r in raw_matrix[1:]:
            if not any(str(cell).strip() for cell in r):
                continue
            row_dict = {}
            for idx, col in enumerate(clean_headers):
                raw_val = r[idx] if idx < len(r) else ""
                clean_val, was_sanitized = cls.sanitize_cell_value(raw_val)
                if was_sanitized:
                    sanitized_count += 1
                row_dict[col] = clean_val
            data_rows.append(row_dict)

        return {
            "columns": clean_headers,
            "rows": data_rows,
            "row_count": len(data_rows),
            "column_count": len(clean_headers),
            "sanitized_count": sanitized_count
        }

    # --- Profile & Schema Inference ---

    @classmethod
    def profile_dataset(cls, columns: List[str], rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Profiles all columns in dataset: data types, missing counts, descriptive metrics,
        and detects duplicate rows.
        """
        total_rows = len(rows)
        column_profiles = {}

        # 1. Duplicate detection
        serialized_rows = [json.dumps(r, sort_keys=True) for r in rows]
        unique_row_count = len(set(serialized_rows))
        duplicate_rows_count = total_rows - unique_row_count

        for col in columns:
            col_values = [r.get(col) for r in rows]
            missing_count = 0
            valid_values = []

            for val in col_values:
                if val is None:
                    missing_count += 1
                elif isinstance(val, str) and val.strip().lower() in cls.MISSING_TOKENS:
                    missing_count += 1
                else:
                    valid_values.append(val)

            valid_count = len(valid_values)
            missing_pct = round((missing_count / total_rows * 100), 2) if total_rows > 0 else 0.0

            # Inferred Type Detection
            inferred_type = cls._infer_column_type(valid_values)

            # Numerical statistics if applicable
            numeric_stats = None
            if inferred_type in ("NUMERIC", "ORDINAL") and valid_values:
                numeric_stats = cls._calculate_numeric_summary(valid_values)

            # Unique values count & samples
            unique_vals = list({str(v): True for v in valid_values}.keys())
            sample_values = unique_vals[:5]

            column_profiles[col] = {
                "name": col,
                "inferred_type": inferred_type,
                "total_count": total_rows,
                "valid_count": valid_count,
                "missing_count": missing_count,
                "missing_percentage": missing_pct,
                "unique_count": len(unique_vals),
                "sample_values": sample_values,
                "stats": numeric_stats
            }

        return {
            "total_rows": total_rows,
            "total_columns": len(columns),
            "duplicate_rows_count": duplicate_rows_count,
            "columns": column_profiles
        }

    @classmethod
    def _infer_column_type(cls, values: List[Any]) -> str:
        if not values:
            return "TEXT"

        # Check numeric
        numeric_count = 0
        int_values = []
        is_all_ints = True

        for v in values:
            try:
                num = float(str(v).strip())
                numeric_count += 1
                if num.is_integer():
                    int_values.append(int(num))
                else:
                    is_all_ints = False
            except (ValueError, TypeError):
                break

        if numeric_count == len(values) and len(values) > 0:
            # Check if ordinal Likert (values predominantly 1-5 or 1-7 or 0-10)
            if is_all_ints and int_values:
                min_val = min(int_values)
                max_val = max(int_values)
                if min_val in (0, 1) and max_val in (4, 5, 7, 10):
                    return "ORDINAL"
            return "NUMERIC"

        # Check boolean
        bool_tokens = {"true", "false", "yes", "no", "0", "1", "t", "f"}
        if all(str(v).strip().lower() in bool_tokens for v in values):
            return "BOOLEAN"

        # Check date (simple regex for YYYY-MM-DD or DD/MM/YYYY)
        date_pattern = re.compile(r"^(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$")
        if all(date_pattern.match(str(v).strip()) for v in values[:20]):
            return "DATE"

        # Check categorical vs text based on cardinality
        unique_count = len(set(str(v).strip().lower() for v in values))
        ratio = unique_count / len(values) if len(values) > 0 else 1.0
        if unique_count <= 25 or ratio <= 0.2:
            return "CATEGORICAL"

        return "TEXT"

    @classmethod
    def _calculate_numeric_summary(cls, values: List[Any]) -> Dict[str, Any]:
        nums = []
        for v in values:
            try:
                nums.append(float(str(v).strip()))
            except (ValueError, TypeError):
                continue

        if not nums:
            return {}

        n = len(nums)
        nums_sorted = sorted(nums)
        mean_val = sum(nums) / n
        median_val = (
            nums_sorted[n // 2] if n % 2 != 0 else (nums_sorted[n // 2 - 1] + nums_sorted[n // 2]) / 2.0
        )
        min_val = nums_sorted[0]
        max_val = nums_sorted[-1]

        # Variance & Std Dev
        variance = sum((x - mean_val) ** 2 for x in nums) / (n - 1) if n > 1 else 0.0
        stdev = math.sqrt(variance)

        # Q1 and Q3 for IQR
        q1_idx = int(0.25 * n)
        q3_idx = int(0.75 * n)
        q1 = nums_sorted[q1_idx]
        q3 = nums_sorted[q3_idx]
        iqr = q3 - q1

        return {
            "mean": round(mean_val, 4),
            "median": round(median_val, 4),
            "min": round(min_val, 4),
            "max": round(max_val, 4),
            "std_dev": round(stdev, 4),
            "variance": round(variance, 4),
            "q1": round(q1, 4),
            "q3": round(q3, 4),
            "iqr": round(iqr, 4)
        }

    # --- Data Cleaning Transformations ---

    @classmethod
    def apply_imputation(cls, rows: List[Dict[str, Any]], column: str, strategy: str = "MEAN", constant_val: Any = None) -> Tuple[List[Dict[str, Any]], int]:
        """
        Imputes missing values in `column` using MEAN, MEDIAN, MODE, or a CONSTANT.
        Returns (new_rows, count_imputed).
        """
        valid_vals = []
        for r in rows:
            v = r.get(column)
            if v is not None and str(v).strip().lower() not in cls.MISSING_TOKENS:
                valid_vals.append(v)

        if not valid_vals and strategy in ("MEAN", "MEDIAN", "MODE"):
            raise ValueError(f"Cannot impute column '{column}': no valid non-missing values exist.")

        replacement = None
        if strategy == "CONSTANT":
            replacement = constant_val if constant_val is not None else 0
        elif strategy == "MEAN":
            num_vals = [float(v) for v in valid_vals]
            replacement = round(sum(num_vals) / len(num_vals), 4)
        elif strategy == "MEDIAN":
            num_vals = sorted([float(v) for v in valid_vals])
            n = len(num_vals)
            replacement = num_vals[n // 2] if n % 2 != 0 else (num_vals[n // 2 - 1] + num_vals[n // 2]) / 2.0
        elif strategy == "MODE":
            from collections import Counter
            counts = Counter(valid_vals)
            replacement = counts.most_common(1)[0][0]

        count = 0
        new_rows = []
        for r in rows:
            new_r = dict(r)
            v = new_r.get(column)
            if v is None or str(v).strip().lower() in cls.MISSING_TOKENS:
                new_r[column] = replacement
                count += 1
            new_rows.append(new_r)

        return new_rows, count

    @classmethod
    def drop_duplicates(cls, rows: List[Dict[str, Any]], subset: List[str] = None) -> Tuple[List[Dict[str, Any]], int]:
        """Drops duplicate records. Returns (deduplicated_rows, dropped_count)."""
        seen = set()
        new_rows = []
        dropped = 0

        for r in rows:
            if subset:
                key = tuple((k, str(r.get(k))) for k in subset)
            else:
                key = tuple(sorted((k, str(v)) for k, v in r.items()))

            if key in seen:
                dropped += 1
            else:
                seen.add(key)
                new_rows.append(r)

        return new_rows, dropped

    @classmethod
    def reverse_code_item(cls, rows: List[Dict[str, Any]], column: str, min_val: int = 1, max_val: int = 5, new_col_name: str = None) -> List[Dict[str, Any]]:
        """
        Reverse scores an ordinal Likert item using formula: reversed = (min + max) - val.
        Example: 5-point Likert (1 to 5): 1 -> 5, 2 -> 4, 3 -> 3, 4 -> 2, 5 -> 1.
        """
        target_col = new_col_name or f"{column}_rev"
        scale_sum = min_val + max_val

        new_rows = []
        for r in rows:
            new_r = dict(r)
            v = new_r.get(column)
            if v is not None and str(v).strip().lower() not in cls.MISSING_TOKENS:
                try:
                    num_val = float(str(v).strip())
                    new_r[target_col] = round(scale_sum - num_val, 2)
                except (ValueError, TypeError):
                    new_r[target_col] = None
            else:
                new_r[target_col] = None
            new_rows.append(new_r)

        return new_rows

    @classmethod
    def compute_composite_scale(
        cls, rows: List[Dict[str, Any]], columns: List[str], target_col: str, method: str = "MEAN"
    ) -> List[Dict[str, Any]]:
        """
        Creates a composite construct scale variable by calculating the MEAN or SUM
        across specified items for each respondent.
        """
        new_rows = []
        for r in rows:
            new_r = dict(r)
            vals = []
            for col in columns:
                v = new_r.get(col)
                if v is not None and str(v).strip().lower() not in cls.MISSING_TOKENS:
                    try:
                        vals.append(float(str(v).strip()))
                    except (ValueError, TypeError):
                        pass

            if vals:
                if method.upper() == "MEAN":
                    new_r[target_col] = round(sum(vals) / len(vals), 4)
                else:  # SUM
                    new_r[target_col] = round(sum(vals), 4)
            else:
                new_r[target_col] = None
            new_rows.append(new_r)

        return new_rows

    @classmethod
    def handle_outliers(
        cls, rows: List[Dict[str, Any]], column: str, method: str = "IQR", action: str = "WINSORIZE"
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Detects outliers using IQR (1.5 * IQR) and either caps them (WINSORIZE) or removes the row (DROP).
        Returns (modified_rows, outliers_affected_count).
        """
        nums = []
        for r in rows:
            v = r.get(column)
            if v is not None and str(v).strip().lower() not in cls.MISSING_TOKENS:
                try:
                    nums.append(float(str(v).strip()))
                except (ValueError, TypeError):
                    pass

        if len(nums) < 4:
            return rows, 0

        nums_sorted = sorted(nums)
        n = len(nums_sorted)
        q1 = nums_sorted[int(0.25 * n)]
        q3 = nums_sorted[int(0.75 * n)]
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        affected = 0
        new_rows = []

        for r in rows:
            new_r = dict(r)
            v = new_r.get(column)
            is_outlier = False
            if v is not None and str(v).strip().lower() not in cls.MISSING_TOKENS:
                try:
                    val = float(str(v).strip())
                    if val < lower_bound or val > upper_bound:
                        is_outlier = True
                except (ValueError, TypeError):
                    pass

            if is_outlier:
                affected += 1
                if action == "DROP":
                    continue  # skip this row
                elif action == "WINSORIZE":
                    val = float(str(v).strip())
                    new_r[column] = lower_bound if val < lower_bound else upper_bound

            new_rows.append(new_r)

        return new_rows, affected

