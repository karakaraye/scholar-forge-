# ScholarForge AI — Technical Specification
## Microsoft Word (.docx) Academic Generation Engine

**Document ID:** SPEC-DOC-WORD-008  
**Module:** `backend/research/docx_export_service.py`  
**Classification:** Core Document Generation & Typesetting  
**Status:** Approved & Implemented (Stage 8)  

---

### 1. Architectural Purpose & Overview

The Microsoft Word Generation Engine transforms the canonical `DocumentIR` into publication-grade, fully styled `.docx` OpenXML manuscripts conforming strictly to institutional and journal publication rules.

The resulting files must be directly editable by academic supervisors and publishers without broken styles, distorted page margins, or missing Table of Contents XML codes.

---

### 2. Typographic Hierarchy & Semantic Styles

The service builds and assigns strict OpenXML semantic styles, avoiding direct ad-hoc inline paragraph overrides:

1. **Title**: 20pt Bold, Small Caps, Centered, 24pt space after.
2. **Heading 1 (Chapters)**: 14pt–16pt Bold, All Caps or Title Case, Page Break Before, `keep_with_next=True`, 18pt before, 12pt after.
3. **Heading 2**: 13pt–14pt Bold, 12pt before, 6pt after, `keep_with_next=True`.
4. **Heading 3**: 12pt Bold Italic, 6pt before, 4pt after, `keep_with_next=True`.
5. **Heading 4**: 12pt Italic, Indented 0.5 in, Run-in heading formatting.
6. **Normal (Body Text)**: Times New Roman / Arial / Garamond / Calibri as mandated by the template; 12pt; Double line spacing (2.0x); First-line indent 0.5 inches (1.27 cm); 0pt before / 0pt after.
7. **Blockquote**: 11pt, 1.0x single-spaced, 0.5 in left and right margin indent, 6pt before / 6pt after.
8. **Academic Table Caption**: 10pt–11pt Bold, placed strictly above the table (APA/IEEE requirement).
9. **Academic Table Note**: 9pt–10pt Italic, placed strictly below the table.
10. **Figure Caption**: 10pt–11pt, placed strictly below the image.
11. **Bibliography**: 12pt, 0.5 in hanging indent, double or 1.5x spaced.

---

### 3. Dual Section Breaks & Academic Pagination

Academic theses and journal articles mandate distinct front matter and main body pagination:

```
[ Section 1: Front Matter ]
- Title Page: Page number SUPPRESSED.
- Prelims (Declaration, Abstract, TOC): Lowercase Roman numerals (i, ii, iii...).
- Header/Footer unlinked from Section 2.

[ Section Break: Next Page ]

[ Section 2: Main Body ]
- Chapter 1 through Appendices: Arabic numerals (1, 2, 3...).
- Page numbering restarts explicitly at 1.
- Running header: Short project title (top right) or author name.
```

The engine implements this via OpenXML section properties:
```python
# Unlink header/footer from previous section
section_body.header.is_linked_to_previous = False
section_body.footer.is_linked_to_previous = False

# Configure Arabic numbering restarting at 1
sectPr = section_body._sectPr
pgNumType = OxmlElement('w:pgNumType')
pgNumType.set(qn('w:start'), '1')
pgNumType.set(qn('w:fmt'), 'decimal')
sectPr.append(pgNumType)
```

---

### 4. Dynamic Table of Contents Field Codes

Rather than pasting static, un-updatable plaintext chapter titles, the engine injects native Word refreshable field codes:

```xml
<w:fldSimple w:instr="TOC \o &quot;1-3&quot; \h \z \u"/>
```

When opened in Microsoft Word, LibreOffice, or Google Docs, users can right-click and choose **Update Field** to recalculate physical page numbers instantly upon further manuscript editing.

---

### 5. Academic Tables & APA/IEEE Border Architecture

Default Word grid tables contain heavy vertical and horizontal lines that violate academic standards (e.g., APA 7th Edition Section 7.8).

The engine implements custom XML table borders:
- **Top border**: 1.5pt solid horizontal line.
- **Header bottom border**: 1.0pt solid horizontal line.
- **Table bottom border**: 1.5pt solid horizontal line.
- **Vertical borders**: Explicitly cleared (`w:val="none"`).
- **Internal horizontal borders**: Explicitly cleared.
- **Header Row Repeat**: `w:tblHeader` tag set to repeat headers across multi-page table splits.
- **Row splitting prevention**: `w:cantSplit` set on table rows to prevent orphaned single-line row breaks.

---

### 6. Binding Gutter & Physical Margin Enforcement

Dissertation binding requires an asymmetrical left margin to accommodate spiral or hard-cover binding:
- Left margin: `1.5 inches` (`1.0 inch` margin + `0.5 inch` binding gutter).
- Right, Top, Bottom margins: `1.0 inch`.
- Paper size: Configurable `A4` (`210mm x 297mm`) or `US Letter` (`8.5in x 11.0in`).

---

### 7. Output Verification & Memory Safety

The DOCX generation runs in memory using `BytesIO`, writing to private persistent storage only after successful completion and hash generation, ensuring corrupt or zero-byte files are never committed to disk.

