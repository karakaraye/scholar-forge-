# Literature Review Intelligence Specification

The Literature Review Intelligence Engine enables researchers to conduct evidence-grounded literature analysis across 10 specialized scholarly tasks without AI hallucination.

---

## 1. Supported Literature Tasks

| Task Identifier | Task Name | Description & Academic Objective |
| :--- | :--- | :--- |
| `SUMMARIZE_PUBLICATION` | Publication Summary | Objective, methodology, and core contribution summary. |
| `EXTRACT_OBJECTIVES` | Extract Objectives | Identifies stated research questions and explicit study aims. |
| `IDENTIFY_METHODOLOGY` | Identify Methodology | Analyzes research design, sampling, instruments, and data analysis methods. |
| `SUMMARIZE_FINDINGS` | Evidence-Based Findings | Extracts documented empirical results and statistical observations. |
| `IDENTIFY_LIMITATIONS` | Author Limitations | Extracts limitations acknowledged by authors and methodological boundaries. |
| `COMPARE_STUDIES` | Comparative Synthesis | Synthesizes agreements, contradictions, and nuances across multiple selected studies. |
| `ORGANIZE_LITERATURE` | Thematic Categorization | Groups attached literature into themes, schools of thought, or conceptual clusters. |
| `SUGGEST_RESEARCH_GAPS` | Empirical Research Gaps | Identifies unaddressed questions, geographical biases, or methodological blindspots. |
| `CREATE_LITERATURE_SYNTHESIS` | Literature Synthesis | Produces coherent narrative synthesis suitable for manuscript literature review chapters. |
| `EVIDENCE_ALIGNMENT` | Evidence Alignment | Cross-checks empirical findings against study hypotheses and objectives. |

---

## 2. Evidence Basis Classification & Hallucination Prevention

Every intelligence response carries an explicit `evidence_basis` header:

```json
{
  "task_type": "CREATE_LITERATURE_SYNTHESIS",
  "evidence_basis": "FULL_TEXT",
  "sources_analyzed": ["src-1", "src-2"],
  "academic_integrity_verified": true,
  "content": "Empirical synthesis demonstrates strong foundational transformer dynamics..."
}
```

### Hierarchy of Evidence:
1. `FULL_TEXT`: Derived from uploaded/parsed manuscript PDF or Word document text.
2. `ABSTRACT`: Grounded in authoritative abstract text retrieved from Crossref/OpenAlex.
3. `METADATA_ONLY`: Grounded solely in author, title, year, journal venue, and keywords.
4. `INSUFFICIENT`: Raised when source information is inadequate to answer the analytical task.

> [!CAUTION]
> **Strict Anti-Hallucination Guard**: If a publication possesses only a title and DOI (no abstract, no extracted full text), the engine explicitly refuses to fabricate experimental findings or methodology:
> *"Cannot extract empirical findings: source record contains metadata only without abstract or full text. Please upload document PDF or provide abstract to perform evidence-based analysis."*

---

## 3. Literature Review Matrix Frameworks

The system supports four structured literature matrix schemas:

### A. Empirical Synthesis Matrix
- Columns: `Authors & Year`, `Publication Title`, `Research Objectives`, `Methodology`, `Key Findings`, `Identified Gaps`
- Exportable directly into Tiptap editor as responsive HTML table.

### B. Theoretical Framework
- Identifies underlying theoretical foundations, core assumptions, conceptual models, and hypotheses.

### C. Conceptual Review
- Clarifies key construct definitions, operational metrics, and contextual relationships.

### D. PRISMA Systematic Review Flow
- Documents systematic search identification, deduplication count, screening criteria, eligibility assessments, and final inclusions.

