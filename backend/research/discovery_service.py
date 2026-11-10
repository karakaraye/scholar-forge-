"""
ScholarForge AI - Scholarly Research Discovery Engine
Provides independent provider adapters for OpenAlex API, Crossref REST API,
and Semantic Scholar Academic Graph API with metadata normalization,
deduplication, and deterministic offline mock fixtures.
"""

import os
import re
import json
import logging
import urllib.parse
import urllib.request
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

POLITE_USER_AGENT = "ScholarForge-AcademicWorkspace/1.0 (https://scholarforge.ai; mailto:support@scholarforge.ai)"


def normalize_doi(doi: Optional[str]) -> str:
    """
    Normalizes a DOI string to canonical format (e.g. '10.1145/3292500.3330964').
    Strips URL prefixes, lowercase, whitespace.
    """
    if not doi:
        return ""
    cleaned = doi.strip().lower()
    cleaned = re.sub(r"^https?://(dx\.)?doi\.org/", "", cleaned)
    cleaned = re.sub(r"^doi:\s*", "", cleaned)
    return cleaned.strip()


def reconstruct_openalex_abstract(inverted_index: Optional[Dict[str, List[int]]]) -> str:
    """
    Reconstructs full text abstract from OpenAlex abstract_inverted_index.
    """
    if not inverted_index or not isinstance(inverted_index, dict):
        return ""
    try:
        word_positions = []
        for word, positions in inverted_index.items():
            for pos in positions:
                word_positions.append((pos, word))
        word_positions.sort(key=lambda x: x[0])
        return " ".join(w for _, w in word_positions)
    except Exception as e:
        logger.warning(f"Failed to reconstruct OpenAlex inverted index: {e}")
        return ""


def clean_crossref_abstract(abstract_str: Optional[str]) -> str:
    """
    Removes JATS / XML tags commonly returned in Crossref abstract fields.
    """
    if not abstract_str:
        return ""
    # Strip <jats:p>, <jats:title>, etc.
    cleaned = re.sub(r"<[^>]+>", " ", abstract_str)
    return " ".join(cleaned.split())


