# ScholarForge AI — Stage 6 Implementation Report
**Supervisor Review, Academic Collaboration, Intelligent Feedback Processing, Revision Management & Journal Reviewer Workflows**

## 1. Executive Summary

Stage 6 completes the collaborative and peer-review ecosystem for ScholarForge AI, expanding the multidisciplinary research platform into a full-featured collaborative research environment. Built on top of the Stage 1–5 foundations (workspace, structured writing, discovery and verified citations, empirical data analysis and statistical validation, end-to-end assembly and QA), Stage 6 introduces:

1. **Academic Collaboration Engine**: Fine-grained project-level collaborator isolation with 5 discrete academic roles (`PROJECT_OWNER`, `SUPERVISOR`, `CO_AUTHOR`, `ACADEMIC_REVIEWER`, `VIEWER`), enforcing least privilege without leaking workspace-level administrative power.
2. **Secure Expiring Invitation System**: Cryptographic invitation tokens (`secrets.token_urlsafe(32)`) expiring in 7 days, with full state management (`PENDING`, `ACCEPTED`, `REJECTED`, `REVOKED`, `EXPIRED`), email verification, and immutable audit logging.
3. **Inline Context-Anchored Manuscript Comments**: Character-offset and snippet-anchored annotations (`anchor_text`, `anchor_prefix`, `anchor_suffix`, `start_offset`, `end_offset`), threaded multi-party discussions, resolution toggles, and robust orphan detection on subsequent text edits.
4. **Multi-Modal Supervisor Feedback Processing**: Ingestion of manual review notes, Word DOCX files (extracting OOXML comments and tracked revisions), PDF reviews (extracting text via pypdf with disclaimers for graphical margin notes), and inline comment aggregation, shielded by adversarial prompt injection sanitization.
5. **15-Category AI Correction Analysis & Planning**: Rule-based and semantic classification of feedback across 15 academic dimensions, automatic chapter/section matching, conflicting instruction detection, missing evidence identification (strictly guarding against fabricated data or references), and non-hallucinated proposed revisions.
6. **Revision Lifecycles & Concurrency Control**: Structured action items (`CorrectionTask`) traversing an 8-state workflow (`OPEN`, `IN_PROGRESS`, `PROPOSED`, `READY_FOR_REVIEW`, `APPROVED`, `REJECTED`, `RESOLVED`, `REOPENED`), optimistic concurrency checks (`expected_base_version`), pre-modification snapshot creation, and automatic stale invalidation upon subsequent section edits.
7. **High-Precision Revision Diff Engine & Safe Non-Destructive Restoration**: Word-level and paragraph-level diff comparison (`+`/`-`), net delta calculation, and safe restoration creating a new snapshot version checkpoint rather than destructive database overwrites.
8. **Journal Reviewer Point-by-Point Matrix & Response Document**: Systematic peer-review matrix (Reviewer 1, 2, Editor), major/minor classification, verified applied enforcement, and publication-ready Markdown/LaTeX synthesis export.
9. **Supervisor Multi-Project Dashboard**: Standalone dashboard (`/supervisor`) aggregating assigned advisee projects, pending feedback items, approval bottlenecks, and completion status.

---

## 2. Architecture & Database Models

Stage 6 introduced 8 PostgreSQL models in `backend/research/models.py`, fully integrated with existing `ResearchProject`, `ResearchDocument`, and `DocumentSection` entities:

### 1. `ProjectCollaborator`
- **Fields**: `id`, `project` (FK), `user` (FK), `role` (enum: `PROJECT_OWNER`, `SUPERVISOR`, `CO_AUTHOR`, `ACADEMIC_REVIEWER`, `VIEWER`), `invited_by` (FK), `assigned_sections` (JSON array of section IDs/titles), `can_edit_manuscript`, `can_approve_revisions`, `can_view_data`, `created_at`, `updated_at`.
- **Constraint**: `unique_together = ('project', 'user')`.

### 2. `ProjectInvitation`
- **Fields**: `id`, `project` (FK), `email` (string), `role` (enum), `token` (string, unique), `invited_by` (FK), `assigned_sections` (JSON), `status` (enum: `PENDING`, `ACCEPTED`, `REJECTED`, `REVOKED`, `EXPIRED`), `created_at`, `expires_at` (7 days default).

