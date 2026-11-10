"""
Data Provenance & Academic Traceability Engine for ScholarForge AI.

Maintains bidirectional lineage linking manuscript tables to dataset versions and
in-text claims to verified literature sources.
Flags stale manuscript sections when underlying datasets or citations change.
"""

from typing import Dict, List, Any, Optional
import re
from projects.models import ResearchProject
from research.models import (
    ResearchDataset,
    DatasetVersion,
    StatisticalResult,
    ProjectSource,
)


class ProvenanceService:
    """Core domain service for research data provenance and staleness detection."""

    @classmethod
    def audit_project_provenance(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Scans all manuscript sections, builds provenance map, and flags stale sections.
        """
        doc = project.documents.first()
        sections = list(doc.sections.all().order_by("order_index")) if doc else []

        datasets = {str(d.id): d for d in ResearchDataset.objects.filter(project=project)}
        stat_results = {str(r.id): r for r in StatisticalResult.objects.filter(project=project)}
        project_sources = {str(ps.source.id): ps.source for ps in ProjectSource.objects.filter(project=project).select_related("source")}

        provenance_records = []
        stale_sections = []

        for sec in sections:
            content = sec.content_json if isinstance(sec.content_json, dict) else {}
            raw_html = content.get("html", "")
            raw_text = content.get("text", "")

            # Trace statistical results embedded in section
            # Check data-result-id attribute or APA table markers
            result_ids_in_sec = re.findall(r'data-result-id=["\']([a-f0-9-]+)["\']', raw_html, re.IGNORECASE)
            source_ids_in_sec = re.findall(r'data-source-id=["\']([a-f0-9-]+)["\']', raw_html, re.IGNORECASE)

            sec_provenance = {
                "section_id": str(sec.id),
                "section_title": sec.title,
                "linked_results": [],
                "linked_sources": [],
                "is_stale": False,
                "stale_reasons": [],
            }

            for rid in result_ids_in_sec:
                res = stat_results.get(rid)
                if res:
                    sec_provenance["linked_results"].append({
                        "result_id": rid,
                        "analysis_type": res.analysis_type,
                        "label": res.label,
                    })

            for sid in source_ids_in_sec:
                source = project_sources.get(sid)
                if source:
                    sec_provenance["linked_sources"].append({
                        "source_id": sid,
                        "title": source.title,
                        "doi": source.doi,
                        "is_retracted": source.retracted,
                    })
                    if source.retracted:
                        sec_provenance["is_stale"] = True
                        sec_provenance["stale_reasons"].append(
                            f"Cited source '{source.title}' has been flagged as RETRACTED."
                        )

            # Check if dataset has newer version than section last updated
            for d_id, ds in datasets.items():
                if ds.current_version_number > 1:
                    # If section mentions dataset name or result, verify if updated after transformation
                    if ds.name.lower() in raw_text.lower() or result_ids_in_sec:
                        latest_ver = ds.versions.order_by("-version_number").first()
                        if latest_ver and sec.updated_at and latest_ver.created_at > sec.updated_at:
                            sec_provenance["is_stale"] = True
                            sec_provenance["stale_reasons"].append(
                                f"Dataset '{ds.name}' was modified (Version {latest_ver.version_number}: "
                                f"{latest_ver.transformation_applied}) after this section was drafted."
                            )

            if sec_provenance["is_stale"]:
                stale_sections.append({
                    "section_id": sec_provenance["section_id"],
                    "section_title": sec_provenance["section_title"],
                    "reasons": sec_provenance["stale_reasons"],
                })

            provenance_records.append(sec_provenance)

        return {
            "project_id": str(project.id),
            "total_sections_traced": len(sections),
            "stale_sections_count": len(stale_sections),
            "stale_sections": stale_sections,
            "provenance_map": provenance_records,
        }

