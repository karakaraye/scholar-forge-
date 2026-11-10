# Manuscript Assembly Engine Specification
**ScholarForge AI — Academic Document Compilation Architecture**

## 1. Overview & Purpose
The Manuscript Assembly Engine compiles modular research sections into a continuous, publication-ready academic document. It handles front matter, dynamic numbering, jump-anchor Table of Contents, List of Tables, List of Figures, styled bibliographies, and back matter appendices.

---

## 2. Compilation Hierarchy & Document Order

```text
├── PRELIMINARY PAGES (Front Matter)
│   ├── Title Page (Title, Author, Degree, Institution, Date, Supervisors)
│   ├── Abstract & Key Terms
│   ├── Dedication & Acknowledgements (Optional)
│   ├── Table of Contents (Hyperlinked Jump Anchors)
│   ├── List of Tables (LOT)
│   └── List of Figures (LOF)
├── BODY CHAPTERS & SECTIONS
│   ├── Chapter 1: Introduction (1.1, 1.2, 1.3 Subsections)
│   ├── Chapter 2: Literature Review & Theoretical Framework
│   ├── Chapter 3: Research Methodology & Instrument Design
│   ├── Chapter 4: Data Presentation, Analysis & Findings
│   └── Chapter 5: Discussion, Implications & Conclusions
└── BACK MATTER
    ├── References / Bibliography (APA 7th, IEEE, Harvard, Chicago)
    └── Appendices (Instruments, Supplementary Output, Ethics Approval)
```

---

## 3. Dynamic Section & Subsection Numbering

Sections are ordered hierarchically based on `DocumentSection.parent_section` and `order_index`:
- Top-level sections without a parent are numbered as Chapters: `Chapter 1: Introduction`, `Chapter 2: Literature Review`.
- Subsections linked to a parent chapter are numbered with decimal notation: `1.1 Problem Statement`, `1.2 Research Objectives`.
- Nested sub-subsections: `1.2.1 Primary Objective`, `1.2.2 Secondary Objectives`.

---

## 4. Citation & Reference Formatting

References are populated strictly from verified `ProjectSource` entities cited within the text:
- **APA 7th**: Alphabetical by author last name, hanging indent, year in parentheses, italicized journal/book titles, active DOI hyperlinks (`https://doi.org/...`).
- **IEEE**: Numeric in citation order `[1]`, bracketed inline, formatted with author initials, abbreviated journal titles, and volume/issue.
- **Harvard**: Author-date system with full author lists and title casing.
- **Chicago**: Notes and bibliography style with publisher details and location.

---

## 5. Provenance & Stale Section Detection

Every compiled assembly stores a `structure_manifest` mapping:
1. Every table back to its underlying `ResearchDataset` ID and `StatisticalResult` ID.
2. Every figure back to its `ResearchVisualization` ID.
3. Every cited source back to its verified OpenAlex/Crossref record.
If a dataset or statistical model is updated after manuscript compilation, `ProvenanceService` marks the corresponding section as stale.