### 3. `ManuscriptComment`
- **Fields**: `id`, `project` (FK), `document` (FK), `section` (FK nullable), `author` (FK), `content` (text), `start_offset`, `end_offset`, `anchor_text`, `anchor_prefix`, `anchor_suffix`, `status` (enum: `OPEN`, `RESOLVED`, `ORPHANED`), `created_at`, `updated_at`.

### 4. `CommentReply`
- **Fields**: `id`, `comment` (FK), `author` (FK), `content` (text), `created_at`, `updated_at`.

### 5. `SupervisorFeedback`
- **Fields**: `id`, `project` (FK), `uploaded_by` (FK), `title`, `source_type` (enum: `MANUAL_ENTRY`, `DOCX_UPLOAD`, `PDF_UPLOAD`, `INLINE_THREAD_IMPORT`), `raw_content` (text), `file_attachment` (FileField), `extracted_comments` (JSON), `has_unextracted_annotations` (boolean), `created_at`.

### 6. `CorrectionTask`
- **Fields**: `id`, `project` (FK), `feedback_source` (FK nullable), `section` (FK nullable), `category` (enum across 15 categories), `priority` (enum: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `status` (enum: 8 states), `title`, `instruction` (text), `original_text` (text), `proposed_text` (text), `expected_base_version` (integer), `is_stale_after_subsequent_edit` (boolean), `approved_by` (FK nullable), `approved_at`, `created_at`, `updated_at`.

### 7. `JournalReviewerResponse`
- **Fields**: `id`, `project` (FK), `reviewer_label` (string, e.g. "Reviewer 1"), `comment_number` (int), `original_comment` (text), `revision_category` (enum: `MAJOR`, `MINOR`, `CLARIFICATION`, `REJECT_REQUEST`), `linked_task` (FK nullable), `target_section` (FK nullable), `author_response` (text), `is_verified_applied` (boolean), `created_at`, `updated_at`.
- **Constraint**: `unique_together = ('project', 'reviewer_label', 'comment_number')`.

### 8. `CollaborationAuditEvent`
- **Fields**: `id`, `project` (FK), `actor` (FK), `event_type` (string), `details` (JSON), `created_at`.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Capability | Project Owner | Supervisor | Co-Author | Academic Reviewer | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|
| Project Administration & Deletion | **Yes** | No | No | No | No |
| Invite / Revoke Collaborators | **Yes** | No | No | No | No |
| Configure Access Rights & Scopes | **Yes** | No | No | No | No |
| Add / Edit Manuscript Content | **Yes** | If scoped | **Yes** | No | No |
| Add Inline Annotations / Comments | **Yes** | **Yes** | **Yes** | **Yes** | No |
| Ingest Supervisor Feedback Files | **Yes** | **Yes** | No | No | No |
| Trigger AI Correction Analysis | **Yes** | **Yes** | **Yes** | No | No |
| Apply Proposed Revisions | **Yes** | No | **Yes** | No | No |
| Final Revision Approval Gate | **Yes** | **Yes** | No | No | No |
| Rebuttal Formulation & Journal Matrix | **Yes** | **Yes** | **Yes** | Read-Only | Read-Only |
| View Advisee Dashboards | **Yes** | **Yes** | No | No | No |

---

## 4. Key Services & Logic Implemented

### 4.1 Prompt Injection Shielding & Multi-Modal Ingestion (`SupervisorFeedbackService`)
Supervisor review files uploaded from external sources are sanitized against prompt injection patterns:
- Checks for adversarial system prompts (`system prompt:`, `override rules:`, `ignore instructions`, `delete database`, `exfiltrate`).
- Replaces matches with `[FLAGGED_ADVERSARIAL_INSTRUCTION_REDACTED]`.
- Word (`docx`): Parses standard OOXML comments (`comments.xml`) and revision runs (`w:ins`, `w:del`).
- PDF (`pdf`): Extracts text per page via `pypdf` with a persistent notice regarding graphical margin annotations.

### 4.2 15-Category Academic Correction Classifier (`CorrectionService`)
Classifies instructions into standard academic review taxonomy:
1. `LITERATURE_REVIEW_GAP`
2. `METHODOLOGY_RIGOR`
3. `STATISTICAL_INTERPRETATION`
4. `CITATION_COMPLIANCE`
5. `THEORETICAL_FRAMEWORK`
6. `STRUCTURE_FLOW`
7. `ACADEMIC_TONE`
8. `RESEARCH_OBJECTIVES`
9. `DATA_PRESENTATION`
10. `DISCUSSION_LIMITATIONS`
11. `PLAGIARISM_ETHICS`
12. `HYPOTHESIS_ALIGNMENT`
13. `INSTRUMENT_VALIDITY`
14. `CONTRADICTORY_FINDINGS`
15. `FORMATTING_STYLE`

### 4.3 Conflict & Missing Evidence Detection
- Identifies contradictory instructions (e.g. one reviewer requesting section condensation while another requests elaboration).
- Identifies missing empirical evidence vs simple prose rewrites. Revisions requiring empirical data or real sources insert explicit researcher placeholders: `[Citation needed: Author, Year]` and refuse to fabricate data.

### 4.4 Optimistic Concurrency & Stale Invalidation
- Tasks store `expected_base_version`.
- If the document version changes prior to task application, application is rejected with a conflict error unless forced.
- Prior approvals on a section are automatically flagged (`is_stale_after_subsequent_edit = True`) if subsequent edits occur.

### 4.5 Revision Diff & Safe Restoration (`RevisionDiffService`)
- Implements `difflib.SequenceMatcher` to compute additions, deletions, unchanged tokens, and net delta.
- Restoration creates a new `DocumentVersion` snapshot, maintaining full audit trails without destructive rollbacks.

### 4.6 Journal Reviewer Matrix (`JournalReviewService`)
- Point-by-point tracking of reviewer comments.
- Verification algorithm: `is_verified_applied` is strictly `True` only if the linked correction task is `APPROVED` or if the author formulated an accepted substantive rebuttal.
- Exports structured Markdown/LaTeX point-by-point response documents.

---

## 5. Frontend UI & Collaboration Components

All components implemented with Tailwind CSS, Lucide icons, responsive tables, and full TypeScript typing:

1. **`CollaboratorsManager.tsx`**: Invite modal, pending invitations list, role configuration, section assignment, revocation.
2. **`InlineCommentsPanel.tsx`**: Threaded comments, character snippet anchors, resolution filter, orphan badges, inline reply form.
3. **`SupervisorFeedbackWorkspace.tsx`**: Tabbed ingestion (Manual Notes, Word DOCX, PDF, Inline comments), PDF disclaimer banner, AI analysis execution.
4. **`CorrectionTracker.tsx`**: Filterable task list (by status and priority), supervisor approval/rejection buttons, researcher "Apply Revision" action, subsequent edit stale warnings.
5. **`VersionDiffViewer.tsx`**: Base/Target version selector, additions/deletions/net delta summary cards, word-level color-coded diff view, safe non-destructive restore confirmation modal.
6. **`JournalReviewMatrix.tsx`**: Point-by-point critique entry, compliance progress bar, author response formulation, markdown synthesis preview modal.
7. **`SupervisorDashboardView.tsx`**: Advisee project grid, active reviews, pending action items, direct link to research workspaces.
8. **`AcademicEditor.tsx`**: Comment anchoring button on toolbar, character offset selection hooks.
9. **`Research Workspace ([id]/page.tsx)`**: Added tabs for Collaborators, Supervisor Feedback, Revisions & Tasks, Version Diff, and Journal Reviewer Matrix.

---

## 6. Verification Status

- **Backend Pytest**: **137 / 137 passed (100% green)** in 320s (115 Stage 1–5 regression tests + 22 Stage 6 tests).
- **Frontend Vitest**: **37 / 37 passed (100% green)** across all 5 test files.
- **Next.js Production Build**: All 16 routes compiled cleanly with 0 TypeScript or linting errors.
- **Playwright E2E**: `stage6_collaboration.spec.ts` completed all 7 acceptance journeys in 1.1m (Chromium, real database and server).

