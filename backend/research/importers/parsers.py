"""
ScholarForge AI - Metadata Importers
Parses BibTeX, RIS, and resolves DOIs into standardized ResearchSource dictionaries.
"""

import re
from typing import List, Dict, Any, Optional
from research.discovery_service import normalize_doi, CrossrefAdapter, OpenAlexAdapter, MOCK_ACADEMIC_PUBLICATIONS


def parse_bibtex(bibtex_content: str) -> List[Dict[str, Any]]:
    """
    Parses one or more BibTeX entries into a list of normalized source dictionaries.
    Handles @article, @book, @inproceedings, @techreport, @phdthesis, @misc.
    """
    results: List[Dict[str, Any]] = []
    # Match entry pattern: @type{key, ...}
    entries = re.findall(r"@(\w+)\s*\{\s*([^,]+),([^@]*)\}", bibtex_content, re.DOTALL)

    for entry_type, cite_key, fields_block in entries:
        fields: Dict[str, str] = {}
        # Match key = {value} or key = "value" or key = value
        field_matches = re.findall(
            r'(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|([^\s,}]+))',
            fields_block,
            re.DOTALL
        )
        for k, v1, v2, v3 in field_matches:
            val = (v1 or v2 or v3 or "").strip()
            fields[k.lower()] = re.sub(r"\s+", " ", val)

        title = fields.get("title", "").strip("{}")
        if not title:
            continue

        # Authors
        authors_raw = fields.get("author", "")
        authors = []
        if authors_raw:
            parts = authors_raw.split(" and ")
            for p in parts:
                cleaned_author = p.strip("{} ").strip()
                if cleaned_author:
                    authors.append(cleaned_author)

        # Year
        year_str = fields.get("year", "")
        year = None
        if year_str:
            year_match = re.search(r"\b(19|20)\d{2}\b", year_str)
            if year_match:
                year = int(year_match.group(0))

        # Venue / Publisher
        venue = (
            fields.get("journal")
            or fields.get("booktitle")
            or fields.get("publisher")
            or fields.get("institution")
            or fields.get("school")
            or ""
        ).strip("{}")

        # Source type mapping
        etype = entry_type.lower()
        if etype in ("inproceedings", "conference"):
            source_type = "CONFERENCE"
        elif etype in ("book", "monograph"):
            source_type = "BOOK"
        elif etype in ("phdthesis", "mastersthesis", "thesis"):
            source_type = "THESIS"
        elif etype in ("techreport", "report"):
            source_type = "REPORT"
        else:
            source_type = "JOURNAL"

        doi = normalize_doi(fields.get("doi"))
        url = fields.get("url") or (f"https://doi.org/{doi}" if doi else "")
        abstract = fields.get("abstract", "").strip("{}")

        results.append({
            "title": title,
            "authors": authors,
            "publication_year": year,
            "source_type": source_type,
            "journal_or_publisher": venue,
            "doi": doi,
            "url": url,
            "abstract": abstract,
            "provenance": ["BibTeX Import"],
            "bibtex": f"@{entry_type}{{{cite_key},{fields_block}}}"
        })

    return results


def parse_ris(ris_content: str) -> List[Dict[str, Any]]:
    """
    Parses RIS (Research Information Systems) citation format into normalized source dictionaries.
    """
    results: List[Dict[str, Any]] = []
    # Records delimited by ER  -
    records = re.split(r"(?:^|\n)ER\s*-\s*", ris_content.strip())

    for record in records:
        if not record.strip():
            continue

        lines = [l.strip() for l in record.strip().splitlines() if l.strip()]
        fields: Dict[str, List[str]] = {}

        current_tag = None
        for line in lines:
            tag_match = re.match(r"^([A-Z0-9]{2})\s*-\s*(.*)$", line)
            if tag_match:
                current_tag = tag_match.group(1).upper()
                val = tag_match.group(2).strip()
                if current_tag not in fields:
                    fields[current_tag] = []
                fields[current_tag].append(val)
            elif current_tag and line.startswith("   "):
                # Continuation line
                fields[current_tag][-1] += " " + line.strip()

        # Title
        titles = fields.get("TI", []) or fields.get("T1", []) or fields.get("BT", [])
        title = titles[0] if titles else ""
        if not title:
            continue

        # Authors
        authors = fields.get("AU", []) or fields.get("A1", []) or []

        # Year
        years = fields.get("PY", []) or fields.get("Y1", []) or []
        year = None
        if years:
            year_match = re.search(r"\b(19|20)\d{2}\b", years[0])
            if year_match:
                year = int(year_match.group(0))

        # Venue
        venues = fields.get("JO", []) or fields.get("JF", []) or fields.get("JA", []) or fields.get("PB", [])
        venue = venues[0] if venues else ""

        # Type mapping
        ris_type = (fields.get("TY", ["JOUR"])[0]).upper()
        if ris_type in ("CONF", "CPAPER"):
            source_type = "CONFERENCE"
        elif ris_type in ("BOOK", "CHAP"):
            source_type = "BOOK"
        elif ris_type in ("THES"):
            source_type = "THESIS"
        elif ris_type in ("RPRT"):
            source_type = "REPORT"
        else:
            source_type = "JOURNAL"

        dois = fields.get("DO", [])
        doi = normalize_doi(dois[0]) if dois else ""

        urls = fields.get("UR", []) or fields.get("L1", [])
        url = urls[0] if urls else (f"https://doi.org/{doi}" if doi else "")

        abstracts = fields.get("AB", []) or fields.get("N2", [])
        abstract = abstracts[0] if abstracts else ""

        results.append({
            "title": title,
            "authors": authors,
            "publication_year": year,
            "source_type": source_type,
            "journal_or_publisher": venue,
            "doi": doi,
            "url": url,
            "abstract": abstract,
            "provenance": ["RIS Import"]
        })

    return results


def import_source_from_doi(doi: str) -> Optional[Dict[str, Any]]:
    """
    Directly resolves a DOI string from authoritative providers or mock fixtures.
    """
    clean = normalize_doi(doi)
    if not clean:
        return None

    # Try Crossref
    record = CrossrefAdapter.resolve_doi(clean)
    if record:
        return record

    # Fallback to mock fixtures
    for mock_pub in MOCK_ACADEMIC_PUBLICATIONS:
        if normalize_doi(mock_pub.get("doi")) == clean:
            return dict(mock_pub)

    return None
