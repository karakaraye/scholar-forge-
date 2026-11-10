# ScholarForge AI: Revision Management & Journal Review Workflows Specification

## 1. Correction Task Lifecycle (8 States)

Each revision item is tracked as a `CorrectionTask` (`backend/research/models.py`) transitioning across eight distinct states:

```
[ OPEN ] --------> [ IN_PROGRESS ] --------> [ PROPOSED ] --------> [ READY_FOR_REVIEW ]
   |                                                                         |
   |                                                                +--------+--------+
   |                                                                |                 |
   v                                                                v                 v
[ REOPENED ] <------------------------------------------------- [ REJECTED ]    [ APPROVED ]
   ^                                                                                  |
   |                                                                                  v
   +---------------------------------------------------------------------------- [ RESOLVED ]
```

- **`OPEN`:** Extracted task awaiting researcher attention.
- **`IN_PROGRESS`:** Researcher actively formulating or revising manuscript text.
- **`PROPOSED`:** Text drafted with optimistic concurrency baseline tracking.
- **`READY_FOR_REVIEW`:** Submitted to supervisor or co-author for sign-off.
- **`APPROVED`:** Explicit supervisor sign-off granted.
- **`REJECTED`:** Returned with supervisor critique notes.
- **`RESOLVED`:** Changes integrated into manuscript checkpoint version.
- **`REOPENED`:** Further modifications required upon subsequent reading.

---

## 2. Optimistic Concurrency Control

To guarantee multi-author data integrity and prevent race conditions:

1. When a task is generated, it records `expected_base_version = document.current_version_number`.
2. Upon `apply_correction_task`, if `document.current_version_number > expected_base_version` and `force_override=False`:
   - The operation fails with `409 Conflict: StaleBaseVersionConflict`.
   - The response provides the latest document snapshot, prompting the author to review recent diffs before re-applying.

---

## 3. Journal Reviewer Point-by-Point Matrix

The `JournalReviewService` transforms ad-hoc peer review into a structured response matrix:

- **Reviewer Identifiers:** Reviewer 1, Reviewer 2, Reviewer 3, Associate Editor, Editor-in-Chief.
- **Classification:** Major Revision, Minor Revision, Clarification, Rebuttal/Reject Request.
- **Verified Applied Status:** A point cannot be marked as verified applied unless:
  - A linked `CorrectionTask` has reached `APPROVED` status, OR
  - An evidence-backed author rebuttal is explicitly formulated.
- **Export Synthesis:** Compiles a publication-ready markdown response document incorporating full comment quoting, page/line coordinates, author rationale, and inline manuscript diff excerpts.

