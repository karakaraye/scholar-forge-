# Formatting Rule Engine & Safe Auto-Formatting Specification
**ScholarForge AI — Stage 7 Technical Specification**

---

## 1. Architectural Overview

The ScholarForge AI Formatting Rule Engine stores, validates, and transforms document presentation attributes across 8 distinct rule categories. 

### Zero-Overwrites Safety Invariant
Under no circumstances may automated formatting mutate a researcher's prose or section structure destructively:
1. Every auto-format action creates an immutable `DocumentVersion` snapshot prior to modification.
2. The user is provided a detailed visual diff preview modal before any changes are written.
3. Every change is logged in a `FormattingChange` audit record.
4. One-click rollback restores document text to the exact pre-autoformat baseline version.

---

## 2. Rule Schema Definition

The `rules_config` JSON structure stores deterministic parameters:

```json
{
  "page_settings": {
    "paper_size": "A4",
    "orientation": "PORTRAIT",
    "margins_inches": {
      "top": 1.0,
      "bottom": 1.0,
      "left": 1.5,
      "right": 1.0,
      "gutter": 0.5
    }
  },
  "typography": {
    "primary_font": "Times New Roman",
    "fallback_fonts": ["Times", "serif"],
    "base_font_size_pt": 12,
    "line_spacing": 2.0,
    "paragraph_spacing_pt": 0,
    "first_line_indent_inches": 0.5,
    "blockquote_indent_inches": 0.5,
    "heading_1": {
      "font_size_pt": 14,
      "bold": true,
      "italic": false,
      "case": "UPPERCASE",
      "alignment": "CENTER",
      "space_before_pt": 12,
      "space_after_pt": 6
    },
    "heading_2": {
      "font_size_pt": 12,
      "bold": true,
      "italic": false,
      "case": "TITLE_CASE",
      "alignment": "LEFT",
      "space_before_pt": 12,
      "space_after_pt": 6
    },
    "heading_3": {
      "font_size_pt": 12,
      "bold": false,
      "italic": true,
      "case": "TITLE_CASE",
      "alignment": "LEFT",
      "space_before_pt": 6,
      "space_after_pt": 6
    }
  },
  "chapter_structure": {
    "chapter_numbering_style": "ARABIC",
    "section_numbering_depth": 3,
    "heading_case": "UPPERCASE",
    "page_break_before_chapter": true
  },
  "pagination": {
    "preliminary_format": "ROMAN_LOWER",
    "main_format": "ARABIC",
    "prelim_position": "BOTTOM_CENTER",
    "main_position": "TOP_RIGHT",
    "show_on_first_page": false
  },
  "preliminary_pages": {
    "required_pages": [
      "title_page",
      "certification",
      "declaration",
      "dedication",
      "acknowledgements",
      "abstract",
      "table_of_contents",
      "list_of_tables",
      "list_of_figures"
    ],
    "order": [
      "title_page",
      "certification",
      "declaration",
      "dedication",
      "acknowledgements",
      "abstract",
      "table_of_contents",
      "list_of_tables",
      "list_of_figures"
    ]
  },
  "tables_figures": {
    "table_caption_placement": "ABOVE",
    "figure_caption_placement": "BELOW",
    "numbering_format": "CHAPTER_BASED",
    "notes_placement": "BELOW"
  },
  "citations": {
    "style": "apa-7th",
    "hanging_indent_inches": 0.5,
    "doi_required": true,
    "url_format": "SHORT"
  },
  "word_limits": {
    "abstract_min_words": 150,
    "abstract_max_words": 350,
    "manuscript_max_words": null
  }
}
```

---

## 3. Safe Transformations Implemented

The `SafeAutoformatService` performs the following safe, reversible transformations:
1. **Chapter & Section Heading Normalization**:
   - Standardizes heading prefixes (`Chapter 1:` vs `CHAPTER 1:`).
   - Adjusts casing according to the active template rules (`UPPERCASE` or `TITLE_CASE`).
2. **Table Caption Placement**:
   - Ensures academic table numbers and titles precede table elements (`Table 1: Descriptive Statistics`).
3. **Figure Caption Placement**:
   - Ensures figure captions are positioned below illustrations/charts.
4. **Citation Hanging Indents**:
   - Applies 0.5 in hanging indentation to bibliography entries.
5. **Zero Data Mutation**:
   - Prose sentences, empirical data tables, and statistical results are never altered.

