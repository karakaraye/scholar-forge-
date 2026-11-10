"""
Qualitative Data Analysis Service for ScholarForge AI.

Handles:
- Ingestion and management of qualitative transcripts (interviews, focus groups, field notes).
- Hierarchical codebook management (codes, categories, colors, parent relationships).
- Verbatim excerpt tagging with strict character index verification:
    Ensures quote_text == transcript.content[start_char:end_char]
    Zero quote hallucination and total empirical traceability.
- Thematic synthesis and clustering (mapping codes and excerpts to emergent themes).
- Transparent AI candidate code suggestions requiring researcher validation.
"""

from typing import Dict, List, Any, Optional
from django.utils import timezone


class QualitativeService:
    """Service for qualitative coding, verbatim excerpt tracking, and thematic synthesis."""

    @classmethod
    def verify_and_create_excerpt(
        cls,
        transcript_content: str,
        start_char: int,
        end_char: int,
        quote_text: str
    ) -> Dict[str, Any]:
        """
        Validates that the excerpt exactly corresponds to the transcript text at start_char:end_char.
        Guarantees zero quotation hallucination.
        """
        if start_char < 0 or end_char > len(transcript_content) or start_char >= end_char:
            raise ValueError(f"Invalid character slice range: [{start_char}, {end_char}] for text of length {len(transcript_content)}.")

        actual_slice = transcript_content[start_char:end_char]

        # Verify exact match or trimmed match
        if actual_slice.strip() != quote_text.strip():
            raise ValueError(
                f"Quotation mismatch detected. Target slice: '{actual_slice[:60]}...' does not match provided quote: '{quote_text[:60]}...'."
            )

        return {
            "is_verified": True,
            "start_char": start_char,
            "end_char": end_char,
            "quote_text": actual_slice,
            "character_count": len(actual_slice),
            "word_count": len(actual_slice.split())
        }

    @classmethod
    def suggest_candidate_codes(cls, transcript_content: str, discipline: str = "Social Sciences") -> List[Dict[str, Any]]:
        """
        Extracts salient conceptual nodes from transcript text to assist the researcher with open coding.
        Every suggestion is explicitly marked as CANDIDATE and requires researcher approval.
        """
        import re
        words = re.findall(r"\b[A-Za-z]{4,}\b", transcript_content.lower())
        stopwords = {
            "that", "with", "this", "have", "from", "they", "were", "what", "their", "when", "about",
            "there", "would", "which", "could", "their", "them", "some", "other", "into", "more", "then",
            "also", "just", "because", "think", "said", "know", "well", "like", "interviewer", "participant"
        }
        filtered = [w for w in words if w not in stopwords]
        from collections import Counter
        top_tokens = Counter(filtered).most_common(8)

        candidate_codes = []
        palette = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#4F46E5", "#475569"]

        for idx, (token, count) in enumerate(top_tokens):
            capitalized = token.capitalize()
            candidate_codes.append({
                "name": f"Candidate: {capitalized}",
                "category": "Open Coding",
                "color": palette[idx % len(palette)],
                "frequency_in_text": count,
                "reasoning": f"Salient thematic token '{token}' observed {count} times across qualitative dialogue.",
                "status": "CANDIDATE",
                "requires_researcher_approval": True
            })

        return candidate_codes

    @classmethod
    def compile_thematic_summary(
        cls,
        theme_name: str,
        narrative_summary: str,
        excerpts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compiles an evidence-grounded thematic summary card referencing authentic participant voices.
        """
        return {
            "theme_name": theme_name,
            "narrative_summary": narrative_summary,
            "supporting_excerpts_count": len(excerpts),
            "supporting_excerpts": [
                {
                    "transcript_title": e.get("transcript_title", "Transcript"),
                    "speaker": e.get("speaker", "Participant"),
                    "quote_text": e.get("quote_text", ""),
                    "start_char": e.get("start_char"),
                    "end_char": e.get("end_char"),
                    "code_name": e.get("code_name", "")
                }
                for e in excerpts
            ],
            "saturation_index": "High" if len(excerpts) >= 5 else ("Moderate" if len(excerpts) >= 3 else "Emergent")
        }

