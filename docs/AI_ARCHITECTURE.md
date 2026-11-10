# ScholarForge AI — AI Writing Assistant Architecture & Integrity Specification

**Document Version:** 1.0.0 (Stage 2 Release)  
**System Module:** `backend/research/`  
**Core Files:**
- `backend/research/ai_service.py` (OpenAI Adapter, Prompt Templates, Mock Engine)
- `backend/research/context_engine.py` (Project Context Aggregation & Prompt Injection)
- `backend/research/consistency_engine.py` (Methodological Alignment Scanner)
- `backend/research/views.py` (REST Endpoints for Generation & Audit Logging)

---

## 1. Core Principles & Strict Academic Integrity

ScholarForge AI is engineered specifically for scholarly research. Unlike commercial consumer LLM wrappers, ScholarForge enforces strict academic integrity constraints:

### 1.1 The Golden Rule: No Unilateral Content Overwrites
**AI suggestions NEVER automatically overwrite or modify the researcher's manuscript content.**
1. Every AI task generates an isolated suggestion payload.
2. The suggestion is displayed in a dedicated **AI Assistant Review Card** in the right workspace sidebar.
3. The researcher reviews the suggestion with four explicit choices:
   - **Accept & Insert:** Appends or replaces the selected text into the active Tiptap editor node.
   - **Edit Before Apply:** Opens an inline editable textarea where the researcher modifies the AI suggestion before accepting it.
   - **Regenerate:** Submits a re-generation request with optional refined instructions.
   - **Reject:** Discards the suggestion completely.

### 1.2 Anti-Hallucination Directives
Consumer AI models are notorious for fabricating fake journal articles, imaginary authors, non-existent publication years, and invented DOIs.
In ScholarForge AI:
- **Zero Fabricated Citations:** The system prompt explicitly forbids the model from generating invented author names, publication titles, or bibliographic entries.
- **Zero Fabricated DOIs or Links:** No fake `https://doi.org/...` or external URLs are allowed.
- **Zero Fabricated Empirical Findings:** The model is prohibited from inventing fake survey respondent counts, laboratory results, or fictitious statistical values.
- **Bracketed Guidance:** Whenever external citations or empirical data points are necessary, the model outputs bracketed researcher directives:  
  `[Citation needed: Author, Year - seminal paper on dynamic capabilities]` or `[Insert statistical findings: F-statistic, p-value]`.

### 1.3 Transparent Audit Logging
Every AI interaction generates an immutable `AIJob` record in PostgreSQL tracking:
- Request timestamp and initiating user
- Associated research project and active section
- Action type (`GENERATE_SECTION`, `IMPROVE_WRITING`, etc.)
- Input parameters, custom instructions, and selected text excerpt
- Context metadata snapshot
- Model version used and response tokens
- User acceptance/rejection status and feedback rating

---

## 2. Research Context Engine

Generic AI prompts produce generic, irrelevant text. ScholarForge solves this through deep context grounding via `backend/research/context_engine.py`.

Before any AI prompt is dispatched, the system extracts the full institutional and methodological profile of the active project:
- **Manuscript Title & Subtitle**
- **Document Category** (`ACADEMIC_PROJECT`, `RESEARCH_PAPER`, `JOURNAL_ARTICLE`)
- **Document Subtype** (e.g., `PhD Dissertation`, `Systematic Review`)
- **Academic Discipline** (e.g., `Computer Science`, `Management`, `Medicine`)
- **Academic Level** (`UNDERGRADUATE`, `MASTERS`, `PHD`, `FACULTY`, `RESEARCHER`)
- **Target Citation Style** (`APA 7th`, `IEEE`, `MLA 9th`, `Chicago`, `Harvard`, `Vancouver`)
- **Research Methodology** (e.g., `Empirical Quantitative Regression with Survey Data`)
- **Objectives of the Study**
- **Research Questions & Hypotheses**
- **Supervisor Guidance & Institutional Constraints**
- **Active Section Title & Description**
- **Surrounding Manuscript Outline**

This context is injected directly into the structured system and user prompts, ensuring that AI responses are strictly aligned with the researcher's methodology, discipline terminology, and stated research questions.

---

## 3. Supported AI Writing Capabilities

The platform implements 10 distinct academic AI capabilities:

