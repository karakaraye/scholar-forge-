# ScholarForge AI

> **Your intelligent research workspace.**

ScholarForge AI is a multidisciplinary AI-powered academic research and writing SaaS platform built for undergraduate students, master's candidates, PhD researchers, faculty, and academic professionals worldwide.

---

## 🏛️ Platform Status & Architecture

ScholarForge AI has successfully implemented **Stages 1 through 8** (Foundation, AI Writing Workspace, Scholarly Discovery & Citations, Research Methodology & Statistical Analysis, Workflow & Assembly, Supervisor Review & Collaboration, University Formatting & Compliance, and Professional Word & PDF Export & QA):

### Stage 1: SaaS Foundation
- **Design System:** Deep academic navy (`#0B192C`), crisp white canvas, and subtle academic gold (`#F59E0B`) accents.
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, responsive components, Lucide icons.
- **Backend:** Python 3.12, Django 5.1, Django REST Framework.
- **Database:** PostgreSQL 16 / SQLite dev fallback (UUIDs, 14 domain models, row-level ownership isolation).
- **Security:** HttpOnly cookie sessions, CSRF token validation, zero token storage in browser `localStorage`.
- **Multidisciplinary Support:** 21 pre-seeded academic disciplines across STEM, Health, Social Sciences, Business, Law, Humanities, and Agriculture.
- **5-Step Setup Wizard:** Guided configuration from Document Category down to Citation Style and Methodology.

### Stage 2: AI-Assisted Academic Writing Workspace
- **Academic Structure Engine:** Dynamic scaffolding across disciplines (Management 5-Chapter, CS/Engineering, Medicine/Health, Law, Humanities, Systematic Reviews, Proposals, and Journal IMRaD).
- **Tiptap Academic Editor:** Rich text writing canvas with H1-H4, lists, quotes, tables (3x3), hyperlinks, subscripts/superscripts, undo/redo, shortcuts, and live word/character counts.
- **Persistence & Autosave:** Debounced autosave (1,500ms), manual save button, and `beforeunload` unsaved edits protection.
- **AI Writing Assistant (10 Tasks):** Section drafting, academic tone improvement, argumentation expansion, summarization, 5-style rephrasing, objectives, research questions, hypotheses, conceptual framework, and outline improvements.
- **Academic Integrity By Design:** Zero fabricated citations, zero invented DOIs, zero fabricated empirical findings; suggestions never automatically overwrite manuscript content (requires explicit user review/accept/edit/reject).
- **Academic Consistency Scanner:** Methodological diagnostics comparing objectives, research questions, hypotheses, title scope, and chapter balance with an overall Consistency Index.
- **Manuscript Version History:** Immutable snapshot checkpoints, timestamps, author attribution, and safe revision restoration.

### Stage 3: Scholarly Discovery, Verification & Citation Intelligence
- **Federated Discovery Engine:** Multi-filter scholarly research discovery across OpenAlex API, Crossref REST API, and Semantic Scholar with canonical normalization and conservative deduplication.
- **Publication Verification Engine:** Real-time metadata verification, Levenshtein title matching, Jaccard author surname matching, and automated retraction detection via Crossmark and OpenAlex.
- **Universal Bibliographic Importers:** Native BibTeX and RIS format parsers, plus direct Crossref DOI resolution.
- **Academic Document Extraction:** Native PDF stream extraction (`pdfminer.six`), scanned PDF identification, DOCX XML parser, prompt injection sanitization, and 20MB upload safeguards.
- **Literature Review Intelligence (10 Tasks):** Objective extraction, methodology analysis, finding extraction, limitation detection, comparative study synthesis, empirical research gaps, and evidence-grounded narrative reviews with explicit `evidence_basis` tagging (`FULL_TEXT`, `ABSTRACT`, `METADATA_ONLY`, `INSUFFICIENT`).
- **CSL Citation & Bibliography Engine:** APA 7th, MLA 9th, Chicago 17th, Harvard, IEEE (numbered `[1]`), and Vancouver (numbered `(1)`) in-text parenthetical and narrative citations with Tiptap editor span integration.
- **Manuscript Citation Integrity Audit:** Algorithmic integrity score (0–100%) detecting unlinked citations, ghost bibliography references, retracted publications, and metadata conflicts.
- **Functional Research Library (`/library`):** Discovery search, personal collection management, and project attachment workflows.

