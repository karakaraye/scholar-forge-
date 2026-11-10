"""
ScholarForge AI - Publication Verification Engine
Performs multi-step bibliographic metadata verification against authoritative registries
(Crossref, OpenAlex), detects discrepancies and retractions, and assigns evidence-based
verification statuses without penalizing legitimate non-DOI academic sources.
"""

import os
import re
import difflib
import logging
from typing import Dict, Any, Tuple
from django.utils import timezone
from research.models import ResearchSource, SourceVerification, VerificationStatus
from research.discovery_service import CrossrefAdapter, OpenAlexAdapter, normalize_doi, MOCK_ACADEMIC_PUBLICATIONS

logger = logging.getLogger(__name__)


def compute_string_similarity(str1: str, str2: str) -> float:
    """
    Computes SequenceMatcher similarity ratio between two normalized strings.
    """
    s1 = re.sub(r"[^a-zA-Z0-9\s]", "", str1.lower()).strip()
    s2 = re.sub(r"[^a-zA-Z0-9\s]", "", str2.lower()).strip()
    if not s1 or not s2:
        return 0.0
    return difflib.SequenceMatcher(None, s1, s2).ratio()


def check_author_surname_overlap(authors1: list, authors2: list) -> float:
    """
    Calculates Jaccard overlap of author surnames between user and registry records.
    """
    def extract_surnames(author_list):
        surnames = set()
        for a in author_list:
            if not isinstance(a, str):
                continue
            cleaned = a.strip()
            if "," in cleaned:
                surnames.add(cleaned.split(",")[0].strip().lower())
            else:
                parts = cleaned.split()
                if parts:
                    surnames.add(parts[-1].strip().lower())
        return surnames

    set1 = extract_surnames(authors1)
    set2 = extract_surnames(authors2)
    if not set1 or not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return len(intersection) / len(union)


