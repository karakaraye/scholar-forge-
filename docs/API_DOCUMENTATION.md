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
