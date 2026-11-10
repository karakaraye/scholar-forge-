# Journal Publication Standards & Article Structures Specification
**ScholarForge AI — Stage 7 Technical Specification**

---

## 1. Scope & Objective

ScholarForge AI enables academic researchers to target indexed international peer-reviewed journals across four primary scholarly article architectures. The system bridges the gap between academic thesis drafts and camera-ready journal submissions by enforcing publisher-specific constraints (word limits, structured abstracts, author declarations, and submission readiness audits).

---

## 2. Four Article Architectures

ScholarForge AI supports four standardized journal article structures:

### 1. Original Research (IMRaD Standard)
- **Applicable disciplines**: Natural Sciences, Medicine, Engineering, Quantitative Social Sciences.
- **Section Sequence**:
  1. Title & Abstract (Structured or Unstructured, 150–250 words)
  2. Introduction (Background, Problem, Novelty, Research Questions)
  3. Materials & Methods (Design, Setting, Sample, Data Collection, Statistical Analysis)
  4. Results (Empirical findings, statistical tables, figures)
  5. Discussion (Interpretation, contextual comparison, limitations)
  6. Conclusion & Practical/Theoretical Implications
  7. References / Bibliography

### 2. Narrative Review Article
- **Applicable disciplines**: Humanities, Medical Reviews, Law, Conceptual Management.
- **Section Sequence**:
  1. Title & Abstract (State of the art summary)
  2. Introduction (Historical context and scope of literature)
  3. Thematic Review Subsections (Thematic analysis of prior studies)
  4. Critical Discussion & Knowledge Gaps
  5. Future Research Directions
  6. References / Bibliography

### 3. Systematic Literature Review (PRISMA 2020 Standard)
- **Applicable disciplines**: Evidence-Based Medicine, Public Health, Software Engineering, Systematic Social Science.
- **Section Sequence**:
  1. Title & Structured Abstract (Background, Methods, Results, Discussion)
  2. Introduction (Rationale, objectives based on PICOS/SPIDER framework)
  3. PRISMA Methodology:
     - Eligibility criteria (Inclusion/exclusion parameters)
     - Information sources & search strategies (Query strings, dates)
     - Selection process & screening flow
     - Data collection & extraction protocol
     - Study risk of bias evaluation
  4. Results:
     - Study selection (PRISMA flow counts)
     - Study characteristics & synthesis of findings
     - Risk of bias across studies
  5. Discussion (Limitations, strengths, evidence certainty)
  6. Conclusions & Implications
  7. References / Bibliography

### 4. Conceptual & Theoretical Paper
- **Applicable disciplines**: Theoretical Physics, Pure Mathematics, Sociology, Economics, Philosophy.
- **Section Sequence**:
  1. Title & Abstract (Conceptual thesis statement)
  2. Introduction (Theoretical problem & paradigm)
  3. Conceptual Framework / Theoretical Foundations
  4. Theoretical Propositions (Hypotheses, formal proofs, or conceptual models)
  5. Conceptual Elaboration & Disciplinary Impact
  6. Discussion & Boundary Conditions
  7. References / Bibliography

---

## 3. Seed Journal Profiles

ScholarForge AI includes verified journal submission profiles:

| Journal Profile | Publisher | Scope | Max Words | Abstract Limit | Reference Limit | Review Type |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nature** | Springer Nature | Multidisciplinary Science | 4,500 | 200 words | 50 refs | Single-blind |
| **The Lancet** | Elsevier | Medicine & Clinical Epidemiology | 4,500 | 300 words | 30 refs | Double-blind |
| **IEEE Transactions on Computers** | IEEE | Computer Science & Engineering | 7,000 | 250 words | Unlimited | Single-blind |
| **PLOS ONE** | PLOS | Open Science / Multidisciplinary | Flexible | 300 words | Unlimited | Single-blind |

---

## 4. Submission Readiness Audit

The submission readiness service evaluates manuscript compliance against journal rules, outputting a 0–100 Readiness Score and actionable checklist:

1. **Word Count Compliance**: Manuscript and abstract length vs. publisher ceiling.
2. **Mandatory Declarations**:
   - Ethics approval statement (mandatory for empirical human/animal studies)
   - Conflict of Interest declaration
   - Data Availability statement (with repository DOI/URL link)
   - Funding / Grant acknowledgements
3. **Author Metadata**:
   - Corresponding author contact (email, phone, institution)
   - Author ORCIDs (validated via ISO 27729 regex: `^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$`)

