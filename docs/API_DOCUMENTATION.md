# ScholarForge AI — REST API Documentation (v1)

Base URL: `/api/v1/`
Authentication: Secure Session Cookie (`scholarforge_sessionid`) + CSRF Header (`X-CSRFToken`)

---

## 1. System Endpoints

### Health Check
- **Endpoint:** `GET /api/v1/health/`
- **Permissions:** `AllowAny`
- **Response:**
  ```json
  {
    "status": "healthy",
    "service": "ScholarForge AI API",
    "version": "1.0.0",
    "stage": "Stage 1 - SaaS Foundation"
  }
  ```

---

## 2. Authentication Endpoints (`/api/v1/auth/`)

### CSRF Token
- **Endpoint:** `GET /api/v1/auth/csrf/`
- **Permissions:** `AllowAny`
- **Response:**
  ```json
  {
    "csrfToken": "sample-csrf-token-string"
  }
  ```

### User Registration
- **Endpoint:** `POST /api/v1/auth/register/`
- **Permissions:** `AllowAny`
- **Body:**
  ```json
  {
    "email": "scholar@institution.edu",
    "first_name": "Marcus",
    "last_name": "Chen",
    "password": "StrongPassword2026!",
    "password_confirm": "StrongPassword2026!",
    "academic_level": "PHD",
    "institution": "MIT",
    "orcid_id": "0000-0002-1825-0097"
  }
  ```
- **Response:** `201 Created`
  Sets HttpOnly cookie `scholarforge_sessionid` automatically.

### User Login
- **Endpoint:** `POST /api/v1/auth/login/`
- **Permissions:** `AllowAny`
- **Body:**
  ```json
  {
    "email": "scholar@institution.edu",
    "password": "StrongPassword2026!"
  }
  ```
- **Response:** `200 OK`
  Sets HttpOnly cookie `scholarforge_sessionid`.

### User Logout
- **Endpoint:** `POST /api/v1/auth/logout/`
- **Permissions:** `IsAuthenticated`
- **Response:** `200 OK` (Clears session cookie).

### Current User Profile
- **Endpoint:** `GET /api/v1/auth/me/`
- **Update Profile:** `PATCH /api/v1/auth/me/`
- **Permissions:** `IsAuthenticated`

### Password Reset Request
- **Endpoint:** `POST /api/v1/auth/password-reset/`
- **Permissions:** `AllowAny`
- **Body:** `{ "email": "scholar@institution.edu" }`

### Password Reset Confirm
- **Endpoint:** `POST /api/v1/auth/password-reset-confirm/`
- **Permissions:** `AllowAny`
- **Body:** `{ "uid": "<uid>", "token": "<token>", "new_password": "<new_password>" }`

### Password Change
- **Endpoint:** `POST /api/v1/auth/change-password/`
- **Permissions:** `IsAuthenticated`
- **Body:** `{ "current_password": "...", "new_password": "..." }`

---

## 3. Academic Disciplines (`/api/v1/disciplines/`)

### List Disciplines
- **Endpoint:** `GET /api/v1/disciplines/`
- **Query Parameters:** `?search=Computer&category=STEM`
- **Permissions:** `AllowAny`

### Create Discipline (Admin Only)
- **Endpoint:** `POST /api/v1/disciplines/`
- **Permissions:** `IsAdminUser`

---

## 4. Research Projects (`/api/v1/projects/`)

### List Research Projects
- **Endpoint:** `GET /api/v1/projects/`
- **Query Parameters:** `?category=ACADEMIC_PROJECT&status=ACTIVE&search=distributed`
- **Permissions:** `IsAuthenticated` (Enforces user data isolation)

### Dashboard Statistics
- **Endpoint:** `GET /api/v1/projects/dashboard-stats/`
- **Permissions:** `IsAuthenticated`
- **Response:**
  ```json
  {
    "total_projects": 4,
    "active_projects": 3,
    "draft_projects": 0,
    "archived_projects": 1,
    "recently_updated": [...]
  }
  ```