| Action Code | Description | Input Scope | Output Format |
|---|---|---|---|
| `GENERATE_SECTION` | Drafts rigorous section paragraphs adhering to section aims | Active section context | Multi-paragraph scholarly prose with bracketed citations |
| `IMPROVE_WRITING` | Elevates academic tone, precision, and formality | Selected text | Refined academic prose |
| `EXPAND_WRITING` | Deepens argumentation and theoretical justification | Selected text | Extended prose with logical development |
| `SUMMARIZE_CONTENT` | Synthesizes complex passages into executive takeaways | Selected text | Concise academic summary |
| `REWRITE_CONTENT` | Rephrases in 1 of 5 styles: formal, concise, detailed, clearer, or better flow | Selected text + Style | Stylistically tailored prose |
| `SUGGEST_OBJECTIVES` | Formulates measurable general and specific objectives | Project context | Numbered objective statements |
| `SUGGEST_QUESTIONS` | Generates research questions mapped to objectives | Project context + Objectives | Methodologically sound inquiry questions |
| `SUGGEST_HYPOTHESES` | Formulates directional $H_0$ and $H_1$ hypotheses | Questions + Methodology | Testable null and alternate hypotheses |
| `SUGGEST_FRAMEWORK` | Proposes conceptual models with IVs, DVs, and moderators | Title + Methodology | Conceptual framework specification |
| `SUGGEST_OUTLINE` | Recommends discipline-specific outline additions | Outline + Discipline | Structural optimization recommendations |

---

## 4. Academic Consistency Checker Engine

Located at `backend/research/consistency_engine.py`, this diagnostic engine performs automated consistency audits across manuscript design elements:

1. **Objectives vs. Research Questions:** Checks if the number and thematic keywords of specific research questions mirror the stated objectives.
2. **Objectives vs. Hypotheses:** Flags missing null/alternate hypotheses for empirical quantitative studies.
3. **Title vs. Manuscript Focus:** Computes semantic word overlap to detect scope drift.
4. **Methodology vs. Study Aims:** Evaluates whether stated empirical methods (e.g., quantitative survey vs qualitative thematic analysis) match the inquiry wording.
5. **Structural Integrity:** Audits section hierarchies, flags duplicate chapter headings, and detects missing mandatory sections.
6. **Word Count Distribution:** Highlights imbalanced chapters (e.g., an 8,000-word introduction paired with a 200-word methodology).

The engine computes a **Consistency Index (0-100%)** and returns granular diagnostics categorized by severity (`HIGH`, `MEDIUM`, `LOW`, `INFO`) with actionable remediation guidance.

---

## 5. Offline Mock Mode & Test Determinism

To protect researchers from unexpected billing and enable offline testing in CI/CD environments:
- **Graceful API Key Handling:** If `OPENAI_API_KEY` is absent or set to default placeholders, the backend returns a clear informational notice without crashing.
- **Deterministic Mock Engine (`AI_MOCK_MODE=True`):** When enabled, `generate_mock_academic_response()` generates contextually accurate, discipline-aware scholarly text for all 10 AI functions, strictly adhering to anti-fabrication rules. This guarantees complete automated test coverage without making paid external network requests.

---

## 6. Literature Review Intelligence & Grounded Evidence Analysis (Stage 3)

Located in `backend/research/literature_intelligence.py`, this engine extends the platform beyond general writing assistance to perform grounded literature analysis across 10 scholarly tasks:

1. `SUMMARIZE_PUBLICATION`: Structured study summary
2. `EXTRACT_OBJECTIVES`: Explicit research objectives and questions
3. `IDENTIFY_METHODOLOGY`: Research design, instrumentation, and analysis techniques
4. `SUMMARIZE_FINDINGS`: Documented empirical observations
5. `IDENTIFY_LIMITATIONS`: Explicitly acknowledged study limitations
6. `COMPARE_STUDIES`: Cross-study comparative synthesis
7. `ORGANIZE_LITERATURE`: Thematic categorization
8. `SUGGEST_RESEARCH_GAPS`: Empirical and methodological gaps
9. `CREATE_LITERATURE_SYNTHESIS`: Thematic narrative synthesis for manuscript literature chapters
10. `EVIDENCE_ALIGNMENT`: Hypotheses and objective alignment checks

### Evidence Basis Classification
Every response is tagged with an evidence basis:
- `FULL_TEXT`: Grounded in parsed PDF/DOCX extracted text streams.
- `ABSTRACT`: Grounded in authoritative abstract records from Crossref/OpenAlex.
- `METADATA_ONLY`: Grounded solely in bibliographic metadata.
- `INSUFFICIENT`: Raised when source information is inadequate.

