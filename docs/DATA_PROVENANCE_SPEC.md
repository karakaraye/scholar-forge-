# Data Provenance, Cleaning & Security Specification

## 1. Overview & Data Integrity Principles

The ScholarForge AI **Data Provenance & Cleaning Engine** manages real research datasets while ensuring absolute data security, reproducibility, and auditability.

---

## 2. Dataset Ingestion & Security Protections

### 2.1 File Size & Format Restrictions
- **Maximum File Size**: 20 Megabytes (20MB), strictly enforced at both HTTP request upload and backend parser levels.
- **Supported Formats**:
  - `CSV` (Comma-Separated Values)
  - `XLSX` (Microsoft Excel OpenXML Spreadsheet)
  - `JSON` (JavaScript Object Notation array of records)

### 2.2 Formula Injection Sanitization (CSV / Excel Neutralization)
To prevent CSV Formula Injection / Macro Injection attacks (CWE-1236) where malicious spreadsheet formulas execute code upon export, the engine parses every string cell during ingestion.
- **Trigger Characters**: Cells starting with `=`, `+`, `-`, or `@`.
- **Sanitization Transformation**: Prepends a single quote `'` to neutralize formula execution:
  ```python
  def sanitize_cell_value(val: str) -> str:
      if isinstance(val, str) and val.startswith(('=', '+', '-', '@')):
          return f"'{val}"
      return val
  ```
- **Researcher Transparency**: If formula characters are detected, the system sets `has_formula_sanitized = True` and displays an informative banner:
  > *Security Protection Applied: CSV formula injection characters (=, +, -, @) were detected in uploaded cells and safely escaped with single quotes to protect researcher environments.*

---

## 3. Automated Profiling & Type Inference

Upon upload and after each cleaning action, the dataset is profiled without executing arbitrary user scripts:
- **Inferred Types**: `INTEGER`, `FLOAT`, `CATEGORICAL`, `DATETIME`, `BOOLEAN`, `TEXT`
- **Missing Value Detection**: Exact counts and percentages per column
- **Duplicate Observations**: Exact row duplication count
- **Descriptive Statistics**: Min, Max, Mean, Median, Variance, Standard Deviation, $Q_1$, $Q_3$, and $IQR$.

---

## 4. Reproducible Data Cleaning Transformations

Data cleaning is completely reproducible and non-destructive:
- **Raw Data Preservation**: The original uploaded file payload is preserved in `DatasetVersion 1`.
- **Cleaning Actions**:
  1. `impute_missing`: Mean, Median, Mode, or Constant value imputation.
  2. `drop_duplicates`: Removes duplicate rows.
  3. `handle_outliers`: Winsorization or truncation based on the Interquartile Range ($IQR \times 1.5$ rule).
  4. `reverse_score`: Inverts Likert items ($x_{\text{new}} = \text{max} + \text{min} - x_{\text{old}}$).
  5. `composite_score`: Generates index scale scores as the mean or sum of selected items.
- **Version Lineage**: Each transformation creates an immutable `DatasetVersion` (`v1`, `v2`, `v3`...) with audit timestamp and transformation rationale.
- **Instant Rollback**: The researcher can revert to any prior version number with a single click, instantly updating all profile statistics and downstream analyses.

