# ScholarForge AI — Technical Specification
## Intermediate Semantic Document Representation (IR) Engine

**Document ID:** SPEC-DOC-IR-008  
**Module:** `backend/research/document_ir.py`  
**Classification:** Core Document Processing Architecture  
**Status:** Approved & Implemented (Stage 8)  

---

### 1. Architectural Purpose & Overview

The Intermediate Semantic Document Representation (Document IR) serves as the canonical, engine-independent abstraction layer between ScholarForge database entities (`ResearchProject`, `ResearchDocument`, `DocumentSection`, `DocumentVersion`, `FormattingTemplate`, `ManuscriptMetadata`) and concrete output rendering engines (Microsoft Word `.docx` and Adobe PDF `.pdf`).

Directly translating HTML or database text to low-level DOCX OpenXML or PDF ReportLab flowables creates tight coupling, erratic layout disparities, and high regression risk. The Document IR resolves this by transforming all manuscript content into a deterministic, validated sequence of strongly-typed semantic blocks prior to file generation.

---

### 2. Core Guarantees & Anti-Fabrication Principles

1. **Zero Content Hallucination**:
   - The IR extracts strictly from persistent snapshot records (`DocumentVersion`, `DocumentSection`, and verified project metadata).
   - No synthetic citations, missing author names, or fake references are invented. Missing metadata items explicitly receive transparent, bracketed placeholders (e.g., `[SUPERVISOR NAME REQUIRED]`).
2. **Deterministic Block Ordering**:
   - Blocks follow an inviolable sequence: Front Matter (Prelims) &rarr; Body Chapters &rarr; References/Bibliography &rarr; Appendices.
3. **Typographic & Layout Fidelity**:
   - Layout parameters (margins, binding gutter, page size, font family, line spacing) are inherited from the active `FormattingTemplate` and frozen within the canonical IR JSON snapshot.

---

### 3. IR Block Type Hierarchy

The IR organizes content into immutable data structures:

```python
class BlockType(str, Enum):
    TITLE_PAGE = "TITLE_PAGE"
    FRONT_MATTER = "FRONT_MATTER"
    HEADING_1 = "HEADING_1"
    HEADING_2 = "HEADING_2"
    HEADING_3 = "HEADING_3"
    HEADING_4 = "HEADING_4"
    PARAGRAPH = "PARAGRAPH"
    BLOCKQUOTE = "BLOCKQUOTE"
    TABLE = "TABLE"
    FIGURE = "FIGURE"
    EQUATION = "EQUATION"
    LIST_ITEM = "LIST_ITEM"
    PAGE_BREAK = "PAGE_BREAK"
    SECTION_BREAK = "SECTION_BREAK"
    BIBLIOGRAPHY_ENTRY = "BIBLIOGRAPHY_ENTRY"
```

#### 3.1 Block Specifications

- **`FrontMatterBlock`**: Represents academic preliminary pages (Title Page, Declaration, Certification, Dedication, Acknowledgements, Abstract, Table of Contents, Lists of Tables/Figures). Contains `page_key`, `title`, `suppress_page_number` (boolean for title page), and paragraphs.
- **`HeadingBlock`**: Encapsulates section headings with level (1 to 4), heading text, chapter numbering, and page-break-before directives for Level 1 chapters.
- **`ParagraphBlock`**: Text runs with semantic formatting tags (bold, italic, underline, superscript, subscript, in-text citations).
- **`TableBlock`**: Structured academic table including `table_number`, `caption`, `headers`, `rows`, explicit column width proportions, and optional explanatory notes placed below.
- **`FigureBlock`**: Image reference, figure number, caption placed below, DPI dimensions, and alignment.
- **`EquationBlock`**: Centered LaTeX or math text run with right-aligned equation numbering `(1)`.
- **`BibliographyBlock`**: Formatted reference list entry adhering to specified Citation Style (APA, IEEE, Harvard, Chicago, Vancouver, MLA) with 0.5-inch hanging indent semantics.

---

### 4. Canonical IR Schema Example

```json
{
  "project_id": "0df62f71-2b0e-4ab8-933e-b8d2ef79a611",
  "project_title": "Empirical Multi-Agent Coordination in Edge Robotics",
  "author": "Dr. Marcus Thorne",
  "institution": "University of Oxford",
  "degree": "Doctor of Philosophy",
  "academic_year": "2026",
  "citation_style": "apa-7th",
  "template_version_id": "84812e1a-c5ad-4903-a199-a9a304e28701",
  "layout": {
    "paper_size": "A4",
    "primary_font": "Times New Roman",
    "base_font_size_pt": 12.0,
    "line_spacing": 2.0,
    "binding_gutter_inches": 0.5,
    "margins_inches": {
      "top": 1.0,
      "bottom": 1.0,
      "left": 1.5,
      "right": 1.0,
      "gutter": 0.5
    },
    "prelim_page_num_format": "ROMAN_LOWER",
    "main_page_num_format": "ARABIC"
  },
  "blocks": [
    {
      "type": "TITLE_PAGE",
      "suppress_page_number": true,
      "title": "Empirical Multi-Agent Coordination in Edge Robotics",
      "degree": "Doctor of Philosophy",
      "author": "Dr. Marcus Thorne",
      "institution": "University of Oxford",
      "year": "2026"
    },
    { "type": "SECTION_BREAK", "new_pagination_format": "ROMAN_LOWER", "start_at": 2 },
    {
      "type": "FRONT_MATTER",
      "page_key": "ABSTRACT",
      "title": "Abstract",
      "paragraphs": ["This study investigates multi-agent edge consensus..."]
    },
    { "type": "SECTION_BREAK", "new_pagination_format": "ARABIC", "start_at": 1 },
    {
      "type": "HEADING_1",
      "title": "CHAPTER 1: INTRODUCTION",
      "page_break_before": true
    },
    {
      "type": "PARAGRAPH",
      "text": "Academic document preparation requires meticulous fidelity...",
      "indent_first_line_inches": 0.5
    }
  ],
  "metrics": {
    "total_headings": 18,
    "total_tables": 4,
    "total_figures": 2,
    "total_equations": 6,
    "total_references": 32,
    "total_words": 14250,
    "estimated_pages": 48
  }
}
```

---

### 5. Verification & Pipeline Lifecycle

1. `DocumentIRBuilder.build(project, document_version, template)` extracts database entities.
2. Content sanitization neutralizes malicious markup or script injections.
3. Metrics calculator compiles exact counts for downstream QA parity verification (`ExportQAService`).
4. Canonical IR JSON is cached with an SHA-256 fingerprint alongside the `DocumentExport` job record.

