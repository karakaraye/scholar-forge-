# Author & Publication Metadata Specification
**ScholarForge AI — Stage 7 Technical Specification**

---

## 1. Overview & Objectives

Academic publication requires standardized metadata to ensure unambiguous author attribution, institutional credit, ethical integrity, and data provenance.

ScholarForge AI provides an author and publication metadata management system with:
1. **Strict ORCID Validation**: Regex validation based on ISO 27729 standards.
2. **Institutional Affiliation Structures**: Author order, corresponding author designation, and multi-institutional mapping.
3. **Mandatory Ethical & Reproducibility Declarations**:
   - Ethics Board / IRB Approval Statement (mandatory for empirical human/animal studies).
   - Data Availability Statement (linking to open research repositories like Zenodo, Figshare, or OSF).
   - Conflict of Interest (COI) declaration.
   - Funding and grant contract identifiers.

---

## 2. ORCID Validation Standard

ORCID identifiers must adhere to the 16-character hyphenated format:
```regex
^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$
```
- Example valid ORCID: `0000-0002-1825-0097` or `0000-0001-5109-370X` (check digit `X`).
- Invalid strings (e.g. without hyphens, missing digits, or malformed prefixes) are strictly rejected before submission readiness calculation.

---

## 3. Data Availability & Reproducibility Standards

Modern peer-reviewed journals mandate explicit data statements:
- **Available upon request**: Contact email and conditions specified.
- **Public repository**: Persistent DOI or URL required.
- **Restricted/Sensitive data**: Institutional ethics privacy reasons explicitly stated.

---

## 4. REST API Endpoints

- `GET /api/v1/research/projects/{id}/metadata/`: Fetch project publication metadata.
- `PUT /api/v1/research/projects/{id}/metadata/`: Update author affiliations, ORCIDs, and declarations.
- `GET /api/v1/research/projects/{id}/submission-readiness/?journal_id={jid}`: Audit readiness score and checklist.