class OpenAlexAdapter:
    """
    Adapter for the OpenAlex Academic Graph API (https://api.openalex.org).
    Free, polite pool access with mailto header.
    """
    BASE_URL = "https://api.openalex.org/works"

    @classmethod
    def search(
        cls,
        query: str,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        is_oa: Optional[bool] = None,
        pub_type: Optional[str] = None,
        page: int = 1,
        per_page: int = 10,
        sort: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {
            "search": query,
            "page": page,
            "per-page": per_page,
        }

        # Build filter criteria
        filters = []
        if year_from and year_to:
            filters.append(f"publication_year:{year_from}-{year_to}")
        elif year_from:
            filters.append(f"from_publication_date:{year_from}-01-01")
        elif year_to:
            filters.append(f"to_publication_date:{year_to}-12-31")

        if is_oa is not None:
            filters.append(f"is_oa:{str(is_oa).lower()}")

        if pub_type:
            openalex_type_map = {
                "JOURNAL": "article",
                "BOOK": "book",
                "CONFERENCE": "proceedings-article",
                "THESIS": "dissertation",
                "REPORT": "report"
            }
            mapped_type = openalex_type_map.get(pub_type, "article")
            filters.append(f"type:{mapped_type}")

        if filters:
            params["filter"] = ",".join(filters)

        if sort == "newest":
            params["sort"] = "publication_date:desc"
        elif sort == "citations":
            params["sort"] = "cited_by_count:desc"

        url = f"{cls.BASE_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": POLITE_USER_AGENT,
                "Accept": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    results = []
                    for work in data.get("results", []):
                        normalized = cls.normalize_work(work)
                        if normalized:
                            results.append(normalized)
                    return results
        except Exception as e:
            logger.info(f"OpenAlex live search request failed: {e}")
            return []
        return []

    @classmethod
    def normalize_work(cls, work: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not work or not work.get("title"):
            return None

        # Authors extraction
        authors = []
        for authorship in work.get("authorships", []):
            author_obj = authorship.get("author", {})
            name = author_obj.get("display_name")
            if name:
                authors.append(name)

        # Source type mapping
        oa_type = (work.get("type") or "").lower()
        if "proceedings" in oa_type or "conference" in oa_type:
            source_type = "CONFERENCE"
        elif "book" in oa_type:
            source_type = "BOOK"
        elif "dissertation" in oa_type or "thesis" in oa_type:
            source_type = "THESIS"
        elif "report" in oa_type:
            source_type = "REPORT"
        else:
            source_type = "JOURNAL"

        # Journal / Venue
        primary_loc = work.get("primary_location") or {}
        source_obj = primary_loc.get("source") or {}
        venue = source_obj.get("display_name") or ""

        # Abstract
        abstract = reconstruct_openalex_abstract(work.get("abstract_inverted_index"))

        doi = normalize_doi(work.get("doi"))
        external_id = work.get("id") or ""

        return {
            "title": work.get("title", "").strip(),
            "authors": authors,
            "publication_year": work.get("publication_year"),
            "source_type": source_type,
            "journal_or_publisher": venue,
            "doi": doi,
            "url": primary_loc.get("landing_page_url") or work.get("doi") or "",
            "abstract": abstract,
            "citation_count": work.get("cited_by_count", 0),
            "is_open_access": work.get("open_access", {}).get("is_oa", False),
            "provenance": ["OpenAlex"],
            "retracted": work.get("is_retracted", False),
            "external_id": external_id
        }


class CrossrefAdapter:
    """
    Adapter for the Crossref REST API (https://api.crossref.org).
    Authoritative DOI registration agency for scholarly publishers.
    """
    BASE_URL = "https://api.crossref.org/works"

    @classmethod
    def search(
        cls,
        query: str,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        per_page: int = 10,
        sort: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {
            "query": query,
            "rows": per_page,
        }

        filters = []
        if year_from:
            filters.append(f"from-pub-date:{year_from}-01-01")
        if year_to:
            filters.append(f"until-pub-date:{year_to}-12-31")

        if filters:
            params["filter"] = ",".join(filters)

        if sort == "newest":
            params["sort"] = "published"
            params["order"] = "desc"
        elif sort == "citations":
            params["sort"] = "is-referenced-by-count"
            params["order"] = "desc"

        url = f"{cls.BASE_URL}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": POLITE_USER_AGENT,
                "Accept": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    items = data.get("message", {}).get("items", [])
                    results = []
                    for item in items:
                        normalized = cls.normalize_work(item)
                        if normalized:
                            results.append(normalized)
                    return results
        except Exception as e:
            logger.info(f"Crossref live search request failed: {e}")
            return []
        return []

    @classmethod
    def resolve_doi(cls, doi: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves authoritative publication record by DOI directly from Crossref.
        """
        clean = normalize_doi(doi)
        if not clean:
            return None
        url = f"{cls.BASE_URL}/{urllib.parse.quote(clean)}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": POLITE_USER_AGENT,
                "Accept": "application/json"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    item = data.get("message", {})
                    return cls.normalize_work(item)
        except Exception as e:
            logger.info(f"Crossref DOI resolution failed for {clean}: {e}")
            return None
        return None

    @classmethod
    def normalize_work(cls, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        titles = item.get("title", [])
        title = titles[0] if titles else ""
        if not title:
            return None

        # Authors
        authors = []
        for author in item.get("author", []):
            family = author.get("family", "")
            given = author.get("given", "")
            if family and given:
                authors.append(f"{family}, {given}")
            elif family:
                authors.append(family)
            elif author.get("name"):
                authors.append(author.get("name"))

        # Year
        year = None
        date_parts = (
            item.get("published-print", {}).get("date-parts")
            or item.get("published-online", {}).get("date-parts")
            or item.get("issued", {}).get("date-parts")
            or item.get("created", {}).get("date-parts")
        )
        if date_parts and date_parts[0] and len(date_parts[0]) > 0:
            year = date_parts[0][0]

        # Source type
        cr_type = (item.get("type") or "").lower()
        if "proceedings" in cr_type or "conference" in cr_type:
            source_type = "CONFERENCE"
        elif "book" in cr_type or "monograph" in cr_type:
            source_type = "BOOK"
        elif "dissertation" in cr_type:
            source_type = "THESIS"
        elif "report" in cr_type:
            source_type = "REPORT"
        else:
            source_type = "JOURNAL"

        venues = item.get("container-title", [])
        venue = venues[0] if venues else item.get("publisher", "")

        abstract = clean_crossref_abstract(item.get("abstract"))
        doi = normalize_doi(item.get("DOI"))

        # Retraction check via Crossmark updates
        retracted = False
        retraction_details = ""
        for update in item.get("update-to", []):
            if "retract" in update.get("type", "").lower():
                retracted = True
                retraction_details = f"Retracted via Crossmark notice: {update.get('updated', {}).get('timestamp', '')}"

        return {
            "title": title.strip(),
            "authors": authors,
            "publication_year": year,
            "source_type": source_type,
            "journal_or_publisher": venue,
            "doi": doi,
            "url": item.get("URL") or (f"https://doi.org/{doi}" if doi else ""),
            "abstract": abstract,
            "citation_count": item.get("is-referenced-by-count", 0),
            "is_open_access": bool(item.get("license")),
            "provenance": ["Crossref"],
            "retracted": retracted,
            "retraction_details": retraction_details,
            "external_id": doi
        }


class SemanticScholarAdapter:
    """
    Optional Provider: Adapter for the Semantic Scholar Academic Graph API.
    """
    BASE_URL = "https://api.semanticscholar.org/graph/v1/paper/search"

    @classmethod
    def search(cls, query: str, per_page: int = 10) -> List[Dict[str, Any]]:
        api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY", "").strip()
        params = {
            "query": query,
            "limit": per_page,
            "fields": "title,authors,year,venue,externalIds,abstract,citationCount,isOpenAccess,url"
        }
        url = f"{cls.BASE_URL}?{urllib.parse.urlencode(params)}"
        headers = {"User-Agent": POLITE_USER_AGENT}
        if api_key:
            headers["x-api-key"] = api_key

        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    results = []
                    for paper in data.get("data", []):
                        normalized = cls.normalize_paper(paper)
                        if normalized:
                            results.append(normalized)
                    return results
        except Exception as e:
            logger.info(f"Semantic Scholar live search failed: {e}")
            return []
        return []

    @classmethod
    def normalize_paper(cls, paper: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not paper or not paper.get("title"):
            return None
        authors = [a.get("name", "") for a in paper.get("authors", []) if a.get("name")]
        external_ids = paper.get("externalIds") or {}
        doi = normalize_doi(external_ids.get("DOI"))
        return {
            "title": paper.get("title", "").strip(),
            "authors": authors,
            "publication_year": paper.get("year"),
            "source_type": "JOURNAL",
            "journal_or_publisher": paper.get("venue", ""),
            "doi": doi,
            "url": paper.get("url") or (f"https://doi.org/{doi}" if doi else ""),
            "abstract": paper.get("abstract", "") or "",
            "citation_count": paper.get("citationCount", 0),
            "is_open_access": paper.get("isOpenAccess", False),
            "provenance": ["Semantic Scholar"],
            "retracted": False,
            "external_id": paper.get("paperId", "")
        }


# ============================================================================
# DETERMINISTIC MOCK FIXTURES FOR TESTS AND OFFLINE DEVELOPMENT
# ============================================================================

MOCK_ACADEMIC_PUBLICATIONS: List[Dict[str, Any]] = [
    {
        "title": "Attention Is All You Need",
        "authors": ["Vaswani, Ashish", "Shazeer, Noam", "Parmar, Niki", "Uszkoreit, Jakob", "Jones, Llion", "Gomez, Aidan N.", "Kaiser, Łukasz", "Polosukhin, Illia"],
        "publication_year": 2017,
        "source_type": "CONFERENCE",
        "journal_or_publisher": "Advances in Neural Information Processing Systems (NeurIPS)",
        "doi": "10.48550/arxiv.1706.03762",
        "url": "https://arxiv.org/abs/1706.03762",
        "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
        "citation_count": 92400,
        "is_open_access": True,
        "provenance": ["OpenAlex", "Crossref"],
        "retracted": False,
        "external_id": "W2741809807"
    },
    {
        "title": "Deep Residual Learning for Image Recognition",
        "authors": ["He, Kaiming", "Zhang, Xiangyu", "Ren, Shaoqing", "Sun, Jian"],
        "publication_year": 2016,
        "source_type": "CONFERENCE",
        "journal_or_publisher": "IEEE Conference on Computer Vision and Pattern Recognition (CVPR)",
        "doi": "10.1109/cvpr.2016.90",
        "url": "https://doi.org/10.1109/cvpr.2016.90",
        "abstract": "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.",
        "citation_count": 185000,
        "is_open_access": True,
        "provenance": ["Crossref", "OpenAlex"],
        "retracted": False,
        "external_id": "10.1109/cvpr.2016.90"
    },
    {
        "title": "Building Theories from Case Study Research",
        "authors": ["Eisenhardt, Kathleen M."],
        "publication_year": 1989,
        "source_type": "JOURNAL",
        "journal_or_publisher": "Academy of Management Review",
        "doi": "10.5465/amr.1989.4308385",
        "url": "https://doi.org/10.5465/amr.1989.4308385",
        "abstract": "This paper describes the process of inducting theory using case studies from specifying the research questions to reaching closure. Some features of the process, such as problem definition and construct validation, are similar to hypothesis testing research. Others, such as within-case analysis and theoretical sampling, are unique to the inductive case-oriented method.",
        "citation_count": 68000,
        "is_open_access": False,
        "provenance": ["Crossref", "OpenAlex"],
        "retracted": False,
        "external_id": "10.5465/amr.1989.4308385"
    },
    {
        "title": "The PRISMA 2020 Statement: An Updated Guideline for Reporting Systematic Reviews",
        "authors": ["Page, Matthew J.", "McKenzie, Joanne E.", "Bossuyt, Patrick M.", "Boutron, Isabelle", "Hoffmann, Tammy C.", "Mulrow, Cynthia D."],
        "publication_year": 2021,
        "source_type": "JOURNAL",
        "journal_or_publisher": "BMJ (British Medical Journal)",
        "doi": "10.1136/bmj.n71",
        "url": "https://doi.org/10.1136/bmj.n71",
        "abstract": "The Preferred Reporting Items for Systematic Reviews and Meta-Analyses (PRISMA) statement, published in 2009, was designed to help systematic reviewers transparently report why the review was done, what the authors did, and what they found. Over the past decade, advances in systematic review methodology and terminology have necessitated an update to the guideline.",
        "citation_count": 28500,
        "is_open_access": True,
        "provenance": ["OpenAlex", "Crossref"],
        "retracted": False,
        "external_id": "10.1136/bmj.n71"
    },
    {
        "title": "Competitive Advantage: Creating and Sustaining Superior Performance",
        "authors": ["Porter, Michael E."],
        "publication_year": 1985,
        "source_type": "BOOK",
        "journal_or_publisher": "Free Press / Simon & Schuster",
        "doi": "10.1002/smj.4250070607",
        "url": "https://doi.org/10.1002/smj.4250070607",
        "abstract": "Michael Porter's groundbreaking book on competitive strategy explores how firms can create and sustain competitive advantage through cost leadership, differentiation, and focus strategies within industry value chains.",
        "citation_count": 115000,
        "is_open_access": False,
        "provenance": ["Crossref"],
        "retracted": False,
        "external_id": "10.1002/smj.4250070607"
    },
    {
        "title": "Retracted: Hydroxychloroquine or chloroquine with or without a macrolide for treatment of COVID-19: a multinational registry analysis",
        "authors": ["Mehra, Mandeep R.", "Desai, Sapan S.", "Ruschitzka, Frank", "Patel, Amit N."],
        "publication_year": 2020,
        "source_type": "JOURNAL",
        "journal_or_publisher": "The Lancet",
        "doi": "10.1016/s0140-6736(20)31180-6",
        "url": "https://doi.org/10.1016/s0140-6736(20)31180-6",
        "abstract": "Retracted publication. Authors retracted this multinational observational registry paper following independent audit concerns regarding data veracity and integrity of the Surgisphere database.",
        "citation_count": 3400,
        "is_open_access": True,
        "provenance": ["Crossref", "OpenAlex"],
        "retracted": True,
        "retraction_details": "Retracted on June 5, 2020 due to unverifiable primary hospital data registry.",
        "external_id": "10.1016/s0140-6736(20)31180-6"
    }
]


class ScholarlyDiscoveryService:
    """
    Orchestrates discovery across OpenAlex, Crossref, and Semantic Scholar with
    conservative deduplication, multi-filter querying, and fallback to mock fixtures.
    """

    @classmethod
    def search(
        cls,
        query: str,
        discipline: Optional[str] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        is_oa: Optional[bool] = None,
        pub_type: Optional[str] = None,
        provider: str = "ALL",
        page: int = 1,
        per_page: int = 10,
        sort: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes unified search and normalizes/deduplicates publications.
        """
        query_clean = query.strip()
        is_mock = os.environ.get("AI_MOCK_MODE", "False").strip().lower() in ("true", "1", "yes")

        raw_results: List[Dict[str, Any]] = []

        if not is_mock:
            # 1. Query OpenAlex if requested
            if provider in ("ALL", "OPENALEX"):
                oa_results = OpenAlexAdapter.search(
                    query=query_clean,
                    year_from=year_from,
                    year_to=year_to,
                    is_oa=is_oa,
                    pub_type=pub_type,
                    page=page,
                    per_page=per_page,
                    sort=sort
                )
                raw_results.extend(oa_results)

            # 2. Query Crossref if requested
            if provider in ("ALL", "CROSSREF"):
                cr_results = CrossrefAdapter.search(
                    query=query_clean,
                    year_from=year_from,
                    year_to=year_to,
                    per_page=per_page,
                    sort=sort
                )
                raw_results.extend(cr_results)

            # 3. Query Semantic Scholar if requested
            if provider == "SEMANTIC_SCHOLAR":
                ss_results = SemanticScholarAdapter.search(
                    query=query_clean,
                    per_page=per_page
                )
                raw_results.extend(ss_results)

        # If live search returned no results or mock mode is enabled, filter mock fixtures
        if not raw_results or is_mock:
            raw_results = cls._filter_mock_fixtures(
                query=query_clean,
                year_from=year_from,
                year_to=year_to,
                is_oa=is_oa,
                pub_type=pub_type,
                sort=sort
            )

        # Deduplicate results conservatively
        deduplicated = cls.deduplicate_publications(raw_results)

        # Pagination slice
        total_count = len(deduplicated)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_results = deduplicated[start_idx:end_idx]

        return {
            "query": query_clean,
            "provider": provider,
            "page": page,
            "per_page": per_page,
            "total_count": total_count,
            "results": paginated_results
        }

    @classmethod
    def deduplicate_publications(cls, publications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Conservative deduplication:
        1. Exact match on normalized DOI.
        2. Exact match on normalized title AND first author surname (for non-DOI publications).
        Merges metadata preferring longer abstract, highest citation count, and combined provenance.
        """
        dedup_map: Dict[str, Dict[str, Any]] = {}
        non_doi_list: List[Dict[str, Any]] = []

        for pub in publications:
            doi = normalize_doi(pub.get("doi"))
            if doi:
                if doi in dedup_map:
                    cls._merge_records(dedup_map[doi], pub)
                else:
                    pub["doi"] = doi
                    dedup_map[doi] = pub
            else:
                # Check non-doi list
                matched = False
                pub_title_norm = cls._normalize_title(pub.get("title", ""))
                pub_surname = cls._first_author_surname(pub.get("authors", []))

                for existing in non_doi_list:
                    ex_title_norm = cls._normalize_title(existing.get("title", ""))
                    ex_surname = cls._first_author_surname(existing.get("authors", []))

                    if pub_title_norm and pub_title_norm == ex_title_norm and pub_surname == ex_surname:
                        cls._merge_records(existing, pub)
                        matched = True
                        break

                if not matched:
                    non_doi_list.append(pub)

        merged = list(dedup_map.values()) + non_doi_list
        return merged

    @classmethod
    def _merge_records(cls, base: Dict[str, Any], incoming: Dict[str, Any]):
        """
        Merges two matching publication records without discarding richer information.
        """
        # Abstract: take longer
        if len(incoming.get("abstract", "")) > len(base.get("abstract", "")):
            base["abstract"] = incoming["abstract"]

        # Citation count: take max
        base["citation_count"] = max(base.get("citation_count", 0), incoming.get("citation_count", 0))

        # Open access: if either is OA
        base["is_open_access"] = base.get("is_open_access", False) or incoming.get("is_open_access", False)

        # Retracted status
        base["retracted"] = base.get("retracted", False) or incoming.get("retracted", False)
        if incoming.get("retraction_details") and not base.get("retraction_details"):
            base["retraction_details"] = incoming["retraction_details"]

        # Provenance combining
        prov_set = set(base.get("provenance", []))
        for p in incoming.get("provenance", []):
            prov_set.add(p)
        base["provenance"] = list(prov_set)

    @classmethod
    def _normalize_title(cls, title: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", title.lower())
        return " ".join(cleaned.split())

    @classmethod
    def _first_author_surname(cls, authors: List[str]) -> str:
        if not authors:
            return ""
        first = authors[0]
        # Extract surname if 'Surname, Given' or 'Given Surname'
        if "," in first:
            return first.split(",")[0].strip().lower()
        parts = first.split()
        return parts[-1].strip().lower() if parts else ""

    @classmethod
    def _filter_mock_fixtures(
        cls,
        query: str,
        year_from: Optional[int],
        year_to: Optional[int],
        is_oa: Optional[bool],
        pub_type: Optional[str],
        sort: Optional[str]
    ) -> List[Dict[str, Any]]:
        tokens = query.lower().split()
        results = []

        for pub in MOCK_ACADEMIC_PUBLICATIONS:
            # Query match (title, authors, abstract, venue)
            text_corpus = f"{pub['title']} {' '.join(pub['authors'])} {pub['abstract']} {pub['journal_or_publisher']}".lower()
            if tokens and not any(t in text_corpus for t in tokens):
                continue

            # Year filter
            year = pub.get("publication_year")
            if year_from and year and year < year_from:
                continue
            if year_to and year and year > year_to:
                continue

            # Open Access filter
            if is_oa is not None:
                oa_bool = is_oa if isinstance(is_oa, bool) else (str(is_oa).lower() in ("true", "1", "yes"))
                if pub.get("is_open_access") != oa_bool:
                    continue

            # Pub type filter
            if pub_type and pub.get("source_type") != pub_type:
                continue

            results.append(dict(pub))

        if sort == "citations":
            results.sort(key=lambda x: x.get("citation_count", 0), reverse=True)
        elif sort == "newest":
            results.sort(key=lambda x: x.get("publication_year", 0) or 0, reverse=True)

        return results
