# ScholarForge AI: Multi-Modal Supervisor Feedback Processing Specification

## 1. Input Modalities

The `SupervisorFeedbackService` (`backend/research/supervisor_feedback_service.py`) processes critique across four distinct channels:

1. **Manual Entry (`MANUAL_ENTRY`):** Raw pasted notes, meeting transcripts, or defense evaluation minutes.
2. **Word Document Ingestion (`DOCX_UPLOAD`):** OOXML parsing using `python-docx` to extract inline Word comments and tracked revisions.
3. **PDF Manuscript Markup (`PDF_UPLOAD`):** Text extraction via `pypdf`. When graphical margin annotations cannot be extracted as pure text, the system flags `has_unextracted_annotations = True` and displays an explicit verification disclaimer in the UI.
4. **Inline Thread Aggregation (`INLINE_THREAD_IMPORT`):** Automatically aggregates unresolved `ManuscriptComment` records into a unified feedback session.

---

## 2. Adversarial Security: Prompt-Injection Defense

Supervisory documents are external, untrusted user-supplied content. To safeguard downstream AI classification and reasoning engines, `SupervisorFeedbackService.sanitize_feedback_text` strips:

- System prompt override attempts: `Ignore previous instructions`, `Disregard system prompts`, `System: override`.
- Role-impersonation delimiters: `[SYSTEM]`, `[ASSISTANT]`, `<|im_start|>`, `<|im_end|>`.
- Exfiltration requests: `reveal prompt`, `dump database`, `print internal schema`.

---

## 3. Disciplinary Feedback Classification (15 Categories)

The classification engine parses supervisory instructions into 15 domain categories:

1. `THEORETICAL_FRAMEWORK`: Theory groundings, ontological assumptions, paradigm definitions.
2. `CONCEPTUAL_FRAMEWORK`: Conceptual models, variable mappings, visual schema.
3. `LITERATURE_REVIEW`: Citation currency, theoretical grounding, state-of-the-art literature synthesis.
4. `EMPIRICAL_LITERATURE`: Direct critique of empirical evidence and experimental literature.
5. `RESEARCH_GAP`: Specification and rationalization of research gaps.
6. `RESEARCH_METHODOLOGY`: Methodological appropriateness, qualitative/quantitative alignment.
7. `SAMPLING_TECHNIQUE`: Sample size adequacy, power calculations, stratification logic.
8. `RESEARCH_INSTRUMENTS`: Survey/interview design, validation, Cronbach alpha reliability.
9. `DATA_ANALYSIS`: Statistical models, thematic coding frameworks, estimator suitability.
10. `RESULTS_INTERPRETATION`: Empirical inference, hypothesis testing conclusions.
11. `DISCUSSION_ALIGNMENT`: Connecting results to literature, reconciling divergent findings.
12. `ACADEMIC_WRITING`: Tone, hedging, clarity, precision, vocabulary.
13. `REFERENCING_INTEGRITY`: Citation format, completeness, bibliographic alignment.
14. `ETHICAL_CONSIDERATIONS`: IRB approvals, participant consent, privacy guarantees.
15. `RESEARCH_STRUCTURE`: Manuscript flow, chapter organization, preliminary pages.

---

## 4. Conflict & Missing Evidence Detection

The engine cross-checks proposed supervisory directives against:
- **Manuscript Text:** Identifying contradictory directives (e.g., requesting removal of a framework cited as foundational in Chapter 1).
- **Literature Corpus:** Detecting missing citations where the supervisor asks for evidence but no corresponding DOI or source exists in the project library.

