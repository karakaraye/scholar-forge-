"""
ScholarForge AI - Citation Management Engine
CSL-compatible academic citation formatting supporting APA 7th, MLA 9th, Chicago 17th,
Harvard, IEEE, and Vancouver across in-text (parenthetical, narrative, multiple) and
full bibliography reference generation without fabricating missing fields.
"""

import re
from typing import List, Dict, Any, Optional
from research.models import ResearchSource, Citation


def format_author_name_initials(full_name: str) -> str:
    """
    Converts 'Vaswani, Ashish' or 'Ashish Vaswani' to 'Vaswani, A.'
    """
    if not full_name:
        return "Unknown"
    cleaned = full_name.strip()
    if "," in cleaned:
        parts = cleaned.split(",")
        surname = parts[0].strip()
        givens = parts[1].strip().split()
        initials = "".join([f"{g[0]}." for g in givens if g])
        return f"{surname}, {initials}" if initials else surname
    else:
        parts = cleaned.split()
        if len(parts) > 1:
            surname = parts[-1]
            initials = "".join([f"{p[0]}." for p in parts[:-1] if p])
            return f"{surname}, {initials}"
        return cleaned


def format_author_in_text(authors: List[str], style: str = "APA") -> str:
    """
    Formats author list for in-text citation (e.g. 'Vaswani et al.' or 'Vaswani & Shazeer').
    """
    if not authors:
        return "Anonymous"

    def get_surname(name_str: str) -> str:
        if "," in name_str:
            return name_str.split(",")[0].strip()
        parts = name_str.split()
        return parts[-1].strip() if parts else name_str

    surnames = [get_surname(a) for a in authors if a]
    n = len(surnames)

    if n == 0:
        return "Anonymous"
    if n == 1:
        return surnames[0]
    if n == 2:
        sep = "&" if style in ("APA", "HARVARD") else "and"
        return f"{surnames[0]} {sep} {surnames[1]}"
    # 3 or more authors -> et al.
    return f"{surnames[0]} et al."


