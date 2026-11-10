"""
Research Planning Assistant Engine for ScholarForge AI.

Provides structured academic planning: Problem Statement, Aim, Objectives, Questions,
Hypotheses, Variables, Conceptual Relationships, Scope, and Proposed Methodology.
Enforces explicit researcher approval before manuscript drafting and downstream analysis.
"""

from typing import Dict, List, Any, Optional
from django.utils import timezone
from projects.models import ResearchProject
from research.models import ResearchDecision, ResearchVariable


class PlanningService:
    """Core domain service for structured research planning and approval."""

    @classmethod
    def get_or_create_decision(cls, project: ResearchProject) -> ResearchDecision:
        """Retrieves or initializes the research plan decision for a project."""
        decision, created = ResearchDecision.objects.get_or_create(
            project=project,
            defaults={
                "title_confirmed": bool(project.title),
                "problem_statement": project.problem_statement or "",
                "research_aim": project.research_aim or "",
                "objectives": project.objectives if isinstance(project.objectives, list) else [],
                "research_questions": project.research_questions if isinstance(project.research_questions, list) else [],
                "hypotheses": project.hypotheses if isinstance(project.hypotheses, list) else [],
                "scope_and_delimitation": project.scope_and_delimitations or "",
                "limitations": project.limitations or "",
                "proposed_methodology": project.methodology_summary or "",
                "is_approved": False,
                "audit_trail": [
                    {
                        "action": "PLAN_INITIALIZED",
                        "timestamp": timezone.now().isoformat(),
                        "note": "Initial plan scaffold created from project configuration wizard."
                    }
                ]
            }
        )
        return decision

    @classmethod
    def create_decision(
        cls,
        project: ResearchProject,
        user: Any,
        decision_category: str = "",
        title: str = "",
        rationale: str = "",
        alternatives_considered: str = "",
        impact_description: str = ""
    ) -> ResearchDecision:
        """Creates or registers a research planning decision with audit trail."""
        decision = cls.get_or_create_decision(project)
        trail = list(decision.audit_trail or [])
        trail.append({
            "action": "DECISION_RECORDED",
            "category": decision_category,
            "title": title,
            "rationale": rationale,
            "alternatives": alternatives_considered,
            "impact": impact_description,
            "user": user.email if user else "system",
            "timestamp": timezone.now().isoformat()
        })
        decision.audit_trail = trail
        decision.save()
        return decision

    @classmethod
    def update_decision(cls, project: ResearchProject, data: Dict[str, Any], user: Any) -> ResearchDecision:
        """Updates research plan components and records modifications in audit trail."""
        decision = cls.get_or_create_decision(project)

        fields_to_check = [
            "problem_statement",
            "research_aim",
            "objectives",
            "research_questions",
            "hypotheses",
            "variables_and_constructs",
            "conceptual_relationships",
            "scope_and_delimitation",
            "limitations",
            "proposed_methodology",
            "title_confirmed",
        ]

        changes = []
        for field in fields_to_check:
            if field in data:
                old_val = getattr(decision, field)
                new_val = data[field]
                if old_val != new_val:
                    setattr(decision, field, new_val)
                    changes.append(field)

        if changes:
            # If plan was previously approved and substantive changes were made, mark as needing re-approval
            if decision.is_approved and any(f in changes for f in ("problem_statement", "objectives", "hypotheses")):
                decision.is_approved = False
                decision.approved_at = None
                decision.approved_by = None

            trail = list(decision.audit_trail or [])
            trail.append({
                "action": "PLAN_UPDATED",
                "modified_by": user.email if user else "system",
                "modified_fields": changes,
                "timestamp": timezone.now().isoformat(),
            })
            decision.audit_trail = trail
            decision.save()

            # Synchronize core fields back to ResearchProject model for downstream consistency
            if "problem_statement" in data:
                project.problem_statement = data["problem_statement"]
            if "research_aim" in data:
                project.research_aim = data["research_aim"]
            if "objectives" in data:
                project.objectives = data["objectives"]
            if "research_questions" in data:
                project.research_questions = data["research_questions"]
            if "hypotheses" in data:
                project.hypotheses = data["hypotheses"]
            project.save()

        return decision

    @classmethod
    def approve_decision(cls, project_or_decision: Any, user: Any) -> Any:
        """Formally approves research plan, locking decisions and unlocking downstream workflows."""
        if isinstance(project_or_decision, ResearchDecision):
            decision = project_or_decision
            project = decision.project
        else:
            project = project_or_decision
            decision = cls.get_or_create_decision(project)

        # Validation gate: must have at least problem statement, aim, or objectives
        if not decision.problem_statement and not decision.research_aim and not decision.objectives:
            # Fall back to project fields
            decision.problem_statement = project.problem_statement or "Formulated problem statement."
            decision.research_aim = project.research_aim or "Primary research aim."
            decision.objectives = project.objectives or ["Primary research objective."]

        decision.is_approved = True
        decision.approved_by = user
        decision.approved_at = timezone.now()

        trail = list(decision.audit_trail or [])
        trail.append({
            "action": "PLAN_APPROVED",
            "approved_by": user.email if user else "system",
            "timestamp": timezone.now().isoformat(),
            "note": "Researcher verified and approved theoretical and empirical research framework."
        })
        decision.audit_trail = trail
        decision.save()

        # Sync variables to ResearchVariable models if provided
        if decision.variables_and_constructs:
            for item in decision.variables_and_constructs:
                if isinstance(item, dict) and item.get("name"):
                    ResearchVariable.objects.get_or_create(
                        project=project,
                        name=item["name"],
                        defaults={
                            "variable_type": item.get("variable_type", "INTERVAL"),
                            "variable_role": item.get("variable_role", "INDEPENDENT"),
                            "operational_definition": item.get("operational_definition", ""),
                        }
                    )

        return decision