### Strict Anti-Hallucination Guard
If a selected publication contains only a title or metadata without an abstract or full text, the engine explicitly refuses to hallucinate empirical findings or methodology:
`"Cannot extract empirical findings: source record contains metadata only without abstract or full text. Please upload document PDF or provide abstract to perform evidence-based analysis."`

---

## 7. Results Interpretation Intelligence & Empirical Grounding (Stage 4)

Located in `backend/research/interpretation_service.py`, this engine interprets empirical and qualitative research findings across 10 analytical tasks:

1. `GENERATE_RESULTS_SECTION`: Drafts Chapter 4 (Results / Presentation of Findings).
2. `GENERATE_DISCUSSION_SECTION`: Drafts Chapter 5 (Discussion of Findings connecting results to research objectives).
3. `INTERPRET_DESCRIPTIVE_RESULTS`: Analyzes central tendency, spread, skewness, and distributional shape.
4. `INTERPRET_CORRELATION_RESULTS`: Interprets bivariate correlations with an explicit warning that correlation does not imply causation.
5. `INTERPRET_REGRESSION_RESULTS`: Interprets multiple/logistic regression coefficients, model fit ($R^2$), and multicollinearity (VIF).
6. `INTERPRET_HYPOTHESIS_TESTS`: Synthesizes formal hypothesis testing decisions (`REJECT_NULL` vs `FAIL_TO_REJECT_NULL`) and effect sizes.
7. `SUMMARIZE_QUALITATIVE_THEMES`: Synthesizes qualitative codes and themes with verbatim grounded quotes.
8. `EXPLAIN_STATISTICAL_ASSUMPTIONS`: Explains normality, homoscedasticity, linearity, and multicollinearity diagnostics.
9. `COMPARE_FINDINGS_WITH_LITERATURE`: Grounded comparison against verified project literature sources (zero invented citations).
10. `SUGGEST_LIMITATIONS_FUTURE_RESEARCH`: Substantive methodological, sampling, and empirical limitations.

### Strict Empirical Refusal Protocol
When an interpretation task is invoked but the project database contains no uploaded datasets, no computed statistical results, or no qualitative transcripts, the AI engine **strictly refuses to generate output**:
```python
if task_type in ['GENERATE_RESULTS_SECTION', 'INTERPRET_REGRESSION_RESULTS'] and not statistical_results:
    return {
        'success': False,
        'refusal': True,
        'message': "ScholarForge AI Refusal Protocol: No statistical analysis results found for this project. The system strictly forbids hallucinating empirical findings. Please upload a dataset and execute statistical tests before generating this section."
    }
```
This guarantees that no fictitious sample sizes, test statistics, or p-values are ever presented to the researcher or embedded into the thesis.
---

## 8. AI Academic Review Assistant & Pre-Defense Engine (Stage 5)

Located in `backend/research/review_service.py`, this assistant conducts formative academic reviews across 10 evaluation tasks without fabricating findings:

1. `METHODOLOGY_RIGOR`: Evaluates whether the chosen research design, sampling frame, and analytical instruments logically address the stated problem and objectives.
2. `THEORETICAL_CONSISTENCY`: Assesses conceptual congruence between theoretical foundations and variable operationalization.
3. `EMPIRICAL_VALIDITY`: Audits the connection between collected data distributions and derived inferences.
4. `STATISTICAL_DECISION_LOGIC`: Reviews statistical hypothesis testing decisions, ensuring test choice matches data scale (parametric vs nonparametric) and effect sizes are properly contextualized.
5. `LITERATURE_SYNTHESIS`: Assesses synthesis depth, identifying instances of mere descriptive listing versus critical comparative evaluation.
6. `ARGUMENT_STRENGTH`: Critiques the logical flow of academic claims, evidence backing, and counter-argument handling.
7. `TONE_STYLE`: Evaluates scholarly tone, academic register, objective voice, and conciseness.
8. `ABSTRACT_ALIGNMENT`: Verifies that the structured abstract accurately mirrors the actual findings, methodology, and conclusions of the full manuscript.
9. `DEFENSE_READINESS`: Generates prospective viva / thesis defense questions with anticipated methodological critiques and recommended defenses.
10. `INSTITUTIONAL_COMPLIANCE`: Checks structural conformity against institutional dissertation requirements and standard disciplinary conventions.