### Create Research Project (Setup Wizard)
- **Endpoint:** `POST /api/v1/projects/`
- **Permissions:** `IsAuthenticated`
- **Body:**
  ```json
  {
    "title": "Quantum Error Mitigation in Noisy Intermediate-Scale Systems",
    "document_category": "ACADEMIC_PROJECT",
    "document_subtype": "PhD Dissertation",
    "academic_level": "PHD",
    "discipline_id": "uuid-here",
    "institution": "Caltech",
    "country": "United States",
    "preferred_language": "English",
    "citation_style": "IEEE",
    "requirements": {
      "research_methodology": "Empirical tensor network simulations",
      "research_objectives": "Reduce surface code syndrome extraction latency",
      "supervisor_requirements": "Minimum 40 peer-reviewed references",
      "target_word_count": 45000
    }
  }
  ```
- **Response:** `201 Created`
  Automatically provisions dedicated manuscript and dynamic chapter sections.

### Retrieve Project Details
- **Endpoint:** `GET /api/v1/projects/<id>/`
- **Permissions:** `IsAuthenticated` (Strict owner/member check)

### Update Project
- **Endpoint:** `PATCH /api/v1/projects/<id>/`
- **Permissions:** `IsAuthenticated` (Strict owner/member check)

### Archive Project
- **Endpoint:** `POST /api/v1/projects/<id>/archive/`
- **Permissions:** `IsAuthenticated` (Strict owner/member check)

### Delete Project
- **Endpoint:** `DELETE /api/v1/projects/<id>/`
- **Permissions:** `IsAuthenticated` (Strict owner/member check)

---

## 5. Workspaces (`/api/v1/workspaces/`)

### Current Personal Workspace
- **Endpoint:** `GET /api/v1/workspaces/current/`
- **Permissions:** `IsAuthenticated`


---

## 6. Stage 6: Collaboration, Supervisor Feedback & Journal Workflows

### Project Collaborator Management
- **List Collaborators & Invitations:** `GET /api/v1/research/projects/<project_id>/collaborators/`
  - Returns `{ collaborators: [...], pending_invitations: [...], current_user_role: "PROJECT_OWNER" | "SUPERVISOR" | "CO_AUTHOR" | "ACADEMIC_REVIEWER" | "VIEWER" }`.
- **Invite Collaborator:** `POST /api/v1/research/projects/<project_id>/collaborators/`
  - Body: `{ "email": "advisor@university.edu", "role": "SUPERVISOR", "assigned_sections": ["Chapter 3"] }`.
- **Revoke / Remove Collaborator:** `DELETE /api/v1/research/projects/<project_id>/collaborators/<collaborator_id>/`
- **Accept Secure Invitation:** `POST /api/v1/research/collaborations/invitations/<token>/accept/`
- **Reject Secure Invitation:** `POST /api/v1/research/collaborations/invitations/<token>/reject/`
- **Revoke Pending Invitation:** `DELETE /api/v1/research/projects/<project_id>/invitations/<invitation_id>/`
- **Collaboration Audit Trail:** `GET /api/v1/research/projects/<project_id>/collaborators-audit/`

### Context-Anchored Manuscript Comments
- **List Document Comments:** `GET /api/v1/research/projects/<project_id>/comments/?document_id=<uuid>&status=OPEN`
- **Create Anchored Comment:** `POST /api/v1/research/projects/<project_id>/comments/`
  - Body: `{ "document_id": "uuid", "section_id": "uuid", "anchor_text": "sample of 400", "start_offset": 100, "end_offset": 113, "content": "Please verify sample size calculation." }`.
- **Reply to Thread:** `POST /api/v1/research/comments/<comment_id>/reply/`
  - Body: `{ "content": "Power calculation confirmed N=384 at 95% CI." }`.
- **Update Comment Status:** `PATCH /api/v1/research/comments/<comment_id>/status/`
  - Body: `{ "status": "RESOLVED" }` (or `OPEN`, `ORPHANED`).
- **Dynamic Anchor Relocation:** `POST /api/v1/research/documents/<document_id>/recalculate-anchors/`
  - Body: `{ "content": "optional latest content" }`.

