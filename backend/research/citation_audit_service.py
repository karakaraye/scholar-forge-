"""
ScholarForge AI - Academic Citation Audit Engine
Audits manuscript in-text citations against the project bibliography, detecting missing references,
ghost references, retracted publications, unverified records, invalid DOIs, and metadata gaps.
"""

import re
import logging
from typing import Dict, Any, List
from research.models import CitationAudit, ResearchSource, ProjectSource
from research.citation_service import CitationService
from documents.models import DocumentSection

logger = logging.getLogger(__name__)


class CitationAuditService:
    """
    Validates academic citations across the entire manuscript and bibliography.
    """

    @classmethod
    def audit_project_citations(cls, project) -> Dict[str, Any]:
        """
        Runs comprehensive citation audit across all document sections and project sources.
        """
        # 1. Aggregate manuscript content and scan for in-text citations
        sections = DocumentSection.objects.filter(document__project=project).order_by("order_index")
        
        in_text_source_ids: set = set()
        section_citation_map: Dict[str, List[str]] = {}

        for sec in sections:
            cited_ids = CitationService.scan_manuscript_citations(sec.content or "")
            if cited_ids:
                section_citation_map[sec.title] = cited_ids
                in_text_source_ids.update(cited_ids)

        # 2. Retrieve project sources
        project_sources = list(
            project.project_sources.select_related("source").all()
        )
        library_source_ids = {str(ps.source.id) for ps in project_sources}
        sources_by_id = {str(ps.source.id): ps.source for ps in project_sources}

        diagnostics: List[Dict[str, Any]] = []

        # Audit Metric Counters
        total_in_text = len(in_text_source_ids)
        total_bib = len(library_source_ids)
        uncited_count = 0
        missing_count = 0
        unverified_count = 0
        retracted_count = 0
        conflict_count = 0

        # Check 1: In-text citations missing from project library / bibliography
        for cited_id in in_text_source_ids:
            if cited_id not in library_source_ids:
                missing_count += 1
                # Find which section contains it
                sec_found = [s_title for s_title, ids in section_citation_map.items() if cited_id in ids]
                diagnostics.append({
                    "category": "MISSING_FROM_BIBLIOGRAPHY",
                    "severity": "CRITICAL",
                    "issue": f"In-text citation refers to source ID '{cited_id[:8]}...' which is missing from project bibliography.",
                    "affected_section": sec_found[0] if sec_found else "Manuscript",
                    "source_id": cited_id,
                    "source_title": "Unlinked In-Text Reference",
                    "suggested_correction": "Attach this source to your project library or re-link citation."
                })

        # Check 2: Bibliography entries not cited in manuscript ("Ghost references")
        for ps in project_sources:
            s_id = str(ps.source.id)
            if s_id not in in_text_source_ids:
                uncited_count += 1
                diagnostics.append({
                    "category": "UNCITED_BIBLIOGRAPHY_ENTRY",
                    "severity": "WARNING",
                    "issue": f"Source '{ps.source.title}' is in bibliography but not cited anywhere in manuscript text.",
                    "affected_section": "References / Bibliography",
                    "source_id": s_id,
                    "source_title": ps.source.title,
                    "suggested_correction": "Cite this source in the manuscript where relevant or remove from project library."
                })

        # Check 3: Publication Verification Status, Retractions & Conflicts
        for ps in project_sources:
            s = ps.source
            s_id = str(s.id)

            # Check Retracted
            if s.retracted or s.verification_status == "WITHDRAWN_OR_RETRACTED":
                retracted_count += 1
                diagnostics.append({
                    "category": "RETRACTED_PUBLICATION",
                    "severity": "CRITICAL",
                    "issue": f"Publication '{s.title}' has been officially WITHDRAWN or RETRACTED.",
                    "affected_section": "Entire Manuscript",
                    "source_id": s_id,
                    "source_title": s.title,
                    "suggested_correction": "Remove or contextualize retracted publication per COPE guidelines."
                })

            # Check Metadata Conflict
            if s.verification_status == "METADATA_CONFLICT":
                conflict_count += 1
                diagnostics.append({
                    "category": "METADATA_CONFLICT",
                    "severity": "CRITICAL",
                    "issue": f"DOI registry discrepancy for '{s.title}'. DOI resolves to a different publication.",
                    "affected_section": "Citations & References",
                    "source_id": s_id,
                    "source_title": s.title,
                    "suggested_correction": "Re-verify source DOI or update bibliographic metadata."
                })

            # Check Unverified
            if s.verification_status == "UNVERIFIED":
                unverified_count += 1
                diagnostics.append({
                    "category": "UNVERIFIED_SOURCE",
                    "severity": "INFO",
                    "issue": f"Bibliographic metadata for '{s.title}' has not yet been verified against registries.",
                    "affected_section": "Library",
                    "source_id": s_id,
                    "source_title": s.title,
                    "suggested_correction": "Click 'Verify Metadata' to query Crossref / OpenAlex."
                })

            # Check Missing Authors
            if not s.authors:
                diagnostics.append({
                    "category": "MISSING_AUTHOR_METADATA",
                    "severity": "WARNING",
                    "issue": f"Source '{s.title}' lacks author attribution.",
                    "affected_section": "Bibliography",
                    "source_id": s_id,
                    "source_title": s.title,
                    "suggested_correction": "Add author names to ensure standard academic citation."
                })

            # Check Missing Date
            if not s.publication_year:
                diagnostics.append({
                    "category": "MISSING_DATE_METADATA",
                    "severity": "INFO",
                    "issue": f"Source '{s.title}' has no publication year (will format as 'n.d.').",
                    "affected_section": "Bibliography",
                    "source_id": s_id,
                    "source_title": s.title,
                    "suggested_correction": "Provide publication year if available."
                })

        # Calculate overall Citation Integrity Score (0 - 100)
        penalty = (retracted_count * 30) + (missing_count * 15) + (conflict_count * 15) + (uncited_count * 3)
        integrity_score = max(0, min(100, 100 - penalty))

        report_payload = {
            "integrity_score": integrity_score,
            "total_in_text_citations": total_in_text,
            "total_bibliography_entries": total_bib,
            "uncited_bibliography_count": uncited_count,
            "missing_bibliography_count": missing_count,
            "unverified_count": unverified_count,
            "retracted_count": retracted_count,
            "conflict_count": conflict_count,
            "diagnostics": diagnostics,
            "disclaimer": "Citation audit analyzes bibliographic metadata congruence and does not constitute a legal plagiarism guarantee."
        }

        # Save CitationAudit record
        main_doc = project.documents.first()
        CitationAudit.objects.create(
            project=project,
            document=main_doc,
            total_in_text_citations=total_in_text,
            total_bibliography_entries=total_bib,
            uncited_bibliography_count=uncited_count,
            missing_bibliography_count=missing_count,
            unverified_count=unverified_count,
            retracted_count=retracted_count,
            conflict_count=conflict_count,
            audit_report=report_payload
        )

        return report_payload