### Anti-Hallucination Refusal Guard for Unwritten Content
If an AI review task is requested for a chapter or section that is currently unwritten or contains fewer than 100 words, the Review Assistant **actively refuses execution**:
```python
if len(section_text.split()) < 100:
    return {
        "status": "REFUSED",
        "review_task": task_type,
        "refusal_reason": (
            f"Section '{section.title}' contains only {len(section_text.split())} words. "
            "ScholarForge AI Review Assistant refuses to evaluate unwritten or placeholder text. "
            "Please draft substantive section content before requesting an academic review."
        )
    }
```
This protocol ensures that AI recommendations are strictly grounded in the researcher's actual prose rather than hypothetical projections.

---

## 9. Intelligent Feedback Processing, Conflict Detection & Revision Synthesis (Stage 6)

Located in `backend/research/supervisor_feedback_service.py` and `backend/research/correction_service.py`, Stage 6 introduces safe AI-assisted multi-modal feedback processing and revision lifecycle governance.

### Prompt Injection Shielding & Multi-Modal Ingestion
Supervisor reviews uploaded from unauthenticated external documents (DOCX, PDF, or text files) are strictly sanitized prior to downstream semantic processing:
- Identifies and strips adversarial prompt-injection patterns (`system prompt:`, `override rules:`, `ignore instructions`, `delete database`, `exfiltrate`).
- Replaces offending segments with `[FLAGGED_ADVERSARIAL_INSTRUCTION_REDACTED]`.
- Implements transparent parser extraction (OOXML comments and tracked revisions in DOCX; `pypdf` extraction with explicit disclaimers for handwritten or margin annotations in PDF).

