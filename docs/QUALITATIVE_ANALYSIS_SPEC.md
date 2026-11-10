# Qualitative Analysis Engine Specification

## 1. Overview & Architectural Safeguards

The ScholarForge AI **Qualitative Analysis Engine** provides a secure, grounded workspace for analyzing textual data from interviews, focus group discussions, and field observation notes.

> [!IMPORTANT]
> **Strict Anti-Fabrication Safeguard**: Under no circumstances does the system fabricate participant quotes, statements, or pseudonyms. All qualitative evidence must be grounded in authentic verbatim transcripts uploaded to the project.

---

## 2. Ingestion & Preprocessing

- **Supported Qualitative Formats**: Semi-structured interviews, focus group discussions, field observation notes, archival records, narrative journals.
- **Participant Anonymization**: Tracks formal pseudonyms (e.g., `Participant P1`, `Teacher B`, `Branch Manager 4`) to preserve research confidentiality while maintaining participant integrity.
- **Text Normalization**: Performs non-destructive whitespace and character indexing without altering original participant wording or dialect.
- **Metrics Computation**: Tracks exact character count, word count, and passage segmentation.

---

## 3. Verbatim Excerpt Verification Algorithm

When a researcher highlights a passage and tags it with a qualitative code, the system validates the excerpt before persisting:

```python
def tag_excerpt(transcript: QualitativeTranscript, code: QualitativeCode, start_char: int, end_char: int, quote_text: str, memo: str = None) -> EvidenceExcerpt:
    # 1. Bounds verification
    if start_char < 0 or end_char > len(transcript.content) or start_char >= end_char:
        raise ValidationError("Character offsets are out of bounds.")
    
    # 2. Verbatim string matching
    underlying_slice = transcript.content[start_char:end_char]
    if underlying_slice != quote_text:
        # Check normalized whitespace fallback
        if underlying_slice.strip() != quote_text.strip():
            raise ValidationError("Quote text does not match the underlying transcript at the specified character positions.")
            
    # 3. Create verified excerpt
    return EvidenceExcerpt.objects.create(
        transcript=transcript,
        code=code,
        start_char=start_char,
        end_char=end_char,
        quote_text=underlying_slice,
        researcher_memo=memo,
        is_verified_verbatim=True
    )
```

This cryptographic-style character matching guarantees that every excerpt cited in the thesis or journal article corresponds 100% to authentic participant utterances.

---

## 4. Codebook Management & Inductive AI Suggestions

- **Codebook Structure**: Hierarchical and flat codes with name, operational definition, color styling, category, and real-time excerpt count.
- **Inductive Candidate Code Assistant**:
  - The AI assistant analyzes the transcript to identify emerging patterns and recurrent ideas.
  - It generates **Candidate Codes** with suggested names and analytical rationales.
  - **Researcher Approval Gate**: Candidate codes are never automatically applied to the manuscript. The researcher must review and explicitly click "Accept Code" to adopt them into the project codebook.

---

## 5. Thematic Synthesis & Section Insertion

- **Theme Formation**: Allows clustering related codes into overarching qualitative themes.
- **Narrative Synthesis**: Documents the thematic hierarchy with an analytical summary explaining the phenomenon.
- **Manuscript Integration**: Clicking "Insert Themes into Manuscript" generates a clean academic qualitative findings section embedding verified participant quotes with line references and pseudonyms directly into the active editor section.

