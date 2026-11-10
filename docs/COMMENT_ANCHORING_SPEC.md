# ScholarForge AI: Context-Anchored Commenting & Orphan Heuristics Specification

## 1. Context-Anchored Annotations

When a researcher or supervisor highlights text in the Tiptap editor and creates a `ManuscriptComment`, the system captures a 5-tuple anchor:

1. `anchor_text`: The exact highlighted character sequence.
2. `anchor_prefix`: 30 characters immediately preceding the selection.
3. `anchor_suffix`: 30 characters immediately following the selection.
4. `start_offset`: Zero-indexed character position in document section text.
5. `end_offset`: Ending character position in document section text.

---

## 2. Dynamic Relocation Algorithm (Three-Pass Heuristic)

When subsequent revisions alter the underlying section text, `CommentService.recalculate_anchors` executes a three-pass relocation heuristic:

### Pass 1: Exact Index Match
Checks if `text[start_offset:end_offset] == anchor_text`. If true, the anchor remains untouched.

### Pass 2: Trigram Context Search
If the text at the original offsets has shifted due to insertions or deletions elsewhere in the document:
- Searches for `anchor_prefix + anchor_text + anchor_suffix` within `±500` characters.
- If found, updates `start_offset` and `end_offset` to the new coordinates without marking the comment as orphaned.

### Pass 3: Fuzzy Approximate Match (`difflib.SequenceMatcher`)
- If the exact prefix/suffix sequence cannot be found, scans candidate windows of length `len(anchor_text)` across the section.
- If similarity score $\ge 0.85$, re-anchors to the highest-scoring candidate window.
- If similarity score $< 0.85$, marks `is_orphaned = True` and sets `status = 'ORPHANED'`.

---

## 3. Orphan Lifecycle

- **Non-Destructive Persistence:** Orphaned comments are never deleted. They remain in the manuscript comments panel under the `ORPHANED` filter tab.
- **Relocation Action:** The researcher or supervisor can click "Re-anchor Comment" to manually associate the feedback with a newly drafted passage or mark it resolved.