### 15-Category Academic Correction Taxonomy
Feedback instructions are semantically classified across 15 disciplinary review dimensions:
1. `LITERATURE_REVIEW_GAP`: Missing recent literature, secondary gaps, inadequate comparative synthesis.
2. `METHODOLOGY_RIGOR`: Questionable sampling frames, lack of control variables, insufficient instrumentation.
3. `STATISTICAL_INTERPRETATION`: Missing confidence intervals, effect size omissions, misstated hypothesis decisions.
4. `CITATION_COMPLIANCE`: Improper citation formatting, missing source dates, unverified claims.
5. `THEORETICAL_FRAMEWORK`: Detachment between theory constructs and empirical measurements.
6. `STRUCTURE_FLOW`: Illogical paragraph transitions, sub-heading organization, section sequencing.
7. `ACADEMIC_TONE`: Colloquialisms, subjective statements, non-scholarly register.
8. `RESEARCH_OBJECTIVES`: Unaddressed research questions or misaligned specific aims.
9. `DATA_PRESENTATION`: Improper table formatting, non-APA headings, mislabeled figures.
10. `DISCUSSION_LIMITATIONS`: Overstated causality, lack of contextual boundaries.
11. `PLAGIARISM_ETHICS`: Insufficient paraphrasing, missing institutional IRB acknowledgments.
12. `HYPOTHESIS_ALIGNMENT`: Statistical tests detached from stated directional hypotheses.
13. `INSTRUMENT_VALIDITY`: Lack of construct reliability metrics (Cronbach's alpha, convergent validity).
14. `CONTRADICTORY_FINDINGS`: Internal logical contradictions between chapter sections.
15. `FORMATTING_STYLE`: Typographical, margin, heading, and bibliography stylistic deviations.

### Contradictory Instruction Detection
The engine evaluates multi-reviewer feedback collections to detect conflicting directives (e.g. one supervisor requesting that Chapter 2 be shortened for brevity while a committee member requests an expanded literature taxonomy). Such contradictions are explicitly surfaced in an actionable conflict alert rather than automatically executed.

### Missing Evidence Guard (Zero Data Hallucination)
When supervisor remarks demand additional empirical proof, larger samples, or authoritative citations, the AI assistant **refuses to invent empirical data or fictitious references**:
- Generates structured revision placeholders: `/* REVISION NOTE */ Action required: Researcher must identify verified peer-reviewed publications [Citation needed: Author, Year]. Do not invent sources.`
- Prevents automated manuscript overwrites by requiring explicit human review and acceptance before any correction is committed to the database.

---

## 10. Guideline Ingestion, Deterministic Compliance Intelligence & Safe Formatting (Stage 7)

Located in `backend/research/guideline_ingestion_service.py`, `backend/research/compliance_engine.py`, and `backend/research/safe_autoformat_service.py`, Stage 7 combines adversarial input defense, rule extraction, and deterministic auditing.

### Adversarial Guideline Sanitization
Ingested author guidelines (DOCX/PDF) from external institutional websites or user uploads undergo adversarial input neutralization:
- Identifies and neutralizes prompt-injection exploits (`system:`, `override safety`, `format bypass`, `ignore ethics`).
- Normalizes token streams and strips adversarial payloads.
- Rule candidates are extracted with confidence scores (0.00–1.00) and exact source excerpts for human verification.
- Enforces human approval: candidate rules remain in `PENDING_REVIEW` until explicitly approved by the researcher.

### Deterministic Rule Engine (Zero Hallucination Compliance)
Compliance auditing operates on exact programmatic criteria rather than opaque LLM guesses:
- **Heading Decimal Hierarchies**: Evaluates heading syntax against regex patterns (`^\d+(\.\d+)*\s+`).
- **Word Count Ceilings**: Deterministically tokenizes text to verify abstract bounds (150–350 words) and manuscript word counts.
- **Table & Figure Position Invariants**: Introspects DOM elements to verify captions precede tables and follow figures.
- **Author Identity Standards**: Validates ORCIDs against ISO 27729 regex (`^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$`).
- **Empirical Study Ethics Gate**: Identifies empirical research projects and mandates formal Institutional Review Board (IRB) or ethics committee approval references.

### Safe Auto-Formatting & Snapshot Isolation
Automated formatting follows a strict rollback guarantee:
- **Pre-Format Snapshot**: Automatically creates an immutable `DocumentVersion` snapshot containing all section contents before any mutation occurs.
- **Diff Preview**: Generates visual side-by-side diffs for author approval prior to commit.
- **One-Click Reversibility**: Reverts the entire document state to the pre-autoformat baseline version if desired.
- **Transparency on Layout**: Physical layout boundaries (page numbers and breaks) are explicitly designated `NOT_VERIFIED` in web preview, with exact layout compiled during physical PDF/DOCX export.

---

## 9. Stage 8: Document Compilation, Layout Verification & Export Intelligence

Located in `backend/research/document_ir.py`, `backend/research/docx_export_service.py`, `backend/research/pdf_export_service.py`, `backend/research/export_qa_service.py`, and `backend/research/export_job_service.py`.

### 9.1 Intermediate Representation (IR) Pipeline
To eliminate formatting regressions and semantic drift across output formats:
- Projects are flattened into an immutable, engine-independent Intermediate Representation (`DocumentIR`).
- Eliminates AI hallucination during export by enforcing a strict pull model from persistent snapshot versions (`DocumentVersion`).
- Normalizes typography, table structures, figure metadata, equation blocks, and citation sequences into canonical JSON before feeding concrete exporters.

### 9.2 Deterministic Typesetting & OpenXML Architecture
- **Microsoft Word Engine**: Generates clean OpenXML files using `python-docx` with semantic styles (`Heading 1` through `Heading 4`, `Title`, `Normal`, `Quote`). Injects dynamic TOC field codes (`TOC \o "1-3" \h \z \u`) and implements APA 7th Edition three-line table borders with header repetition.
- **Vector PDF Engine**: Implements ReportLab Platypus canvas with a two-pass `NumberedCanvas` that calculates physical page positions, draws running headers/footers, and suppresses title page numbering while generating interactive PDF outline bookmarks.
- **Dual Pagination Invariant**: Strictly enforces lowercase Roman numerals (`i`, `ii`, `iii`...) for front matter and restarts numbering at `1` with Arabic numerals (`1`, `2`, `3`...) for Chapter 1.

### 9.3 Automated Export Quality Assurance & Parity Cross-Check
- Cross-checks compiled binary outputs against the baseline canonical IR.
- Verifies exact parity counts for Headings, Tables, Figures, References, and body words.
- Identifies layout defects (table width overflows, uncaptioned figures, unintentional blank pages).
- Assigns objective overall quality ratings (`EXCELLENT`, `ACCEPTABLE`, `NEEDS_ATTENTION`, `FAILED`).
- Computes SHA-256 cryptographic fingerprints for end-to-end provenance verification.

### 9.4 Asynchronous Task Resilience & Private Storage Isolation
- Uses client-generated idempotency keys to eliminate race conditions and duplicate compilation tasks.
- Enforces private storage isolation in `/private/exports/`, strictly separated from public web static roots.
- All downloads require object-level ownership or project membership verification.

