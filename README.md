# ScholarForge AI

> **Your intelligent research workspace.**

ScholarForge AI is a multidisciplinary AI-powered academic research and writing SaaS platform built for undergraduate students, master's candidates, PhD researchers, faculty, and academic professionals worldwide.

---

## 🏛️ Stage 1 Scope & Architecture

Stage 1 delivers the production-ready SaaS application foundation:
- **Design System:** Deep navy (`#0B192C`), crisp white backgrounds, and subtle academic gold (`#F59E0B`) accents.
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, responsive components, Lucide icons.
- **Backend:** Python 3.12, Django 5.1, Django REST Framework.
- **Database:** PostgreSQL 16 (relational schema with UUIDs, 14 domain models, row-level ownership isolation).
- **Security:** HttpOnly cookie sessions, CSRF token validation, zero token storage in browser `localStorage`.
- **Multidisciplinary Support:** Pre-seeded with 21 academic disciplines across STEM, Health, Social Sciences, Business, Law, Humanities, and Agriculture.
- **5-Step Setup Wizard:** Guided configuration from Document Category down to Citation Style and Methodology.
- **Dedicated Workspaces:** Dynamic chapter outline generation without rigid 5-chapter constraints.

*(Note: AI Writing and Payment Gateways are reserved for Stage 2).*

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
│   ├── projects/                 # ResearchProject & ResearchRequirements
│   ├── documents/                # ResearchDocument, DocumentSection, DocumentVersion
│   ├── research/                 # ResearchSource, ProjectSource, Citation, AIJob
│   ├── tests/                    # Pytest backend test suite
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

## 🚀 Running Locally on Windows 11 with Docker Desktop

### Prerequisites
1. Windows 11 with WSL2 enabled.
2. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) installed and running.
3. Git.

### Step-by-Step Instructions

1. **Clone and Navigate to Project:**
   ```bash
   cd scholarforge-ai
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```

3. **Launch Docker Services:**
   ```bash
   cd infrastructure
   docker compose up --build -d
   ```

4. **Verify Running Containers:**
   ```bash
   docker compose ps
   ```
   You will see:
   - `scholarforge-db` (Port 5432 - Healthy)
   - `scholarforge-backend` (Port 8000)
   - `scholarforge-frontend` (Port 3000)

5. **Access Application:**
   - **Frontend SaaS Web Application:** [http://localhost:3000](http://localhost:3000)
   - **Backend REST API:** [http://localhost:8000/api/v1/health/](http://localhost:8000/api/v1/health/)
   - **Django Administration:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

## 💻 Running Locally Without Docker (Direct Host)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_disciplines
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & Verification

### Run Backend Pytest Suite (17 tests)
```bash
cd backend
.\venv\Scripts\pytest -v
```

### Run Frontend Vitest Suite (6 tests)
```bash
cd frontend
npm run test
```

### Run Playwright E2E Browser Tests
```bash
cd frontend
npx playwright test
```

### TypeScript Validation & Production Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📄 Documentation Links
- [Architecture Overview](docs/ARCHITECTURE.md)
- [PostgreSQL Database Schema](docs/DATABASE_SCHEMA.md)
- [REST API Documentation](docs/API_DOCUMENTATION.md)
- [Stage 1 Full Validation Report](STAGE1_VALIDATION.md)