### Supervisor Multi-Modal Feedback Ingestion & AI Analysis
- **List Feedback Ingestions:** `GET /api/v1/research/projects/<project_id>/feedback/`
- **Ingest Feedback (Manual or Multipart File):** `POST /api/v1/research/projects/<project_id>/feedback/`
  - Supports `MANUAL_ENTRY`, `DOCX_UPLOAD` (extracts comments & tracked revisions via OOXML), `PDF_UPLOAD` (pypdf text extraction with margin disclaimer), `INLINE_THREAD_IMPORT`.
  - Built-in prompt-injection sanitization.
- **Run AI Feedback Analysis:** `POST /api/v1/research/feedback/<feedback_id>/analyze/`
  - Body: `{ "auto_create_tasks": true }`.
  - 15-category classification, section linking, conflict detection, missing evidence checks.

### Correction Task & Revision Lifecycle
- **List Tasks:** `GET /api/v1/research/projects/<project_id>/corrections/?status=OPEN&priority=HIGH`
- **Create Task:** `POST /api/v1/research/projects/<project_id>/corrections/`
- **Apply Revision (Optimistic Concurrency):** `POST /api/v1/research/corrections/<task_id>/apply/`
  - Body: `{ "content": "...", "force_override": false }`.
  - Enforces `expected_base_version`. Creates automatic `DocumentVersion` snapshot.
- **Supervisor Review / Decision:** `POST /api/v1/research/corrections/<task_id>/review/`
  - Body: `{ "decision": "APPROVE" | "REJECT" | "RESOLVE" | "REOPEN", "notes": "Approved." }`.

### Version Diff & Non-Destructive Safe Restoration
- **Compare Versions:** `GET /api/v1/research/documents/<document_id>/diff/?base_version=1&target_version=2`
  - Returns word diff chunks (`equal`, `added`, `deleted`), net word delta, and paragraph diffs.
- **Safe Version Restoration:** `POST /api/v1/research/documents/<document_id>/restore-version/`
  - Body: `{ "target_version_number": 1 }`.
  - Creates a new forward checkpoint version restoring content non-destructively.

### Journal Reviewer Response Matrix
- **List Response Matrix Points:** `GET /api/v1/research/projects/<project_id>/journal-responses/`
- **Create Response Point:** `POST /api/v1/research/projects/<project_id>/journal-responses/`
  - Body: `{ "reviewer_label": "Reviewer 1", "comment_number": 1, "original_comment": "...", "revision_category": "MAJOR", "author_response": "..." }`.
- **Update Response Point:** `PATCH /api/v1/research/journal-responses/<response_id>/`
- **Export Synthesis Document:** `GET /api/v1/research/projects/<project_id>/journal-responses/matrix-document/`
  - Produces publication-ready point-by-point response markdown document.

### Supervisor Multi-Project Advisee Dashboard
- **List Supervised Projects:** `GET /api/v1/research/supervisor/projects/`
  - Aggregates assigned advisee dissertations, open comments, and pending correction tasks.

---

## 8. Stage 7: University Formatting, Institutional Templates & Compliance APIs

### Institutional & Departmental Templates
- **List Institutions:** `GET /api/v1/research/institutions/?country={country}`
- **List Departments:** `GET /api/v1/research/departments/?faculty_id={facultyId}`
- **List Formatting Templates:** `GET /api/v1/research/templates/?institution={id}&degree_level={level}&document_type={type}`
- **Get Template Detail:** `GET /api/v1/research/templates/{id}/`
- **Create Template:** `POST /api/v1/research/templates/`
  - Enforces `OFFICIALLY_VERIFIED` requirement for `verification_source_url`.
- **Clone Template:** `POST /api/v1/research/templates/{id}/clone/`
  - Forks a verified standard into a user-customized template.
- **Assign Project Template:** `POST /api/v1/research/projects/{id}/template/`
  - Body: `{ "template_id": "...", "template_version_id": "..." }`.
- **Get Assigned Template:** `GET /api/v1/research/projects/{id}/template/`

### Preliminary Pages (Front Matter)
- **Get Preliminary Pages:** `GET /api/v1/research/projects/{id}/preliminary-pages/`
  - Returns rendered HTML for 10 front matter pages with Roman pagination and transparent placeholders.
- **Regenerate Preliminary Pages:** `POST /api/v1/research/projects/{id}/preliminary-pages/`
  - Body: `{ "author_name": "...", "degree": "...", "matric_no": "...", "supervisor": "..." }`.

