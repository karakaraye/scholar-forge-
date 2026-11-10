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
│   ├── docker-compose.yml        # proxy, frontend, backend, worker, migrate, PostgreSQL
│   ├── Caddyfile                 # HTTPS + same-origin routing (/api, /admin, /static → Django)
│   ├── .env.example              # production stack settings (copy to infrastructure/.env)
│   ├── backend.Dockerfile        # Gunicorn + WhiteNoise image (also used by the worker)
│   └── frontend.Dockerfile       # Next.js standalone image
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

For day-to-day development, run the backend and frontend directly on your machine. To try the production setup locally, use the Docker stack in [Deploying](#-deploying).

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

The backend reads `.env` from the repository root. Three things to decide in it:

- **Debug mode.** Keep `DJANGO_DEBUG=True` locally. When it is `False` (the default if unset), `DJANGO_SECRET_KEY` must be set and HTTPS-only cookies are used.
- **Database.** `.env.example` points at PostgreSQL. For a quick SQLite setup, comment out `DB_ENGINE` and every `POSTGRES_*` line.
- **AI.** Keep `AI_MOCK_MODE=True` for offline, deterministic output. To use a live model, set `OPENAI_API_KEY` and `AI_MOCK_MODE=False`.

Emails (invitations, password resets) are printed to the backend console unless `EMAIL_HOST` is set. In debug mode the password-reset page also shows the reset link directly.

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

Exports render inside the request in debug mode. To try the background worker locally, set `EXPORT_JOB_MODE=worker` and run this in another terminal:
```bash
python manage.py run_export_worker
```

### 3. Frontend (Next.js, port 3000)
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). The frontend calls the API at `NEXT_PUBLIC_API_URL`, which defaults to `http://127.0.0.1:8000`.

### 4. Automated tests

| Suite | Command (from the folder shown) | Notes |
| :--- | :--- | :--- |
| Backend unit/API tests: 209 tests, ~9 min | `backend`: `.\venv\Scripts\pytest` | Uses the database from `.env`. Uploads/exports go to a temp folder. AI features run in mock mode unless `AI_MOCK_MODE` is set; model calls are faked in tests. |
| Run one backend file | `backend`: `.\venv\Scripts\pytest tests/test_deployment_features.py` | Invitations, section scoping, export worker, AI model integration |
| Frontend component tests: 56 tests | `frontend`: `npm run test` | Vitest + Testing Library, API calls mocked |
| Type check | `frontend`: `npx tsc --noEmit` | Must report no errors |
| Production build | `frontend`: `npm run build` | Produces `.next/standalone` for the Docker image |
| End-to-end browser tests | `frontend`: `npx playwright install chromium` once, then `npm run test:e2e` | Backend **and** frontend must both be running on ports 8000 and 3000 |

`pytest.ini` uses `--reuse-db`. After changing models or migrations, run `pytest --create-db` once.

### 5. Manual testing
Automated tests use a fake AI model and a fake mailbox, so they can't prove the app works for a real user. Follow the [Real-World Testing Guide](#-real-world-testing-guide) below.

---

## ✅ Real-World Testing Guide