class PublicationVerificationEngine:
    """
    Pipeline for verifying bibliographic metadata against Crossref & OpenAlex.
    """

    @classmethod
    def verify_source(cls, source: ResearchSource) -> SourceVerification:
        """
        Executes full verification pipeline for a given ResearchSource.
        """
        doi_clean = normalize_doi(source.doi)
        is_mock = os.environ.get("AI_MOCK_MODE", "False").strip().lower() in ("true", "1", "yes")

        registry_record: Dict[str, Any] = {}
        provider_used = "MANUAL"

        # 1. Look up authoritative record
        if doi_clean:
            if not is_mock:
                # Try Crossref DOI resolution first
                cr_record = CrossrefAdapter.resolve_doi(doi_clean)
                if cr_record:
                    registry_record = cr_record
                    provider_used = "CROSSREF"

            # Check mock fixtures if live call returned nothing or in mock mode
            if not registry_record:
                for mock_pub in MOCK_ACADEMIC_PUBLICATIONS:
                    if normalize_doi(mock_pub.get("doi")) == doi_clean:
                        registry_record = mock_pub
                        provider_used = mock_pub.get("provenance", ["Crossref"])[0].upper()
                        break
        else:
            # Source lacks DOI (e.g. book, institutional report, legal treatise)
            # Try searching by title + author in OpenAlex or mock fixtures
            if not is_mock:
                oa_search = OpenAlexAdapter.search(query=source.title, per_page=3)
                if oa_search:
                    # Check top match
                    top = oa_search[0]
                    sim = compute_string_similarity(source.title, top.get("title", ""))
                    if sim > 0.8:
                        registry_record = top
                        provider_used = "OPENALEX"

            if not registry_record:
                for mock_pub in MOCK_ACADEMIC_PUBLICATIONS:
                    sim = compute_string_similarity(source.title, mock_pub.get("title", ""))
                    if sim > 0.8:
                        registry_record = mock_pub
                        provider_used = "OPENALEX"
                        break

        # 2. Evaluate comparison metrics
        status, details, retracted, error = cls._evaluate_record_match(source, registry_record, doi_clean)

        # 3. Update ResearchSource metadata if verified
        source.verification_status = status
        source.retracted = retracted
        if retracted and details.get("retraction_details"):
            source.retraction_details = details["retraction_details"]

        # Add provider to provenance if not already present
        if provider_used != "MANUAL":
            prov_list = list(source.provenance) if isinstance(source.provenance, list) else []
            prov_name = "Crossref" if provider_used == "CROSSREF" else "OpenAlex"
            if prov_name not in prov_list:
                prov_list.append(prov_name)
            source.provenance = prov_list

        source.save()

        # 4. Create and return SourceVerification audit record
        verification = SourceVerification.objects.create(
            source=source,
            verification_status=status,
            verified_by_provider=provider_used,
            comparison_details=details,
            retraction_detected=retracted,
            error_details=error
        )
        return verification

    @classmethod
    def _evaluate_record_match(
        cls,
        source: ResearchSource,
        registry_record: Dict[str, Any],
        doi: str
    ) -> Tuple[str, Dict[str, Any], bool, str]:
        """
        Calculates scores and determines verification status.
        """
        if not registry_record:
            # If no authoritative record found:
            # Legit sources without DOI remain UNVERIFIED rather than errored
            return (
                VerificationStatus.UNVERIFIED,
                {
                    "message": "No matching record resolved from Crossref or OpenAlex registries.",
                    "doi_provided": bool(doi),
                },
                False,
                "Source could not be resolved in international DOI registries."
            )

        # Check for Retraction first
        if registry_record.get("retracted"):
            return (
                VerificationStatus.WITHDRAWN_OR_RETRACTED,
                {
                    "retraction_detected": True,
                    "retraction_details": registry_record.get("retraction_details", "Officially retracted in academic registry."),
                    "registry_title": registry_record.get("title")
                },
                True,
                "Publication has been officially retracted or withdrawn."
            )

        # Compare Title
        title_sim = compute_string_similarity(source.title, registry_record.get("title", ""))

        # Compare Authors
        author_overlap = check_author_surname_overlap(
            source.authors if isinstance(source.authors, list) else [],
            registry_record.get("authors", [])
        )

        # Compare Year
        source_year = source.publication_year
        reg_year = registry_record.get("publication_year")
        year_match = False
        year_diff = None
        if source_year and reg_year:
            year_diff = abs(source_year - reg_year)
            # Allow +-1 year for advance online publication discrepancy
            year_match = year_diff <= 1

        details = {
            "title_similarity": round(title_sim, 3),
            "author_overlap": round(author_overlap, 3),
            "year_match": year_match,
            "year_difference": year_diff,
            "registry_title": registry_record.get("title"),
            "registry_doi": registry_record.get("doi"),
            "registry_year": reg_year,
            "registry_venue": registry_record.get("journal_or_publisher")
        }

        # Check for severe metadata conflict
        # E.g. A DOI was given, but the registered paper has an entirely different title (< 40% similarity)
        if doi and title_sim < 0.40:
            return (
                VerificationStatus.METADATA_CONFLICT,
                details,
                False,
                f"DOI '{doi}' belongs to a different publication in registry: '{registry_record.get('title')}'"
            )

        # High confidence metadata verification
        if (doi and title_sim >= 0.75) or (title_sim >= 0.90 and author_overlap >= 0.5):
            return (
                VerificationStatus.METADATA_VERIFIED,
                details,
                False,
                ""
            )

        # Partially verified (minor divergence or no DOI, but strong match)
        if title_sim >= 0.60 or author_overlap >= 0.5:
            return (
                VerificationStatus.PARTIALLY_VERIFIED,
                details,
                False,
                "Minor discrepancies in publication year, author initials, or subtitle."
            )

        return (
            VerificationStatus.UNVERIFIED,
            details,
            False,
            "Insufficient metadata congruence to verify."
        )

