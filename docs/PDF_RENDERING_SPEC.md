# ScholarForge AI — Technical Specification
## Print-Ready PDF Academic Rendering Engine

**Document ID:** SPEC-DOC-PDF-008  
**Module:** `backend/research/pdf_export_service.py`  
**Classification:** Core Document Generation & Typesetting  
**Status:** Approved & Implemented (Stage 8)  

---

### 1. Architectural Purpose & Overview

The PDF Rendering Engine produces high-fidelity, print-ready, selectable-text PDF documents directly from the canonical `DocumentIR`.

Key requirements:
1. True vector text with embedded standard fonts (Times-Roman, Helvetica, Courier) ensuring sharp reproduction on high-resolution print presses and screen readers.
2. Complete document bookmarks hierarchy (PDF outlines) allowing interactive navigation across chapters, sections, and preliminary pages.
3. Strict PDF document metadata embedding (`Title`, `Author`, `Subject`, `Keywords`, `Creator: ScholarForge AI`).
4. Dual header/footer layout handling with suppressed first page, Roman front matter page numbers, and Arabic body page numbering.

---

### 2. Rendering Technology & Canvas Architecture

The service leverages `reportlab.platypus` (Page Layout and Typography Using Scripts) with custom `NumberedCanvas` logic:

```python
class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that accumulates total page count and dynamic
    running headers/footers with dual Roman/Arabic pagination.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()
```

---

### 3. Flowables & Typesetting Rules

1. **Title Page**:
   - Suppresses page number on canvas.
   - Vertically balanced using Platypus `Spacer` flowables.
   - Formal institutional text blocks: Title, Degree statement, Author, Department, Institution, and Submission Year.
2. **Preliminary Pages**:
   - Abstract, Declaration, Acknowledgements, and Table of Contents rendered with Roman page numbers (`ii`, `iii`, `iv`...).
   - Each prelim starts on a fresh page via `PageBreak()`.
3. **Headings & Bookmarks**:
   - `Heading 1`: Forces a `PageBreak()`, registers PDF outline bookmark via `canvas.bookmarkPage()` and `canvas.addOutlineEntry()`.
   - `keepWithNext=True` on all headings prevents orphaned heading lines at the bottom of pages.
4. **Academic Tables**:
   - Converted to `reportlab.platypus.Table` with column widths proportionally scaled to match available print width `(page_width - margins - gutter)`.
   - Table headers repeated automatically on page splits via `repeatRows=1`.
   - Three-line border styling: Top (1.5pt), Header bottom (1.0pt), Table bottom (1.5pt), with no vertical borders.
5. **Equations**:
   - Rendered in a distinct shaded block with right-aligned numbering, preserving mathematical syntax.
6. **Bibliography**:
   - Formatted with hanging indentation: `ParagraphStyle(name='Bibliography', leftIndent=36, firstLineIndent=-36)`.

---

### 4. Zero Synthetic Bytes Policy

If external PDF rendering libraries or font assets fail to load or raise memory limits:
- The service **strictly refuses** to write empty, corrupt, or stub binary files.
- An explicit `DocumentExportError` is raised, transitioning the `ExportJob` to status `FAILED` with an actionable error message logged in the database.
- Zero fake bytes or mock PDF blobs are ever persisted.

---

### 5. PDF Metadata & Accessibility

The engine injects ISO 32000-compliant document information:
- `/Title`: Project Title
- `/Author`: Corresponding Author / Researcher Name
- `/Subject`: Academic Field / Discipline
- `/Keywords`: Manuscript Keywords from `ManuscriptMetadata`
- `/Creator`: ScholarForge AI Typesetting Engine (Stage 8)
- `/Producer`: ScholarForge Document Services