class CitationService:
    """
    Provides multi-style CSL citation formatting and automatic bibliography generation.
    """

    @classmethod
    def format_in_text_citation(
        cls,
        source: ResearchSource,
        style: str = "APA",
        format_type: str = "parenthetical",  # 'parenthetical' or 'narrative'
        numeric_index: Optional[int] = 1,
        page_num: Optional[str] = ""
    ) -> str:
        """
        Formats an in-text citation string for a single source.
        """
        style_norm = style.upper()
        author_text = format_author_in_text(source.authors, style=style_norm)
        year_text = str(source.publication_year) if source.publication_year else "n.d."
        page_suffix = f", p. {page_num}" if page_num else ""

        # Numbered styles (IEEE, Vancouver)
        if style_norm in ("IEEE", "VANCOUVER"):
            idx = numeric_index or 1
            if style_norm == "IEEE":
                return f"[{idx}]"
            return f"({idx})"

        # MLA (Author Page)
        if style_norm == "MLA":
            pg = f" {page_num}" if page_num else ""
            if format_type == "narrative":
                return f"{author_text} ({page_num})" if page_num else author_text
            return f"({author_text}{pg})"

        # Author-Date styles: APA, Harvard, Chicago
        if format_type == "narrative":
            return f"{author_text} ({year_text}{page_suffix})"
        return f"({author_text}, {year_text}{page_suffix})"

    @classmethod
    def format_multiple_in_text_citations(
        cls,
        sources: List[ResearchSource],
        style: str = "APA",
        numeric_indices: Optional[Dict[str, int]] = None
    ) -> str:
        """
        Formats a multiple-source in-text citation, e.g. '(He et al., 2016; Vaswani et al., 2017)' or '[1, 2]'.
        """
        style_norm = style.upper()
        if not sources:
            return ""

        if style_norm == "IEEE":
            indices = []
            for s in sources:
                idx = (numeric_indices or {}).get(str(s.id), 1)
                indices.append(str(idx))
            return f"[{', '.join(indices)}]"

        if style_norm == "VANCOUVER":
            indices = [(numeric_indices or {}).get(str(s.id), 1) for s in sources]
            return f"({', '.join(str(i) for i in indices)})"

        # Alphabetize author-date sources
        sorted_sources = sorted(sources, key=lambda s: (s.authors[0] if s.authors else "", s.publication_year or 0))
        entries = []
        for s in sorted_sources:
            author_text = format_author_in_text(s.authors, style=style_norm)
            year_text = str(s.publication_year) if s.publication_year else "n.d."
            entries.append(f"{author_text}, {year_text}")

        return f"({'; '.join(entries)})"

    @classmethod
    def format_bibliography_entry(
        cls,
        source: ResearchSource,
        style: str = "APA",
        numeric_index: Optional[int] = 1
    ) -> str:
        """
        Formats full reference list entry according to active citation style.
        """
        style_norm = style.upper()
        title = source.title.strip() if source.title else "Untitled Work"
        venue = source.journal_or_publisher.strip() if source.journal_or_publisher else ""
        year = str(source.publication_year) if source.publication_year else "n.d."
        doi_url = f"https://doi.org/{source.doi}" if source.doi else source.url

        # Format authors with initials
        initial_authors = [format_author_name_initials(a) for a in source.authors] if source.authors else ["Anonymous"]

        if style_norm == "APA":
            # APA 7th: Authors (Year). Title. Venue. DOI
            if len(initial_authors) > 1:
                authors_str = ", ".join(initial_authors[:-1]) + ", & " + initial_authors[-1]
            else:
                authors_str = initial_authors[0]
            doi_part = f" {doi_url}" if doi_url else ""
            venue_part = f" *{venue}*." if venue else ""
            return f"{authors_str} ({year}). {title}.{venue_part}{doi_part}".strip()

        elif style_norm == "MLA":
            # MLA 9th: Author. "Title." Venue, Year, DOI.
            first_author = initial_authors[0]
            author_str = f"{first_author}, et al." if len(initial_authors) > 2 else ", and ".join(initial_authors)
            venue_part = f" *{venue}*," if venue else ""
            doi_part = f" {doi_url}." if doi_url else "."
            return f"{author_str}. \"{title}.\"{venue_part} {year}{doi_part}".strip()

        elif style_norm == "IEEE":
            # IEEE: [1] A. Author and B. Author, "Title," Venue, Year.
            idx = numeric_index or 1
            if len(initial_authors) > 2:
                authors_str = f"{initial_authors[0]} et al."
            else:
                authors_str = " and ".join(initial_authors)
            venue_part = f", in *{venue}*" if venue else ""
            doi_part = f", doi: {source.doi}" if source.doi else ""
            return f"[{idx}] {authors_str}, \"{title}\"{venue_part}, {year}{doi_part}.".strip()

        elif style_norm == "VANCOUVER":
            # Vancouver: 1. Author. Title. Venue. Year;
            idx = numeric_index or 1
            authors_str = ", ".join(initial_authors[:6])
            if len(initial_authors) > 6:
                authors_str += ", et al."
            venue_part = f" {venue}." if venue else ""
            return f"{idx}. {authors_str}. {title}.{venue_part} {year}.".strip()

        elif style_norm == "HARVARD":
            # Harvard: Author (Year) 'Title', Venue.
            authors_str = initial_authors[0] + " et al." if len(initial_authors) > 2 else " & ".join(initial_authors)
            venue_part = f", *{venue}*" if venue else ""
            doi_part = f". Available at: {doi_url}" if doi_url else ""
            return f"{authors_str} ({year}) '{title}'{venue_part}{doi_part}.".strip()

        # Default / Chicago Author-Date
        authors_str = ", ".join(initial_authors)
        venue_part = f" *{venue}*." if venue else ""
        doi_part = f" {doi_url}" if doi_url else ""
        return f"{authors_str}. {year}. \"{title}.\"{venue_part}{doi_part}".strip()

    @classmethod
    def format_full_bibliography(
        cls,
        sources: List[ResearchSource],
        style: str = "APA"
    ) -> List[str]:
        """
        Formats a list of sources into formatted reference bibliography strings.
        """
        citation_style = (style or "APA").upper()
        if citation_style in ("IEEE", "VANCOUVER"):
            sorted_sources = sources
        else:
            sorted_sources = sorted(
                sources,
                key=lambda s: (s.authors[0].lower() if s.authors else s.title.lower(), s.publication_year or 0)
            )
        return [
            cls.format_bibliography_entry(s, style=citation_style, numeric_index=idx)
            for idx, s in enumerate(sorted_sources, start=1)
        ]

    @classmethod
    def generate_project_bibliography(
        cls,
        project,
        style: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates full formatted reference list for all sources attached to a project.
        Ordered alphabetically (for APA/MLA/Harvard) or numerically (for IEEE/Vancouver).
        """
        citation_style = (style or project.citation_style or "APA").upper()
        project_sources = list(
            project.project_sources.select_related("source").all()
        )
        sources = [ps.source for ps in project_sources]

        # Order sources
        if citation_style in ("IEEE", "VANCOUVER"):
            # Numerical ordering
            sorted_sources = sources
        else:
            # Alphabetical by first author surname
            sorted_sources = sorted(
                sources,
                key=lambda s: (s.authors[0].lower() if s.authors else s.title.lower(), s.publication_year or 0)
            )

        entries = []
        for idx, source in enumerate(sorted_sources, start=1):
            formatted_entry = cls.format_bibliography_entry(
                source=source,
                style=citation_style,
                numeric_index=idx
            )
            in_text_paren = cls.format_in_text_citation(
                source=source,
                style=citation_style,
                format_type="parenthetical",
                numeric_index=idx
            )
            in_text_narr = cls.format_in_text_citation(
                source=source,
                style=citation_style,
                format_type="narrative",
                numeric_index=idx
            )

            # Persist or update Citation record
            Citation.objects.update_or_create(
                project=project,
                source=source,
                defaults={
                    "citation_style": citation_style,
                    "in_text_format": in_text_paren,
                    "in_text_narrative": in_text_narr,
                    "citation_number": idx,
                    "full_reference": formatted_entry
                }
            )

            entries.append({
                "source_id": str(source.id),
                "title": source.title,
                "citation_number": idx,
                "in_text_parenthetical": in_text_paren,
                "in_text_narrative": in_text_narr,
                "full_reference": formatted_entry,
                "verification_status": source.verification_status,
                "retracted": source.retracted
            })

        return entries

    @classmethod
    def scan_manuscript_citations(cls, manuscript_html: str) -> List[str]:
        """
        Scans manuscript text/HTML and extracts all referenced source UUIDs
        from citation spans: <span class="csl-citation" data-source-id="UUID"...>
        """
        # Match data-source-id="UUID"
        uuid_matches = re.findall(
            r'data-source-id=["\']([0-9a-fA-F-]{36})["\']',
            manuscript_html
        )
        # Deduplicate while preserving order of first appearance
        seen = set()
        ordered_uuids = []
        for u in uuid_matches:
            if u not in seen:
                seen.add(u)
                ordered_uuids.append(u)
        return ordered_uuids