### Stage 4: Research Methodology, Instrument Design, Data Analysis & Results Intelligence
- **Intelligent Methodology Engine:** Discipline-aware methodology assistant spanning Quantitative, Qualitative, Mixed Methods, and Discipline-Specific designs (Legal, Computing, Engineering) with explicit theoretical assumptions, limitations, and mandatory researcher approval.
- **Sampling Size Determination Assistant:** Exact formulas for Yamane (1967), Cochran (1977 with FPC), Krejcie & Morgan (1970), and Statistical Power Analysis ($1 - \beta$). Explicitly rejects statistical formulas for qualitative studies in favor of saturation ranges.
- **Research Instrument Builder:** Questionnaires, Likert scales (5-point/7-point), semi-structured interview guides, observation protocols. Automatic item generation from variables, reverse coding identification, double-barreled item detection, and pure-Python OpenXML Microsoft Word (.docx) export.
- **Research Dataset Management & Cleaning:** Upload CSV, XLSX, and JSON up to 20MB. Formula injection sanitization (`=, +, -, @` neutralization), column profiling, reproducible non-destructive cleaning transformations (imputation, deduplication, IQR outlier handling, reverse coding, composite scales), and version lineage with instant rollback.
- **Deterministic Statistical Analysis Engine:** Real, non-hallucinated mathematical computation: Descriptives (mean, median, mode, variance, SD, skewness, kurtosis), Reliability (Cronbach's alpha, item-total correlations), Bivariate Association (Pearson $r$, Spearman $\rho$, Chi-square with Cramer's $V$), Group Comparisons (Independent $t$-test with Levene's test, Paired $t$-test, One-way ANOVA with $\eta^2$, Mann-Whitney $U$), and Regression (Multiple linear regression with ANOVA $F$, SE, $t$, $p$, 95% CIs, and VIF multicollinearity checks; Binary logistic regression with odds ratios $e^\beta$).
- **Hypothesis Testing Assistant:** Formal hypothesis mapping to statistical tests, decision rules (`REJECT_NULL`, `FAIL_TO_REJECT_NULL`), effect sizes, APA reporting strings, and substantive non-causal interpretations.
- **Qualitative Research Analysis:** Transcript ingestion, codebook management, character-exact verbatim excerpt verification (`quote_text == content[start:end]`), inductive candidate code suggestions with researcher validation, and thematic synthesis.
- **AI Results Interpretation Assistant (10 Tasks):** Results section drafting, Discussion section drafting, descriptive interpretation, non-causal correlation interpretation, regression interpretation, hypothesis synthesis, qualitative theme summarization, statistical assumption diagnostics, verified literature comparisons, and limitations/future research. Enforces strict refusal protocol when empirical data is absent.
- **Academic Consistency Checker Extension:** Full-cycle consistency verification connecting Variables $\leftrightarrow$ Instrument Items $\leftrightarrow$ Dataset Columns $\leftrightarrow$ Hypotheses $\leftrightarrow$ Statistical Results.

### Stage 5: End-to-End Academic Workflow, Manuscript Assembly & Quality Assurance (MVP Integration)
- **Dynamic Research Lifecycle Engine:** 12 adaptive lifecycle stages dynamically tailored by document category (Empirical Quantitative, Qualitative, Mixed, Conceptual, Legal, Systematic Review). Real-time completion progress calculated strictly from real database entities.
- **Structured Planning & Governance Gate:** Formal propositions management (problem statement, research aim, operationalized objectives, research questions, testable hypotheses, scope boundaries, limitations) with immutable audit trail and explicit human approval locking.
- **13-Node Research Alignment Matrix:** Graph-based coherence verification evaluating bidirectional congruence across: Problem $\leftrightarrow$ Aim $\leftrightarrow$ Objectives $\leftrightarrow$ Questions $\leftrightarrow$ Hypotheses $\leftrightarrow$ Variables $\leftrightarrow$ Theoretical Framework $\leftrightarrow$ Methodology $\leftrightarrow$ Instruments $\leftrightarrow$ Datasets $\leftrightarrow$ Statistical Tests $\leftrightarrow$ Results $\leftrightarrow$ Conclusions.
- **End-to-End Manuscript Assembly Engine:** Publication compiler generating preliminary pages (Title, Abstract, Dedication, Acknowledgements), hyperlinked Table of Contents (jump anchors), List of Tables, List of Figures, styled Reference Bibliography (APA 7th, IEEE, Harvard, Chicago), section contents, and Appendices with print/PDF export.
- **Multi-Dimensional Academic Quality Assurance:** Formative 6-category document audit (Structural Quality, Research Consistency, Citation Integrity, Evidence Validity, Writing Quality, Manuscript Completeness) with composite Readiness Score (0-100%) and required academic non-guarantee disclaimer.
- **AI Academic Review Assistant (10 Tasks):** Methodological rigor, theoretical consistency, empirical validity, statistical decision logic, literature synthesis, argument strength, academic tone, abstract alignment, defense readiness, and institutional compliance. Enforces anti-hallucination refusal protocol when sections have < 100 words.
- **Bidirectional Data Lineage & Provenance Engine:** Graph tracking manuscript tables to origin datasets and citations to verified publications, with automated stale-section detection.
- **Formal Review Checkpoints:** Supervisory review tracking (`DRAFT`, `READY_FOR_INTERNAL_REVIEW`, `REVISIONS_REQUIRED`, `APPROVED_DRAFT`) with pre-defense readiness checklists and reviewer feedback records.

### Stage 6: Supervisor Review, Academic Collaboration & Revision Management
- **Academic Collaboration Engine:** Isolated project-level collaborator management across 5 roles (`PROJECT_OWNER`, `SUPERVISOR`, `CO_AUTHOR`, `ACADEMIC_REVIEWER`, `VIEWER`) without workspace privilege leakage.
- **Secure Expiring Invitations:** Cryptographic token invitations (`secrets.token_urlsafe(32)`) expiring in 7 days, with full state transitions, email verification, and audit logging.
- **Inline Manuscript Annotations & Threads:** Character offset and context-anchored comments (`anchor_text`, `prefix`, `suffix`), threaded replies, resolution states, and automatic orphan detection upon section text edits.
- **Multi-Modal Supervisor Feedback Processing:** Ingestion of manual notes, Word DOCX files (OOXML comments and tracked revisions), and PDF markups (pypdf extraction with margin annotation notices), protected by prompt-injection sanitization.
- **15-Category AI Correction Analysis:** Rule-based and semantic classification of reviewer feedback into 15 academic categories, automatic section matching, contradictory guidance detection, and missing evidence identification without hallucinated citations or figures.
- **Revision Tasks & Concurrency Control:** 8-stage lifecycle (`OPEN` to `RESOLVED`), optimistic concurrency checking (`expected_base_version`), snapshot creation, and automatic stale invalidation upon subsequent section edits.
- **Revision Diff & Safe Restoration:** Word-level and paragraph-level diff comparison with net delta computation, and safe non-destructive restoration creating new version checkpoints.
- **Journal Reviewer Response Matrix:** Systematic point-by-point matrix (Reviewer 1, 2, Editor), verified applied compliance enforcement, and publication-ready Markdown/LaTeX synthesis export.
- **Supervisor Multi-Project Dashboard:** Dedicated advisee management view (`/supervisor`) aggregating active student projects, review tasks, bottlenecks, and completion status.

### Stage 7: University Academic Formatting, Institutional Templates & Manuscript Compliance
- **Hierarchical Institutional Template Engine:** Multi-level guideline inheritance (Country → Institution → Faculty → Department → Degree Level → Document Type). Strict invariant: `OFFICIALLY_VERIFIED` templates mandate authoritative guideline URLs and dates.
- **Pre-Seeded Authoritative Standards:** Oxford DPhil, Cambridge PhD, Harvard Doctoral, MIT Thesis, University of Ibadan Postgraduate, APA 7th, and IEEE Standards.
- **Deterministic Formatting Rule Engine:** Structured `rules_config` JSON schema across 8 categories (page margins, binding gutter, typography, line spacing, headings, pagination, prelims, tables/figures, citations). Version-controlled with changelogs.
- **Preliminary Pages Generator:** 10 academic front matter pages (Title, Certification, Declaration, Dedication, Acknowledgements, Abstract, TOC, List of Tables, Figures, Abbreviations) with explicit transparent placeholders (zero fabricated details).
- **Web Layout Transparency Invariant:** HTML web preview explicitly marks physical pagination as `NOT_VERIFIED`; exact physical page measurements are strictly rendered during PDF/DOCX compilation.
- **Author Guideline Ingestion Engine:** Uploads DOCX/PDF guidelines with adversarial prompt-injection sanitization, candidate rule extraction, confidence scoring, and human review approval gate.
- **Deterministic Compliance Intelligence Engine:** Multi-tier issue classification (`CRITICAL`, `MAJOR`, `MINOR`, `INFORMATIONAL`) auditing word counts, table/figure captions, citations, and mandatory ethics approval statements for empirical studies.
- **Safe Auto-Formatting & Rollback:** Before/after visual diff preview modal, mandatory baseline `DocumentVersion` snapshot creation prior to any write, safe reversible styling adjustments, and one-click rollback.
- **Journal Publication Standards & Article Structures:** 4 article architectures (IMRaD, Review, Systematic Review PRISMA 2020, Conceptual/Theoretical), journal profiles (Nature, The Lancet, IEEE, PLOS ONE), ISO 7064 Mod 11-2 validated ORCIDs, and 0–100 Submission Readiness scoring.

### Stage 8: Professional Microsoft Word and PDF Export, Academic Rendering & QA
- **Intermediate Semantic Representation (IR):** Canonical typed block tree (`FrontMatterBlock`, `HeadingBlock`, `ParagraphBlock`, `TableBlock`, `FigureBlock`, `EquationBlock`, `BibliographyBlock`) guaranteeing zero hallucination.
- **Microsoft Word (.docx) Engine:** Built on `python-docx` with semantic styles, dual Roman/Arabic pagination section breaks, binding gutters, APA 7th Edition 3-line tables, and refreshable Word Table of Contents field codes (`TOC \o "1-3" \h \z \u`).
- **Print-Ready PDF Engine:** Vector PDF generation via ReportLab Platypus, two-pass `NumberedCanvas` with running headers and dual pagination, interactive outline bookmarks, and embedded standard fonts.
- **Export Quality Assurance Engine:** Automated element-by-element parity cross-check (headings, tables, figures, references, words), layout defect detection, and cryptographic SHA-256 hash generation for data provenance.
- **Asynchronous Task Architecture:** Resilient job lifecycle (`PENDING` → `PROCESSING` → `VALIDATING` → `COMPLETED`), client idempotency key enforcement, protected private filesystem storage (`/private/exports/`), and object-level download authorization.
- **Document Export Workspace:** Interactive 3-panel UI with format toggles, virtual page layout preview, zoom controls, structural parity audit cards, and slide-out export history drawer.

---

## 📂 Project Structure

```
scholarforge-ai/
├── frontend/                     # Next.js App Router application
│   ├── src/
│   │   ├── app/                  # App Router pages (Landing, Features, Auth, Dashboard, Wizard, Workspace)
│   │   ├── components/           # Reusable UI components (Navbar, Footer, Sidebar, Cards, Modals)
│   │   ├── context/              # AuthContext session provider
│   │   ├── lib/                  # API client, constants, utils
│   │   └── types/                # TypeScript interfaces
│   ├── e2e/                      # Playwright E2E browser test specs
│   └── package.json
├── backend/                      # Django REST Framework backend
│   ├── accounts/                 # Custom User model & auth views
│   ├── workspaces/               # Workspace, Membership & AuditEvent
│   ├── disciplines/              # AcademicDiscipline model & seeds
│   ├── projects/                 # ResearchProject, ResearchRequirements & access.py (role/capability policy)
│   ├── documents/                # ResearchDocument, DocumentSection, DocumentVersion
│   ├── research/                 # Stages 2–8: discovery, citations, methodology, statistics,
│   │                             #   workflow, collaboration, formatting, export services
│   ├── tests/                    # Pytest backend test suite
│   ├── media/                    # (git-ignored) uploads & generated exports, see DJANGO_MEDIA_ROOT
│   ├── manage.py
│   └── requirements.txt
├── infrastructure/               # Docker & deployment orchestration
│   ├── docker-compose.yml        # PostgreSQL, backend & frontend containers
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── docs/                         # Architecture, schema, and API documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_DOCUMENTATION.md
│   └── STAGE1_VALIDATION.md
├── .env.example
├── .gitignore
├── README.md
└── STAGE1_VALIDATION.md
```

---

## 💻 Running & Testing Locally

The recommended local setup runs the backend and frontend directly on your machine. The Docker Compose stack in `infrastructure/` does **not** work yet (see [What's Left To Be Done](#-whats-left-to-be-done)).

### Prerequisites
- Python **3.12**
- Node.js **20** and npm
- Git
- *(Optional)* PostgreSQL 16. Without it the backend falls back to SQLite.

### 1. Clone and configure
```bash
git clone https://github.com/karakaraye/scholar-forge-.git scholarforge-ai
cd scholarforge-ai
cp .env.example .env
```

The backend reads `.env` from the repository root. Two things to decide in it:

- **Database.** `.env.example` points at PostgreSQL. For a quick SQLite setup, comment out `DB_ENGINE` and every `POSTGRES_*` line. The backend only uses PostgreSQL when `DB_ENGINE=postgresql` or `POSTGRES_DB` is set.
- **AI.** Keep `AI_MOCK_MODE=True` to use the offline, deterministic writing assistant. To use live generation, set `OPENAI_API_KEY` and `AI_MOCK_MODE=False`.

### 2. Backend (Django, port 8000)
Windows (PowerShell):
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_disciplines
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```
On macOS/Linux, activate the virtualenv with `source venv/bin/activate` instead.

Check it is up: [http://127.0.0.1:8000/api/v1/health/](http://127.0.0.1:8000/api/v1/health/). The Django admin is at [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/).

### 3. Frontend (Next.js, port 3000)
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). The frontend calls the API at `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:8000`).

### 4. Automated tests

| Suite | Command (from the folder shown) | Notes |
| :--- | :--- | :--- |
| Backend unit/API tests: 189 tests, ~6 min | `backend`: `.\venv\Scripts\pytest` | Uses the database from `.env`. Uploads/exports go to a temp folder. The AI writing assistant runs in mock mode unless `AI_MOCK_MODE` is set. |
| Run one backend file | `backend`: `.\venv\Scripts\pytest tests/test_project_access_control.py` | Role/permission tests |
| Frontend component tests: 53 tests | `frontend`: `npm run test` | Vitest + Testing Library, API calls mocked |
| Type check | `frontend`: `npx tsc --noEmit` | Must report no errors |
| Production build | `frontend`: `npm run build` | |
| End-to-end browser tests | `frontend`: `npx playwright install chromium` once, then `npm run test:e2e` | Backend **and** frontend must both be running on ports 8000 and 3000 |

`pytest.ini` uses `--reuse-db`. After changing models or migrations, run `pytest --create-db` once.

### 5. Manual smoke test
After both servers are running, check the main flows in the browser:

1. **Register and log in.** Then create a project through the setup wizard on `/research/create`.
2. **Write.** Open the project, type in a section, and confirm autosave. Run an AI writing action; in mock mode it returns a clearly labelled mock suggestion.
3. **Library.** On `/library`, search for papers. This needs internet access to OpenAlex, Crossref and Semantic Scholar. Attach a source to the project and insert a citation.
4. **Data.** Upload a small CSV dataset and run a descriptive statistics or t-test analysis.
5. **Collaboration.** Register a second account. There is no invitation-acceptance page or email yet, so add that account to the project directly: in the Django admin, go to **Research → Project collaborators → Add** and choose role `VIEWER`. Log in as that account. Confirm it can open the project but cannot edit sections. Change the role to `CO_AUTHOR` and confirm editing now works.
6. **Export.** Export to DOCX and PDF, then download both files. Generated files land in `backend/media/exports/`.

---

## 🚧 What's Left To Be Done

This list comes from a code review on 2026-11-10. Items are grouped by impact.

### Blocks deployment
| # | Gap | Where |
| :-: | :--- | :--- |
| 1 | **Frontend Docker image does not build.** The Dockerfile copies `.next/standalone` and `public/`, but `next.config.mjs` lacks `output: 'standalone'` and `frontend/public/` does not exist. | `infrastructure/frontend.Dockerfile`, `frontend/next.config.mjs` |
| 2 | **Backend runs Django's dev server** (`runserver`) in the container. There is no Gunicorn, no static-file serving (the admin is unstyled when `DEBUG=False`), and no `collectstatic`. | `infrastructure/backend.Dockerfile`, `docker-compose.yml` |
| 3 | **Production security settings are hard-coded or tied to `DEBUG`.** `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` only allow localhost. Cookie `Secure` flags follow `DEBUG`; the `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` lines in `.env.example` are never read. `SECRET_KEY` falls back to a public default. There is no HTTPS redirect, HSTS or proxy-SSL header. | `backend/scholarforge/settings.py` |
| 4 | **`NEXT_PUBLIC_API_URL` is baked in at build time.** Compose sets it only at runtime, and to `http://backend:8000`, which a browser cannot reach. | `docker-compose.yml`, `frontend/src/lib/api.ts` |
| 5 | **No email delivery.** `EMAIL_BACKEND` is the console backend, so password-reset emails are never sent. Collaborator invitations create a token but send no email. | `settings.py`, `research/collaboration_service.py` |

### Missing or incomplete features
- **No invitation-acceptance page.** The API (`/api/v1/research/collaborations/invitations/<token>/accept/`) and `collaborationApi.acceptInvitation` exist, but no page calls them.
- **Most "AI" features use built-in templates, not a language model.** Only the writing assistant (`research/ai_service.py`) calls OpenAI. Literature intelligence, the AI review assistant, results interpretation and supervisor-feedback correction analysis produce deterministic text.
- **Section scoping is not enforced.** `ProjectCollaborator.assigned_sections` is stored but ignored by the access policy.
- **Exports run inside the HTTP request.** There is no worker queue, so large documents can hit proxy timeouts. Moving export jobs to Celery/RQ would fix this.
- **Mock-mode switches are inconsistent.** Discovery, verification and literature services read `AI_MOCK_MODE` themselves (default `False`), unlike the writing assistant.

### Operational hygiene
- No rate limiting on login, registration or AI endpoints (DRF throttling not configured).
- No `LOGGING` configuration, error tracking (e.g. Sentry) or health checks beyond `/api/v1/health/`.
- No CI pipeline. Tests, type check and build only run manually.
- Uploads and exports live on the local filesystem. Running more than one backend instance needs shared or object storage.
- Housekeeping:
  - `requirements.txt` mixes runtime and test dependencies.
  - `frontend/tsconfig.tsbuildinfo` is committed.
  - Line endings are mixed (add a `.gitattributes`).

---

## 🌐 Getting It Deployment-Ready

Work through these steps in order. Steps 1–4 fix the blockers above; steps 5–7 harden the system for real users.

### 1. Make backend settings environment-driven
In `backend/scholarforge/settings.py`:
```python
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1', 'yes')
SECRET_KEY = os.environ['DJANGO_SECRET_KEY'] if not DEBUG else os.environ.get('DJANGO_SECRET_KEY', 'dev-only-key')

def env_list(name, default=''):
    return [v.strip() for v in os.environ.get(name, default).split(',') if v.strip()]

CORS_ALLOWED_ORIGINS = env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
CSRF_TRUSTED_ORIGINS = env_list('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')

SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = not DEBUG
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = True
```
Then run `python manage.py check --deploy` with production env vars and resolve every warning.

### 2. Serve the backend properly
- Add `gunicorn` and `whitenoise` to `requirements.txt`. Insert `whitenoise.middleware.WhiteNoiseMiddleware` right after `SecurityMiddleware`.
- In `backend.Dockerfile`, add `RUN python manage.py collectstatic --noinput`. Change the command to:
  ```
  gunicorn scholarforge.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
  ```
- Run `migrate` and `seed_disciplines` as a one-off release step, not on every container start.

### 3. Fix the frontend image
- Add `output: 'standalone'` to `frontend/next.config.mjs`.
- Create `frontend/public/` (a favicon is enough), or remove the `COPY ... /app/public` line.
- Pass the API URL as a build argument:
  ```dockerfile
  ARG NEXT_PUBLIC_API_URL
  ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
  ```
  Set it in compose under `build.args` to the public HTTPS URL of the API.

### 4. Choose a domain layout that keeps session cookies working
Auth uses `SameSite=Lax` session and CSRF cookies, and the browser calls the API directly. The frontend and API must therefore be **same-site**. Two layouts work:
- **One domain, recommended.** A reverse proxy (Caddy or nginx) serves `https://app.example.com`. It routes `/api/` and `/admin/` to Django and everything else to Next.js. Set `NEXT_PUBLIC_API_URL=https://app.example.com`.
- **Sibling subdomains.** Use `app.example.com` (frontend) and `api.example.com` (backend). List the frontend origin in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.

Hosting the frontend and API on unrelated domains (e.g. `*.vercel.app` + `*.onrender.com`) breaks login.

### 5. Data, files and secrets
- **Database.** Use managed PostgreSQL 16 with automated daily backups.
- **Files.** Point `DJANGO_MEDIA_ROOT` at a persistent volume (already wired in `docker-compose.yml`). Back that volume up too. For multiple instances, switch to object storage (`django-storages` + S3/R2/GCS).
- **Secrets.** Required environment variables in production:

  | Area | Variables |
  | :--- | :--- |
  | Django | `DJANGO_SECRET_KEY` (new, random), `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS` |
  | Cross-origin | `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL` |
  | Database | `POSTGRES_*` |
  | Files | `DJANGO_MEDIA_ROOT` |
  | Email | `EMAIL_*` |
  | AI | `OPENAI_API_KEY`, `AI_MOCK_MODE=False`, optional `SEMANTIC_SCHOLAR_API_KEY` |

  Never commit `.env`.

### 6. Reliability and abuse protection
- Configure DRF throttling: `DEFAULT_THROTTLE_CLASSES` / `DEFAULT_THROTTLE_RATES`, with stricter scopes on auth and AI endpoints.
- Add `LOGGING` to stdout and error tracking (Sentry).
- Point an uptime monitor at `/api/v1/health/`.
- Move export generation to a background worker before inviting heavy users.

### 7. Release checklist
Run before every deploy, ideally in a GitHub Actions workflow on each push:
```bash
cd backend && pytest
```
```bash
cd frontend && npm ci && npx tsc --noEmit && npm run test && npm run build
```
```bash
cd backend && python manage.py check --deploy && python manage.py makemigrations --check --dry-run
```
After deploying, repeat the [manual smoke test](#5-manual-smoke-test) against the live URL with a test account.

---

## 📄 Documentation Links
- [Stage 8 Implementation Report](STAGE8_IMPLEMENTATION.md)
- [Stage 8 Validation & Verification Report](STAGE8_VALIDATION.md)
- [Document IR Specification](docs/DOCUMENT_IR_SPEC.md)
- [Microsoft Word Export Engine Specification](docs/WORD_EXPORT_ENGINE_SPEC.md)
- [Print-Ready PDF Rendering Specification](docs/PDF_RENDERING_SPEC.md)
- [Export QA & Parity Cross-Check Specification](docs/EXPORT_QA_SPEC.md)
- [Export Job Management & Security Specification](docs/EXPORT_JOB_SECURITY_SPEC.md)
- [Stage 7 Implementation Report](STAGE7_IMPLEMENTATION.md)
- [Stage 7 Validation & Verification Report](STAGE7_VALIDATION.md)
- [Academic Collaboration Architecture](docs/COLLABORATION_ARCHITECTURE.md)
- [Supervisor Feedback Processing Specification](docs/SUPERVISOR_FEEDBACK_SPEC.md)
- [Review & Revision Lifecycle Specification](docs/REVIEW_WORKFLOW_SPEC.md)
- [Manuscript Comment Anchoring Specification](docs/COMMENT_ANCHORING_SPEC.md)
- [Stage 5 Implementation Summary](STAGE5_IMPLEMENTATION.md)
- [Stage 5 Validation & Verification Report](STAGE5_VALIDATION.md)
- [Stage 4 Implementation Summary](STAGE4_IMPLEMENTATION.md)
- [Stage 4 Validation & Verification Report](STAGE4_VALIDATION.md)
- [Stage 3 Implementation Summary](STAGE3_IMPLEMENTATION.md)
- [Stage 3 Validation & Verification Report](STAGE3_VALIDATION.md)
- [Scholarly Research Discovery Architecture](docs/RESEARCH_DISCOVERY_ARCHITECTURE.md)
- [Publication Verification Specification](docs/SOURCE_VERIFICATION_SPEC.md)
- [CSL Citation Engine Specification](docs/CITATION_ENGINE_SPEC.md)
- [Literature Review Intelligence Specification](docs/LITERATURE_INTELLIGENCE_SPEC.md)
- [Stage 2 Implementation Summary](STAGE2_IMPLEMENTATION.md)
- [Stage 2 Validation & Verification Report](STAGE2_VALIDATION.md)
- [AI Architecture & Integrity Directives](docs/AI_ARCHITECTURE.md)
- [Academic Discipline Outline Specifications](docs/ACADEMIC_TEMPLATE_SPEC.md)
- [Stage 1 Full Validation Report](STAGE1_VALIDATION.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [PostgreSQL Database Schema](docs/DATABASE_SCHEMA.md)
- [REST API Documentation](docs/API_DOCUMENTATION.md)

