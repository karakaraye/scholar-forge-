from research.orcid_utils import is_valid_orcid
import re
import logging
from typing import Dict, Any, List, Optional
from django.utils import timezone
from projects.models import ResearchProject
from research.models import (
    JournalProfile,
    JournalArticleType,
    ManuscriptMetadata,
    TemplateVerificationStatus as VerificationStatus,
)

logger = logging.getLogger(__name__)


class JournalPublicationService:
    """
    Manages journal profiles, academic article structural templates (IMRaD, Review,
    Systematic Review PRISMA, Conceptual), and author submission package audits.
    """

    ARTICLE_STRUCTURES: Dict[str, Dict[str, Any]] = {
        JournalArticleType.ORIGINAL_RESEARCH: {
            "name": "Original Empirical Research (IMRaD)",
            "description": "Standard empirical research article structure adhering to IMRaD format.",
            "sections": [
                {"title": "Introduction", "description": "Research problem, background, rationale, and specific objectives."},
                {"title": "Literature Review & Hypotheses", "description": "Prior literature synthesis and formal hypotheses or research questions."},
                {"title": "Research Methodology", "description": "Research design, population, sampling, instrumentation, data collection, and analytical procedures."},
                {"title": "Results & Empirical Findings", "description": "Descriptive statistics, inferential statistical tests, tables, and figure presentations."},
                {"title": "Discussion", "description": "Substantive interpretation, comparison with prior literature, and theoretical contributions."},
                {"title": "Conclusion & Recommendations", "description": "Summary of findings, practical implications, limitations, and future research directions."},
            ],
            "required_statements": [
                "ethics_approval",
                "conflict_of_interest",
                "data_availability",
                "author_contributions",
            ],
        },
        JournalArticleType.REVIEW_ARTICLE: {
            "name": "Narrative / Thematic Review Article",
            "description": "Comprehensive synthesis of existing literature across a specific scholarly domain.",
            "sections": [
                {"title": "Introduction", "description": "Scope of the review, rationale, and conceptual boundaries."},
                {"title": "Literature Search Methodology", "description": "Databases queried, search terms, and inclusion criteria."},
                {"title": "Thematic Synthesis", "description": "Major theoretical streams, historical evolution, and key debates."},
                {"title": "Critical Evaluation", "description": "Methodological limitations of existing literature and conflicting findings."},
                {"title": "Future Research Directions", "description": "Identified research gaps, conceptual agenda, and proposed research questions."},
                {"title": "Conclusion", "description": "Summary of state of knowledge."},
            ],
            "required_statements": [
                "conflict_of_interest",
                "funding_statement",
            ],
        },
        JournalArticleType.SYSTEMATIC_REVIEW: {
            "name": "Systematic Review & Meta-Analysis (PRISMA)",
            "description": "Evidence-based systematic literature review strictly aligned with PRISMA guidelines.",
            "sections": [
                {"title": "Introduction & Protocol", "description": "Review objective, protocol registration (e.g. PROSPERO), and research questions."},
                {"title": "Eligibility Criteria & Search Strategy", "description": "PICO/PECO criteria, database query strings, and date limits."},
                {"title": "Study Selection & Data Extraction", "description": "Screening workflow, inter-rater reliability, and data extraction fields."},
                {"title": "Risk of Bias Assessment", "description": "Quality assessment tools (e.g. ROBINS-I, Cochrane RoB 2) and evaluation results."},
                {"title": "Synthesis of Results", "description": "Flow diagram (PRISMA), forest plots, meta-regression, or qualitative evidence synthesis."},
                {"title": "Discussion & Confidence in Cumulative Evidence", "description": "GRADE assessment, limitations, and policy implications."},
            ],
            "required_statements": [
                "protocol_registration",
                "conflict_of_interest",
                "data_availability",
            ],
        },
        JournalArticleType.CONCEPTUAL_THEORETICAL: {
            "name": "Conceptual / Theoretical Paper",
            "description": "Development of novel theoretical frameworks, propositions, or conceptual paradigms.",
            "sections": [
                {"title": "Introduction", "description": "Theoretical anomaly, conceptual dilemma, or emerging phenomenon requiring novel theory."},
                {"title": "Theoretical Foundations", "description": "Foundational paradigms, assumptions, and critical literature interrogation."},
                {"title": "Conceptual Framework & Propositions", "description": "Formal proposition development (P1, P2...), construct definitions, and conceptual model."},
                {"title": "Theoretical & Methodological Implications", "description": "How the proposed framework advances the discipline and empirical testing avenues."},
                {"title": "Conclusion", "description": "Summary of conceptual contribution."},
            ],
            "required_statements": [
                "conflict_of_interest",
            ],
        },
    }

    @classmethod
    def get_article_structure(cls, article_type: str) -> Dict[str, Any]:
        """
        Retrieves canonical section breakdown and mandatory statements for an article type.
        """
        return cls.ARTICLE_STRUCTURES.get(article_type, cls.ARTICLE_STRUCTURES[JournalArticleType.ORIGINAL_RESEARCH])

    @classmethod
    def seed_journal_profiles(cls) -> int:
        """
        Seeds recognized academic journals with authoritative publication specifications.
        """
        seeded = 0

        # 1. Nature / Science Standard
        if not JournalProfile.objects.filter(name="Nature Research Articles").exists():
            JournalProfile.objects.create(
                name="Nature Research Articles",
                publisher="Springer Nature",
                verification_evidence_summary="Verified against Nature Editorial and Publishing Policies, Initial Submission Guidelines 2024.",
                issn="0028-0836",
                scope="Multidisciplinary high-impact scientific research.",
                submission_url="https://www.nature.com/nature/for-authors",
                author_guidelines_url="https://www.nature.com/nature/for-authors/initial-submission",
                article_type=JournalArticleType.ORIGINAL_RESEARCH,
                word_limit=5000,
                abstract_word_limit=200,
                keyword_min=3,
                keyword_max=5,
                reference_limit=50,
                required_sections=["Introduction", "Results", "Discussion", "Methods"],
                required_statements=["ethics_approval", "data_availability", "code_availability", "author_contributions", "competing_interests"],
                citation_style="nature",
                verification_status=VerificationStatus.OFFICIALLY_VERIFIED,
                guideline_version="2026.1",
                last_reviewed_date=timezone.now(),
            )
            seeded += 1

        # 2. Elsevier Journal of Business Research
        if not JournalProfile.objects.filter(name="Elsevier — Journal of Business Research").exists():
            JournalProfile.objects.create(
                name="Elsevier — Journal of Business Research",
                publisher="Elsevier",
                verification_evidence_summary="Verified against Elsevier Journal of Business Research Guide for Authors 2024.",
                issn="0148-2963",
                scope="Theoretical and empirical business, management, and marketing research.",
                submission_url="https://www.sciencedirect.com/journal/journal-of-business-research",
                author_guidelines_url="https://www.elsevier.com/journals/journal-of-business-research/0148-2963/guide-for-authors",
                article_type=JournalArticleType.ORIGINAL_RESEARCH,
                word_limit=10000,
                abstract_word_limit=250,
                keyword_min=4,
                keyword_max=6,
                reference_limit=80,
                required_sections=["Introduction", "Theoretical Background & Hypotheses", "Methodology", "Empirical Results", "Discussion", "Conclusion"],
                required_statements=["conflict_of_interest", "funding_statement", "author_contributions"],
                citation_style="apa-7th",
                verification_status=VerificationStatus.OFFICIALLY_VERIFIED,
                guideline_version="2026.1",
                last_reviewed_date=timezone.now(),
            )
            seeded += 1

        # 3. IEEE Transactions on Knowledge and Data Engineering
        if not JournalProfile.objects.filter(name="IEEE Transactions on Knowledge and Data Engineering").exists():
            JournalProfile.objects.create(
                name="IEEE Transactions on Knowledge and Data Engineering",
                publisher="IEEE Computer Society",
                verification_evidence_summary="Verified against IEEE Computer Society Author Resources and Transactions Guidelines 2024.",
                issn="1041-4347",
                scope="Computer science, database systems, artificial intelligence, and data mining.",
                submission_url="https://www.computer.org/csdl/journal/tk",
                author_guidelines_url="https://www.computer.org/publications/author-resources/author-guidelines",
                article_type=JournalArticleType.ORIGINAL_RESEARCH,
                word_limit=12000,
                abstract_word_limit=200,
                keyword_min=4,
                keyword_max=6,
                reference_limit=60,
                required_sections=["Introduction", "Related Work", "System Architecture / Algorithm", "Experimental Evaluation", "Conclusion"],
                required_statements=["conflict_of_interest", "data_availability"],
                citation_style="ieee",
                verification_status=VerificationStatus.OFFICIALLY_VERIFIED,
                guideline_version="2026.1",
                last_reviewed_date=timezone.now(),
            )
            seeded += 1

        # 4. PLOS ONE
        if not JournalProfile.objects.filter(name="PLOS ONE Multidisciplinary Standard").exists():
            JournalProfile.objects.create(
                name="PLOS ONE Multidisciplinary Standard",
                publisher="Public Library of Science",
                verification_evidence_summary="Verified against PLOS ONE Submission Guidelines and Open Access Policy Criteria 2024.",
                issn="1932-6203",
                scope="Open access multidisciplinary primary scientific research across medicine, biology, physics, and social sciences.",
                submission_url="https://journals.plos.org/plosone/s/submission-guidelines",
                author_guidelines_url="https://journals.plos.org/plosone/s/criteria-for-publication",
                article_type=JournalArticleType.ORIGINAL_RESEARCH,
                word_limit=15000,
                abstract_word_limit=300,
                keyword_min=3,
                keyword_max=6,
                reference_limit=None,
                required_sections=["Introduction", "Materials and Methods", "Results", "Discussion", "Conclusions"],
                required_statements=["ethics_approval", "data_availability", "financial_disclosure", "competing_interests"],
                citation_style="vancouver",
                verification_status=VerificationStatus.OFFICIALLY_VERIFIED,
                guideline_version="2026.1",
                last_reviewed_date=timezone.now(),
            )
            seeded += 1

        return seeded

    @classmethod
    def audit_submission_readiness(
        cls,
        project: ResearchProject,
        journal: Optional[JournalProfile] = None,
    ) -> Dict[str, Any]:
        """
        Audits project manuscript completeness against target journal submission specifications.
        """
        metadata, _ = ManuscriptMetadata.objects.get_or_create(project=project)
        document = project.documents.first()
        sections = list(document.sections.all().order_by('order_index')) if document else []

        checks: List[Dict[str, Any]] = []
        is_ready = True

        # 1. Author and Corresponding Author
        has_author = bool(metadata.corresponding_author_name and metadata.corresponding_author_email)
        checks.append({
            "check": "Corresponding Author Contact",
            "passed": has_author,
            "details": f"{metadata.corresponding_author_name} ({metadata.corresponding_author_email})" if has_author else "Missing corresponding author contact.",
            "mandatory": True,
        })
        if not has_author:
            is_ready = False

        # 2. ORCID Verification
        orcids = metadata.orcid_identifiers or []
        has_orcids = len(orcids) > 0 and all(is_valid_orcid(o.get('orcid', '')) for o in orcids)
        checks.append({
            "check": "Author ORCID Identifiers",
            "passed": has_orcids,
            "details": f"{len(orcids)} verified ORCID identifier(s) attached." if has_orcids else "At least one author must provide a valid 16-digit hyphenated ORCID.",
            "mandatory": True,
        })
        if not has_orcids:
            is_ready = False

        # 3. Institutional Affiliations
        affils = metadata.affiliations or []
        has_affils = len(affils) > 0
        checks.append({
            "check": "Institutional Affiliations",
            "passed": has_affils,
            "details": f"{len(affils)} institution affiliation(s) recorded." if has_affils else "Author academic affiliations are required.",
            "mandatory": True,
        })
        if not has_affils:
            is_ready = False

        # 4. Mandatory Statements (Remediation C: Contextual Ethics Review Check)
        study_design = (getattr(metadata, 'study_design_type', '') or '').upper()
        involves_subjects = getattr(metadata, 'involves_human_or_animal_subjects', False)
        exemption = bool(getattr(metadata, 'ethics_exemption_reason', ''))
        non_irb_designs = [
            'COMPUTATIONAL', 'SIMULATION', 'SYSTEMATIC_REVIEW', 'LITERATURE_REVIEW',
            'THEORETICAL', 'CONCEPTUAL', 'SECONDARY_DATA', 'SECONDARY_OPEN_DATA'
        ]
        is_exempt_design = any(d in study_design for d in non_irb_designs)
        ethics_mandatory = involves_subjects or (not is_exempt_design and not exemption)
        ethics_passed = bool(metadata.ethics_approval_statement) or exemption or not ethics_mandatory

        statements = [
            ("Ethics Approval Statement", ethics_passed, "Mandatory for empirical human or animal cohort research (or explicit exemption)."),
            ("Data Availability Statement", bool(metadata.data_availability_statement), "Required by all modern open science journals."),
            ("Conflict of Interest Statement", bool(metadata.conflict_of_interest_statement), "Explicit disclosure required (or declaration of none)."),
            ("Funding / Financial Disclosure", bool(metadata.funding_statement), "Grant numbers or declaration of no external funding."),
        ]
        for name, passed, note in statements:
            checks.append({
                "check": name,
                "passed": passed,
                "details": "Declared and recorded." if passed else note,
                "mandatory": True,
            })
            if not passed:
                is_ready = False

        # 5. Word limit check if target journal specified
        if journal and journal.word_limit:
            total_words = sum(s.word_count for s in sections)
            passed = total_words <= journal.word_limit
            checks.append({
                "check": f"Journal Word Limit ({journal.word_limit} words)",
                "passed": passed,
                "details": f"Current: {total_words} words (Limit: {journal.word_limit}).",
                "mandatory": True,
            })
            if not passed:
                is_ready = False

        metadata.is_complete = is_ready
        metadata.save(update_fields=['is_complete'])

        return {
            "project_id": str(project.id),
            "journal_name": journal.name if journal else "General Academic Journal",
            "is_submission_ready": is_ready,
            "readiness_score": round((sum(1 for c in checks if c['passed']) / len(checks)) * 100, 1),
            "checks": checks,
        }