### Author Guideline Ingestion Engine
- **Upload & Extract Rules:** `POST /api/v1/research/guidelines/ingest/` (multipart/form-data)
  - Scans for adversarial prompt injections and extracts candidate formatting rules with confidence scores.
- **Approve Guideline Rules:** `POST /api/v1/research/guidelines/{source_id}/approve/`
  - Converts candidate rules into an active, customizable `FormattingTemplate`.

### Deterministic Compliance Intelligence & Safe Auto-Formatting
- **Get Latest Validation:** `GET /api/v1/research/projects/{id}/compliance/`
- **Run Compliance Check:** `POST /api/v1/research/projects/{id}/compliance/`
  - Evaluates rules across 9 categories; categorizes issues into `CRITICAL`, `MAJOR`, `MINOR`, `INFORMATIONAL`.
- **Preview Auto-Format:** `GET /api/v1/research/projects/{id}/autoformat/preview/`
  - Returns section-by-section diff proposals without mutating database records.
- **Apply Auto-Format:** `POST /api/v1/research/projects/{id}/autoformat/apply/`
  - Creates an immutable pre-formatting `DocumentVersion` snapshot, applies safe formatting, and returns snapshot version number.
- **Rollback Auto-Format:** `POST /api/v1/research/projects/{id}/autoformat/rollback/`
  - Body: `{ "snapshot_version_id": "..." }`. Restores document sections cleanly.

### Journal Publication Standards & Metadata
- **List Journal Profiles:** `GET /api/v1/research/journals/?article_type={type}&search={term}`
- **Get Submission Readiness:** `GET /api/v1/research/projects/{id}/submission-readiness/?journal_id={journal_id}`
  - Outputs 0–100 readiness score and checklist of passing/failing publisher criteria.
- **Get Publication Metadata:** `GET /api/v1/research/projects/{id}/metadata/`
- **Update Publication Metadata:** `PUT /api/v1/research/projects/{id}/metadata/`
  - Validates ORCIDs (`^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$`), affiliations, and mandatory ethics declarations.

---

## 9. Stage 8: Professional Word & PDF Export, Pagination & QA APIs

### Export Initiation & Job Tracking
- **Initiate Asynchronous Export:** `POST /api/v1/research/projects/{id}/export/`
  - Body:
    ```json
    {
      "export_format": "DOCX",
      "template_id": "optional-uuid",
      "citation_style": "apa-7th",
      "idempotency_key": "unique-client-uuid",
      "document_version_id": "optional-uuid"
    }
    ```
  - Returns `ExportJob` object (`id`, `status: PENDING`, `progress_pct: 0`, `status_message`).
- **Poll Export Job Status:** `GET /api/v1/research/export-jobs/{job_id}/`
  - Returns current job status (`PENDING` | `PROCESSING` | `VALIDATING` | `COMPLETED` | `FAILED`), progress percentage, and completed `document_export` ID.
- **Export Virtual Preview:** `GET /api/v1/research/projects/{id}/export-preview/?template_id={optional}`
  - Returns layout specs, estimated page count, preliminary pages sequence, chapter word counts, and element totals without triggering physical file compilation.

### Export Artifacts, Downloads & Audits
- **List Project Exports:** `GET /api/v1/research/projects/{id}/exports/`
  - Returns historical list of completed Word and PDF exports with file sizes, page counts, and timestamps.
- **Get Export Detail:** `GET /api/v1/research/exports/{export_id}/`
  - Returns full `DocumentExport` entity including attached `validation_report` (overall rating, element parity metrics, and QA issues).
- **Download Export Artifact (Gated & Protected):** `GET /api/v1/research/exports/{export_id}/download/`
  - Enforces object-level authentication and authorization.
  - Streams file binary with exact MIME headers and validated SHA-256 integrity.
- **Re-run QA Validation:** `POST /api/v1/research/exports/{export_id}/validate/`
  - Re-evaluates binary artifact against canonical IR baseline, updates `ExportValidation` report and rating.
- **Delete Export Artifact:** `DELETE /api/v1/research/exports/{export_id}/`
  - Removes physical file from private storage and deletes database record (project owner permission required).

