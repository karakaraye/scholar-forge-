# ScholarForge AI: Academic Collaboration & Isolation Architecture

## Overview

Stage 6 introduces isolated academic team collaboration directly bounded to individual research projects (`ResearchProject`). Unlike workspace-wide membership models that risk accidental cross-project information leakage, ScholarForge AI implements a granular, per-project collaboration framework.

---

## 1. Role-Based Access Control (RBAC) Matrix

The platform enforces five isolated academic roles defined in `CollaboratorRole`:

| Role | Read Manuscript | Inline Comments | Propose Changes | Approve / Reject Revisions | Project Admin & Team Management |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`PROJECT_OWNER`** | Full | Full | Full | Yes | Full (Invite, Revoke, Transfer) |
| **`SUPERVISOR`** | Full | Full | Review / Direct | Yes (Approves Revisions) | None (Advisory only) |
| **`CO_AUTHOR`** | Full | Full | Direct Edit | No (Owner/Supervisor sign-off) | None |
| **`ACADEMIC_REVIEWER`** | Assigned / Full | Full | Suggest Only | No | None |
| **`VIEWER`** | Read-Only | Read-Only | None | No | None |

### Section-Level Scoping
Collaborators (`ProjectCollaborator`) can optionally be restricted to specific chapters/sections via the `assigned_sections` list (e.g. `["Chapter 3: Methodology", "Chapter 4: Results"]`). This allows external methodologists or statisticians to collaborate strictly within their assigned disciplinary domain.

---

## 2. Secure Invitation System

To ensure academic data integrity and prevent unauthorized project enumeration:

```
[ Researcher ] --(POST /collaborators/invite/)--> [ Generate secure token via secrets.token_urlsafe(32) ]
                                                                 |
                                                  [ Store ProjectInvitation (expires_at: +7d) ]
                                                                 |
[ Invitee ] <--(Secure Acceptance Link: /invitations/<token>/accept/)--+
                                                                 |
                                              [ Atomically create ProjectCollaborator ]
                                                                 |
                                              [ Invalidate token & Log CollaborationAuditEvent ]
```

- **Cryptographic Tokens:** Uses `secrets.token_urlsafe(32)`, providing 256 bits of entropy.
- **Expiration Enforcement:** Invitations default to 7-day expiration (`expires_at`), verified on acceptance.
- **Zero Enumeration:** Failed token lookups return uniform `404 Not Found` responses to prevent token existence probes.
- **Audit Logging:** Every state change (invitation dispatched, accepted, rejected, revoked, role updated) creates an immutable `CollaborationAuditEvent` record with actor, timestamp, and metadata diff.

---

## 3. Django Permissions & Authorization Stack

All role logic lives in one module, `backend/projects/access.py`. It resolves a user's **capabilities** on a project from three sources (project owner, active `ProjectCollaborator` role, `WorkspaceMembership` role) and every project-scoped endpoint checks against it.

| Capability | Grants | Held by |
| :--- | :--- | :--- |
| `VIEW` | Read project, manuscript, data, results, exports | Everyone with access |
| `COMMENT` | Comments/replies, feedback ingestion, correction tasks, audits, AI review, export generation | Owner, `PROJECT_OWNER`, `SUPERVISOR`, `CO_AUTHOR`, `ACADEMIC_REVIEWER`; workspace `OWNER`/`ADMIN`/`COLLABORATOR` |
| `EDIT` | Change manuscript content and research data, AI writing | Owner, `PROJECT_OWNER`, `CO_AUTHOR`; workspace `OWNER`/`ADMIN`/`COLLABORATOR` |
| `APPROVE` | Correction review, plan approval, `APPROVED`/`REVISIONS_REQUIRED` sign-offs | Owner, `PROJECT_OWNER`, `SUPERVISOR`; workspace `OWNER`/`ADMIN` |
| `MANAGE` | Invite/remove collaborators, change roles, archive/delete project | Owner, `PROJECT_OWNER`; workspace `OWNER`/`ADMIN` |

`VIEWER` collaborators and workspace `VIEWER` members hold `VIEW` only.

DRF integration (`backend/projects/permissions.py`, `backend/documents/permissions.py`):

- **`IsProjectOwnerOrWorkspaceMember`** / **`CanEditProjectManuscript`** / document & section permissions: safe methods require `VIEW`, unsafe methods require `EDIT`. A view lowers or raises the requirement per method with `project_capabilities = {'POST': COMMENT}`.
- **`IsProjectSupervisorOrOwner`:** requires `APPROVE`.
- Endpoints addressed by a child object's primary key (instruments, datasets, comments, exports, …) call `require_project_access(user, obj.project, CAPABILITY)` explicitly.
- Project listings use `accessible_projects_q(user)` so accepted collaborators see shared projects.

`assigned_sections` scoping is stored but not yet enforced by the policy.

