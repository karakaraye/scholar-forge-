# ScholarForge AI — Technical Specification
## Export Quality Assurance & Parity Verification Engine

**Document ID:** SPEC-DOC-QA-008  
**Module:** `backend/research/export_qa_service.py`  
**Classification:** Document Quality Assurance & Verification Intelligence  
**Status:** Approved & Implemented (Stage 8)  

---

### 1. Architectural Purpose & Overview

The Export QA Engine provides automated, objective verification of exported academic documents (.docx and .pdf). It verifies that:
1. Every semantic element from the database and canonical IR is faithfully present in the generated artifact (zero dropped sections, tables, or references).
2. Layout rules (margins, gutters, fonts, line spacing) conform to the assigned institutional template.
3. Cryptographic SHA-256 fingerprints guarantee un-tampered data provenance.
4. Physical rendering anomalies (e.g., table column overflows, uncaptioned figures, orphaned headings) are flagged with actionable remediation recommendations.

---

### 2. Structural Parity Cross-Check Heuristics

When evaluating an export, the engine parses the generated binary (using `python-docx` for Word and `pypdf` for PDF) and computes element-by-element parity against the canonical IR metrics:

| Metric | Source of Truth (IR) | Word Extractor (DOCX) | PDF Extractor (PDF) | Tolerance |
|---|---|---|---|---|
| **Headings (H1–H4)** | `ir.metrics.total_headings` | Count of paragraphs with `style.name.startswith('Heading')` | Outline bookmarks + title patterns | Exact (`diff == 0`) |
| **Tables** | `ir.metrics.total_tables` | `len(doc.tables)` | Extracted table blocks / bounding boxes | Exact (`diff == 0`) |
| **Figures** | `ir.metrics.total_figures` | Inline shapes / image relationships | XObject image streams | Exact (`diff == 0`) |
| **References** | `ir.metrics.total_references` | Paragraphs in bibliography section | Numbered/hanging entries after "References" | Exact (`diff == 0`) |
| **Word Count** | `ir.metrics.total_words` | Sum of words in body paragraphs | Extracted text token count | $\pm 5\%$ (typographic variance) |

If an element count discrepancy is found, an `ExportIssue` is automatically created with category `STRUCTURE` and severity `MAJOR` or `CRITICAL`.

---

### 3. Layout Defect Detection

The engine systematically checks for layout defects:

1. **Unexpected Blank Pages**: Detects consecutive empty page breaks that create unintentional blank pages in physical print.
2. **Table Width Overflow**: Compares table total column width against printable page width `(page_width - left_margin - right_margin - gutter)`. Overflows are flagged as `MAJOR`.
3. **Missing Captions**: Tables or figures lacking immediate accompanying caption text are flagged as `MINOR`.
4. **Header/Footer Suppression Verification**: Confirms that page 1 does not display header or footer page numbers.

---

### 4. Issue Severity & Overall Rating Engine

Issues are categorized into 4 severities:
- `CRITICAL`: Corrupt file, unreadable structure, missing entire chapter or bibliography.
- `MAJOR`: Dropped table/figure, wrong page orientation, table overflowing printable margin.
- `MINOR`: Caption placed above figure instead of below, minor word spacing anomaly.
- `INFORMATIONAL`: General document metadata statistics, font substitution notices.
- `NOT_VERIFIED`: Layout attributes that cannot be definitively measured without a raster printing engine.

#### Overall Rating Algorithm:
```python
if critical_count > 0:
    overall_rating = ExportOverallRating.FAILED
elif major_count > 0:
    overall_rating = ExportOverallRating.NEEDS_ATTENTION
elif minor_count > 2:
    overall_rating = ExportOverallRating.ACCEPTABLE
else:
    overall_rating = ExportOverallRating.EXCELLENT
```

---

### 5. Cryptographic Checksum & Provenance

For every generated artifact:
1. `file_checksum = hashlib.sha256(file_bytes).hexdigest()`
2. Checksum is stored in `DocumentExport.file_checksum`.
3. Validated on download to prevent file corruption or disk tampering.
4. Displayed with a one-click copy button in the frontend `ExportQAPanel`.