Work through the parts in order. Each step says what to do and what you should see. Note every step that does not match in a simple table (Step · Pass/Fail · Note), then see [When a step fails](#when-a-step-fails).

| Part | What it proves | Needs |
| :--- | :--- | :--- |
| A | Every main feature works in a browser | Python, Node.js |
| B | AI features give good answers with a real model | An OpenAI API key (costs a few cents) |
| C | Real emails arrive and their links work | An SMTP account (Mailtrap, Gmail, SendGrid, …) |
| D | The automated browser tests pass | Part A servers running |
| E | The production Docker stack runs | Docker Desktop |
| F | The live site is secure and working | A deployed server and domain |

### Part A — Local browser walkthrough

You need **two separate browser sessions** for two different accounts, for example a normal window and a private/incognito window. "Window 1" is the project owner; "Window 2" is a collaborator.

**A1. Start the app**
1. In `.env` set `DJANGO_DEBUG=True` and `AI_MOCK_MODE=True`. Comment out `DB_ENGINE` and the `POSTGRES_*` lines to use SQLite.
2. Start the backend and frontend as in [Running & Testing Locally](#-running--testing-locally) (steps 2 and 3).
3. Open [http://127.0.0.1:8000/api/v1/health/](http://127.0.0.1:8000/api/v1/health/) → you see `"status": "healthy"`.
4. Open [http://localhost:3000](http://localhost:3000) → the landing page loads.

Keep the backend terminal visible: emails are printed there.

**A2. Accounts and password reset** (Window 1)
1. Register as `owner@example.com` → you land on the dashboard.
2. Log out, then click **Forgot password?** on the login page and enter `owner@example.com`.
   - The backend terminal prints an email containing a `/reset-password?uid=…&token=…` link.
   - In debug mode the page also shows the link.
3. Open the link, set a new password → you see a success message.
4. Log in with the **new** password → it works. The old password is rejected.

**A3. Create a project** (Window 1)
1. Go to `/research/create` and complete all 5 wizard steps (any discipline).
2. You land on the project page, and the left panel lists chapters (Introduction, Methodology, …).

**A4. Writing and autosave**
1. Click a chapter and type a paragraph → the status changes to "Saving manuscript…" and then "All changes saved".
2. Reload the page → your text is still there.
3. Open **Versions** and take a snapshot → it appears in the version list.

**A5. AI writing assistant (mock mode)**
1. Select some text and run an AI action, for example "Improve writing" → a suggestion appears, clearly marked as mock output.
2. Reject it → your text is unchanged. Accept it → it is inserted.

**A6. Library and citations**
1. Go to `/library` and search for `mobile money savings` → results from OpenAlex/Crossref appear (needs internet).
2. Save a paper, attach it to your project, then insert a citation in a chapter → an in-text citation appears and the bibliography lists the paper.

**A7. Data and statistics**
1. Save this as `sample.csv`:
   ```
   id,group,score,age
   1,A,72,21
   2,A,68,22
   3,A,75,20
   4,A,70,23
   5,B,81,22
   6,B,85,21
   7,B,79,24
   8,B,83,22
   ```
2. In the project's **Datasets** tab, upload it → it shows 8 rows and 4 columns.
3. In the **Statistics** tab, run **Descriptive statistics** on `score` → mean 76.625.
4. Run an **Independent t-test** with `score` as the dependent variable and `group` as the group → a t-statistic, p-value and effect size appear, and p is below 0.05.

**A8. Invitations and roles** (Windows 1 and 2)
1. Window 1: on the project's **Collaborators** tab, click **Invite Collaborator**. Enter `coauthor@example.com`, choose **Co-Author**, tick only the **Methodology** chapter, and send.
   - The page confirms the invitation.
   - The backend terminal prints an email with a link to `/invitations/<token>`.
2. Window 2: open that link → you are asked to sign in or create an account.
3. Click **Create an account** and register as `coauthor@example.com`.
   - You come back to the invitation page, showing the project title, the role "Co-Author" and "1 assigned section".
4. Click **Accept invitation** → you are taken to the project.
5. Window 2: open **Methodology** and type → it saves.
6. Window 2: open **Introduction** → an amber notice says the section is read-only, and you cannot type.
7. Window 2: open the **Collaborators** tab → there are no invite or remove controls.
8. Window 1: change the co-author's role to **Viewer**. Then, in Window 2, reload → every chapter is read-only, but you can still read everything.
9. Window 1: invite `decline@example.com`. In a third session, register as that address, open the dashboard, click **Review** on the banner, then **Decline** → the invitation disappears from Window 1's pending list.
10. Window 2: paste a **different** person's invitation link → "This invitation could not be found" (links only work for the address they were sent to).

**A9. Supervisor review**
1. Window 1: invite `supervisor@example.com` as **Supervisor**, then accept it in a new session as in A8.
2. As the supervisor:
   - add an inline comment on a paragraph → it appears in the comments panel for both users
   - create a correction task in the **Corrections** tab → it appears in the tracker
   - try typing in a chapter → read-only
3. As the owner, apply the correction from the **Corrections** tab. Then, as the supervisor, **Approve** it → its status changes to approved.

**A10. Exports**
1. Window 1: open the **Export** workspace and export **DOCX**, then **PDF** → each finishes and appears in Export History.
2. Download both and open them in Word and a PDF reader → title page, table of contents, chapters and references are present.

**A11. Background export worker**
1. Stop the backend. Add `EXPORT_JOB_MODE=worker` to `.env` and start the backend again.
2. Start an export → it stays "queued" (the worker isn't running yet).
3. In a new terminal, in `backend` with the virtualenv active, run:
   ```bash
   python manage.py run_export_worker
   ```
   → the worker picks the job up and the export completes in the browser.
4. Stop the worker with Ctrl+C and remove `EXPORT_JOB_MODE` from `.env` again.

### Part B — Real AI model
1. In `.env` set `OPENAI_API_KEY=<your key>` and `AI_MOCK_MODE=False`, then restart the backend.
2. Re-run these with real content in the project (at least a few paragraphs, the CSV from A7 and 2–3 library papers):

   | Feature | Where | Check that the answer… |
   | :--- | :--- | :--- |
   | Writing assistant | Editor → AI panel | Is not marked "mock" and fits the selected text |
   | Literature intelligence | Literature panel → summarise / compare | Starts with "Evidence basis:" and mentions only the papers you selected |
   | Results interpretation | **Results** tab (after running the A7 analyses) | Repeats the exact numbers from A7 and does not call a correlation causal |
   | AI review assistant | **Review** tab → Execute AI Academic Review | Shows a written review, with the automated checks underneath |
   | Feedback analysis | **Feedback** tab → paste 2–3 supervisor comments → AI Correction Analysis | Creates tasks with sensible categories and chapter matches |

3. For every answer, check for **invented** authors, years, DOIs, statistics or quotes. Anything not in your project is a failure.
4. On an empty project, run the AI review → it still refuses ("insufficient written content") rather than inventing text.
5. Set a wrong `OPENAI_API_KEY` and restart:
   - the writing assistant shows a clear error
   - the other AI features still answer with their built-in template text

### Part C — Real email
1. Get SMTP credentials. A free [Mailtrap](https://mailtrap.io) sandbox catches emails safely; a Gmail account needs an *app password*.
2. In `.env` set:
   ```
   EMAIL_HOST=<smtp host>
   EMAIL_PORT=587
   EMAIL_HOST_USER=<user>
   EMAIL_HOST_PASSWORD=<password>
   EMAIL_USE_TLS=True
   DEFAULT_FROM_EMAIL=ScholarForge AI <you@yourdomain>
   FRONTEND_URL=http://localhost:3000
   EXPOSE_DEV_RESET_LINKS=False
   ```
   Then restart the backend.
3. Request a password reset → the email arrives in the inbox (not the terminal), and its link opens the reset page and works.
4. Invite a new address → the invitation email arrives, and its link opens `/invitations/<token>`.
5. Set a wrong `EMAIL_HOST_PASSWORD` and invite someone → the invitation is still created, and the page shows a link to share manually.

### Part D — Automated browser tests
With the Part A servers running in mock mode:
```bash
cd frontend
```
```bash
npx playwright install chromium
```
```bash
npm run test:e2e
```
All specs should pass. The tests register their own throwaway users.

### Part E — Production Docker stack on your computer
1. Start **Docker Desktop** and wait until it says "running". Stop the Part A servers.
2. Create the settings file:
   ```bash
   cp infrastructure/.env.example infrastructure/.env
   ```
   Set `DJANGO_SECRET_KEY` and `POSTGRES_PASSWORD` to long random values.
3. Build and start (the first build takes several minutes):
   ```bash
   cd infrastructure
   ```
   ```bash
   docker compose up --build -d
   ```
4. Check the services:
   ```bash
   docker compose ps -a
   ```
   → `migrate` shows *Exited (0)*, and `db`, `backend`, `worker`, `frontend` and `proxy` are *running*. `backend` becomes *healthy* after about 20 s.
5. Open [http://localhost](http://localhost) → the app loads. Note there is no `:3000`.
6. Create an admin account, then open [http://localhost/admin/](http://localhost/admin/) → the admin is styled, which means static files work:
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```
7. Repeat A2–A4, A8 (steps 1–6) and A10 at `http://localhost`. Watch the worker render exports:
   ```bash
   docker compose logs -f worker
   ```
8. Stop with `docker compose down`. Your data is kept. ⚠️ `docker compose down -v` **deletes** the database and uploaded files.

### Part F — Live server after deploying
After following [Deploying](#-deploying) on a real domain:
1. Open `http://app.example.com` → it redirects to `https://`, with a valid padlock.
2. Register, log in and reload the page → you stay logged in. If you are logged out on reload, the domain layout is wrong: see [Domain layout](#3-domain-layout).
3. Request a password reset and send an invitation → the email links start with `https://app.example.com`.
4. Run the security check inside the container → no errors. The `SECURE_HSTS_PRELOAD` warning is optional.
   ```bash
   docker compose exec backend python manage.py check --deploy
   ```
5. Repeat A8 and A10 on the live site with two real email addresses.
6. Restart the server, then confirm projects and exported files are still there (volumes persist).

### When a step fails
Write down the part and step number, then collect:
- **Browser:** open DevTools (F12). Copy errors from the **Console**, and the failing request and its response from the **Network** tab.
- **Backend:** the error printed in the backend terminal. With Docker, run `docker compose logs backend --tail 100` (or `worker` for exports).
- **What you expected** vs **what happened**.

That information is enough to reproduce and fix the problem.

---

## 🚧 What's Left To Be Done

All the deployment blockers and the four missing features from the 2026-11-10 review are now implemented (see [Recently completed](#recently-completed)). Remaining work:

### Not yet verified
Automated tests pass: 209 backend, 56 frontend, type check and production build. The following still need a person to try them; each one has a part in the [Real-World Testing Guide](#-real-world-testing-guide):
- **Browser walkthrough of every feature.** Part A.
- **Live AI output quality.** Model calls are only tested with a fake model. Part B.
- **Real email delivery.** Tests use a fake mailbox. Part C.
- **Playwright browser tests.** Not run since the latest changes. Part D.
- **Docker images.** Never built yet: Docker Desktop was not running. `docker compose config` validates and the Next.js standalone build succeeds. Part E.

### Operational hygiene
- No rate limiting on login, registration or AI endpoints (DRF throttling not configured).
- No error tracking (e.g. Sentry). Logs go to stdout only.
- No CI pipeline. Tests, type check and build only run manually.
- Uploads and exports live on a single Docker volume. Running backends on several servers needs object storage (`django-storages`).
- No automated database or media backups.
- Housekeeping:
  - `requirements.txt` mixes runtime and test dependencies.
  - `frontend/tsconfig.tsbuildinfo` is committed.
  - Line endings are mixed (add a `.gitattributes`).

### Recently completed
| Item | What changed |
| :--- | :--- |
| Frontend Docker image | Next.js `output: 'standalone'`, `frontend/public/`, `npm ci`, non-root user |
| Backend server | Gunicorn + WhiteNoise, `collectstatic` at build time, non-root user, health check |
| Security settings | `DEBUG` off by default. Secret key required in production. CORS/CSRF origins, secure cookies, HTTPS redirect, HSTS, SMTP and logging all come from environment variables. |
| API address | The browser calls the API on the **same origin**; Caddy routes `/api/`, `/admin/` and `/static/` to Django. No build-time URL is needed. |
| Email | Password-reset and invitation emails via SMTP (`EMAIL_*`). Reset tokens are no longer returned by the API outside debug mode. |
| Invitation page | `/invitations/<token>` to review, accept or decline. Pending invitations are listed on the dashboard. Login/registration return to the invitation afterwards. |
| AI features | Literature intelligence, results interpretation, the AI review assistant and feedback analysis use the configured model on the same evidence. They fall back to the deterministic output if the model is unavailable. |
| Section scoping | Collaborators limited to chapters can read everything but edit/comment only within those chapters. Whole-manuscript actions are blocked for them, and the editor shows out-of-scope sections as read-only. |
| Background exports | `EXPORT_JOB_MODE=worker` queues exports for `python manage.py run_export_worker`. Jobs are claimed atomically and stale jobs are failed automatically. |

---

## 🚀 Deploying

The production stack in `infrastructure/` runs six containers:

| Service | Role |
| :--- | :--- |
| `proxy` | Caddy: HTTPS (automatic certificates) and routing. The only service with published ports. |
| `frontend` | Next.js standalone server |
| `backend` | Django API on Gunicorn |
| `worker` | `run_export_worker`: renders DOCX/PDF exports |
| `migrate` | One-off: `migrate` + `seed_disciplines`, then exits |
| `db` | PostgreSQL 16 |

Data lives in Docker volumes: `pgdata` (database), `mediadata` (uploads and exports) and `caddy_data` (certificates).

### 1. Try it locally
Docker Desktop must be running.
```bash
cp infrastructure/.env.example infrastructure/.env
```
Edit `infrastructure/.env`: set `DJANGO_SECRET_KEY` and `POSTGRES_PASSWORD`. Then:
```bash
cd infrastructure
docker compose up --build -d
```
```bash
docker compose ps
```
Open [http://localhost](http://localhost). Create an admin account with:
```bash
docker compose exec backend python manage.py createsuperuser
```

### 2. Deploy to a server
1. Get a Linux server with Docker, and point a DNS record (e.g. `app.example.com`) at it.
2. Clone the repository and create `infrastructure/.env` from `infrastructure/.env.example`. Set:
   - `SITE_ADDRESS=app.example.com`
   - `PUBLIC_URL=https://app.example.com`
   - `DJANGO_ALLOWED_HOSTS=app.example.com,backend`
   - new random `DJANGO_SECRET_KEY` and `POSTGRES_PASSWORD`
   - `EMAIL_*` for your mail provider
   - `OPENAI_API_KEY` if you want live AI
3. Open ports 80 and 443, then run `docker compose up --build -d` in `infrastructure/`. Caddy obtains the TLS certificate on first start.
4. Create an admin account (command above) and work through [Part F of the testing guide](#part-f--live-server-after-deploying) on the live URL.

To update after pulling new code, run `docker compose up --build -d` again. The `migrate` service applies new migrations before the backend starts.

### 3. Domain layout
Login uses `SameSite=Lax` session and CSRF cookies, so the app and API must be **same-site**. The bundled Caddy proxy puts both on one origin, which is the simplest option. To host the API elsewhere, use a sibling subdomain (e.g. `api.example.com` next to `app.example.com`). Build the frontend with `NEXT_PUBLIC_API_URL=https://api.example.com` and list the app origin in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`. Unrelated domains (e.g. `*.vercel.app` + `*.onrender.com`) break login.

### 4. Before every release
Run these, ideally in CI on every push:
```bash
cd backend && pytest
```
```bash
cd frontend && npm ci && npx tsc --noEmit && npm run test && npm run build
```
```bash
cd backend && python manage.py makemigrations --check --dry-run
```
Run `python manage.py check --deploy` with your production environment variables and resolve any warnings.

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

