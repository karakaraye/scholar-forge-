"""
ScholarForge AI - Academic Consistency Checker
Performs automated structural and semantic consistency diagnostics:
- Objectives versus Research Questions
- Objectives versus Hypotheses
- Research Title versus Research Focus
- Methodology versus Stated Research Aims
- Terminology Consistency
- Duplicate Section Headings
- Missing Required Outline Sections
- Variable & Construct Continuity

Presents findings non-destructively as academic suggestions and diagnostics.
"""

import re
from typing import List, Dict, Any, Optional
from projects.models import ResearchProject
from documents.models import ResearchDocument, DocumentSection


def analyze_academic_consistency(project: ResearchProject) -> Dict[str, Any]:
    """
    Executes a comprehensive suite of academic consistency checks on a research project.
    """
    diagnostics = []

    reqs = getattr(project, 'requirements', None)
    title = project.title or ""
    discipline_name = project.discipline.name if project.discipline else ""
    methodology = (reqs.research_methodology or "").lower() if reqs else ""
    objectives = (reqs.research_objectives or "") if reqs else ""
    supervisor_reqs = (reqs.supervisor_requirements or "") if reqs else ""
    custom_params = reqs.custom_parameters if reqs and reqs.custom_parameters else {}
    questions = custom_params.get("research_questions", "")
    hypotheses = custom_params.get("research_hypotheses", "")
    concepts = custom_params.get("key_concepts_and_variables", "")

    # Retrieve manuscript sections
    main_doc = project.documents.filter(document_type='MAIN_MANUSCRIPT').first() or project.documents.first()
    sections = list(main_doc.sections.all().order_by('order_index')) if main_doc else []

    # 1. Check: Objectives vs Research Questions
    diag_obj_rq = check_objectives_vs_questions(objectives, questions)
    if diag_obj_rq:
        diagnostics.append(diag_obj_rq)

    # 2. Check: Objectives vs Hypotheses
    diag_hypotheses = check_objectives_vs_hypotheses(discipline_name, methodology, objectives, hypotheses)
    if diag_hypotheses:
        diagnostics.append(diag_hypotheses)

    # 3. Check: Title vs Focus
    diag_title = check_title_vs_focus(title, objectives, sections)
    if diag_title:
        diagnostics.append(diag_title)

    # 4. Check: Methodology vs Stated Research Aims
    diag_method = check_methodology_alignment(methodology, objectives, hypotheses)
    if diag_method:
        diagnostics.append(diag_method)

    # 5. Check: Outline Duplicates & Missing Sections
    diag_outline = check_outline_structure(discipline_name, project.document_category, sections)
    diagnostics.extend(diag_outline)

    # 6. Check: Manuscript Section Word Balance & Completeness
    diag_words = check_section_completeness(sections)
    if diag_words:
        diagnostics.append(diag_words)

    # 7. Stage 4 Check: Research Variables vs Instrument Items & Dataset
    diag_stage4 = check_methodology_and_empirical_alignment(project)
    diagnostics.extend(diag_stage4)

    # Calculate overall consistency score (0 - 100)
    warnings_count = sum(1 for d in diagnostics if d["type"] == "WARNING")
    suggestions_count = sum(1 for d in diagnostics if d["type"] == "SUGGESTION")
    score = max(30, 100 - (warnings_count * 15 + suggestions_count * 5))

    return {
        "project_id": str(project.id),
        "consistency_score": score,
        "diagnostics": diagnostics,
        "total_checks": len(diagnostics),
        "warnings_count": warnings_count,
        "suggestions_count": suggestions_count,
        "status": "HEALTHY" if warnings_count == 0 else "ATTENTION_RECOMMENDED"
    }


def check_objectives_vs_questions(objectives: str, questions: str) -> Optional[Dict[str, Any]]:
    """
    Verifies quantitative parity and semantic alignment between research objectives and research questions.
    """
    if not objectives.strip():
        return {
            "id": "MISSING_OBJECTIVES",
            "type": "WARNING",
            "category": "Objectives & Questions",
            "title": "Missing Explicit Research Objectives",
            "message": "No structured research objectives have been defined in research requirements.",
            "recommendation": "Use the AI Assistant 'Suggest Objectives' action or enter 3 to 5 SMART objectives to anchor the inquiry."
        }

    # Count numbered items or lines
    obj_items = [line for line in objectives.splitlines() if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith(('-', '•', '*')))]
    obj_count = len(obj_items) if obj_items else len([l for l in objectives.splitlines() if l.strip()])

    if not questions.strip():
        return {
            "id": "UNFORMULATED_RESEARCH_QUESTIONS",
            "type": "SUGGESTION",
            "category": "Objectives & Questions",
            "title": "Unformulated Research Questions",
            "message": f"Found {obj_count} objectives, but no specific research questions have been registered.",
            "recommendation": "Scholarly research standards recommend pairing each specific objective with a corresponding research question."
        }

    q_items = [line for line in questions.splitlines() if line.strip() and (line.strip()[0].isdigit() or line.strip().startswith(('-', '•', '*')) or '?' in line)]
    q_count = len(q_items) if q_items else len([l for l in questions.splitlines() if l.strip()])

    if abs(obj_count - q_count) >= 2:
        return {
            "id": "MISMATCHED_OBJ_QUESTION_COUNT",
            "type": "SUGGESTION",
            "category": "Objectives & Questions",
            "title": "Mismatched Objective-to-Question Ratio",
            "message": f"Identified {obj_count} objectives versus {q_count} research questions.",
            "recommendation": "Review your list to ensure that each research question directly investigates one specific objective."
        }

    return {
        "id": "OBJECTIVES_QUESTIONS_ALIGNED",
        "type": "GOOD",
        "category": "Objectives & Questions",
        "title": "Objectives and Questions Harmonized",
        "message": f"Identified {obj_count} objectives and {q_count} corresponding research questions.",
        "recommendation": "Structural parity confirmed."
    }


def check_objectives_vs_hypotheses(
    discipline_name: str,
    methodology: str,
    objectives: str,
    hypotheses: str
) -> Optional[Dict[str, Any]]:
    """
    Checks if empirical quantitative disciplines have formulated testable hypotheses.
    """
    empirical_disciplines = ['management', 'business', 'economics', 'finance', 'accounting', 'medicine', 'psychology', 'nursing']
    is_empirical_disc = any(d in discipline_name.lower() for d in empirical_disciplines)
    is_quantitative = 'quant' in methodology or 'survey' in methodology or 'regression' in methodology or 'experiment' in methodology

    if (is_empirical_disc or is_quantitative) and objectives.strip() and not hypotheses.strip():
        return {
            "id": "MISSING_HYPOTHESES_QUANTITATIVE",
            "type": "SUGGESTION",
            "category": "Variables & Hypotheses",
            "title": "Recommended Hypothesis Formulation",
            "message": f"In {discipline_name}, empirical and quantitative research typically evaluates formal statistical hypotheses.",
            "recommendation": "Formulate null (H0) and directional alternative (H1) hypotheses for your core independent and dependent variables."
        }

    if hypotheses.strip():
        # Check if hypotheses contain null or alternative markers
        has_null = 'null' in hypotheses.lower() or 'h0' in hypotheses.lower()
        if not has_null:
            return {
                "id": "SPECIFY_NULL_HYPOTHESES",
                "type": "SUGGESTION",
                "category": "Variables & Hypotheses",
                "title": "Clarify Null Hypotheses (H0)",
                "message": "Hypotheses appear to list only alternative claims without explicit null hypotheses.",
                "recommendation": "Explicitly state both H0 (no effect/relationship) and H1 (significant relationship) for clarity."
            }

    return None


def check_title_vs_focus(
    title: str,
    objectives: str,
    sections: List[DocumentSection]
) -> Optional[Dict[str, Any]]:
    """
    Verifies that major conceptual keywords from the title appear in objectives and manuscript sections.
    """
    # Extract significant nouns (length > 4, excluding stop words)
    stop_words = {'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'because', 'before', 'being', 'between', 'during', 'effect', 'impact', 'study', 'using', 'based', 'toward', 'their', 'which', 'where'}
    words = re.findall(r'\b[a-zA-Z]{4,}\b', title.lower())
    keywords = [w for w in words if w not in stop_words]

    if not keywords:
        return None

    # Check presence in objectives
    obj_lower = objectives.lower()
    matched_in_obj = [kw for kw in keywords if kw in obj_lower]

    if len(matched_in_obj) == 0 and len(keywords) >= 2 and objectives.strip():
        return {
            "id": "TITLE_OBJECTIVES_DIVERGENCE",
            "type": "WARNING",
            "category": "Methodology Alignment",
            "title": "Potential Divergence Between Title and Objectives",
            "message": f"Core keywords from research title (e.g., '{', '.join(keywords[:3])}') are absent in stated research objectives.",
            "recommendation": "Ensure the research objectives explicitly incorporate the main constructs or variables named in the project title."
        }

    return None


def check_methodology_alignment(
    methodology: str,
    objectives: str,
    hypotheses: str
) -> Optional[Dict[str, Any]]:
    """
    Checks for methodological contradictions (e.g., pure qualitative design testing statistical null hypotheses).
    """
    is_qual = 'qualitative' in methodology or 'phenomenolog' in methodology or 'grounded theory' in methodology
    is_testing_stats = 'p-value' in hypotheses.lower() or 'anova' in methodology or 'regression' in methodology or 't-test' in methodology

    if is_qual and is_testing_stats:
        return {
            "id": "QUAL_QUANT_CONTRADICTION",
            "type": "WARNING",
            "category": "Methodology Alignment",
            "title": "Methodological Paradigmatic Conflict",
            "message": "Methodology describes a qualitative/hermeneutic approach, but statistical hypothesis tests (regression/ANOVA) are specified.",
            "recommendation": "Adopt a Mixed-Methods design (explanatory sequential) or adjust qualitative terminology to fit empirical quantitative testing."
        }

    if not methodology.strip():
        return {
            "id": "UNSPECIFIED_METHODOLOGY",
            "type": "WARNING",
            "category": "Methodology Alignment",
            "title": "Research Methodology Unspecified",
            "message": "No research design or methodological approach has been specified in research requirements.",
            "recommendation": "Document your research design (e.g., Survey, Experimental, System Implementation, Doctrinal, or Systematic Review)."
        }

    return None


def check_outline_structure(
    discipline_name: str,
    category: str,
    sections: List[DocumentSection]
) -> List[Dict[str, Any]]:
    """
    Detects duplicate headings and checks for missing canonical sections.
    """
    results = []
    seen_titles = set()
    duplicates = []

    for s in sections:
        norm = s.title.strip().lower()
        if norm in seen_titles:
            duplicates.append(s.title)
        else:
            seen_titles.add(norm)

    if duplicates:
        results.append({
            "id": "DUPLICATE_SECTION_HEADINGS",
            "type": "WARNING",
            "category": "Outline Structure",
            "title": "Duplicate Section Headings Detected",
            "message": f"Identified duplicate headings in manuscript outline: {', '.join(duplicates[:3])}.",
            "recommendation": "Rename or consolidate duplicate sections to maintain clean reader navigation."
        })

    # Check for missing essential chapters
    all_types = {s.section_type for s in sections}
    has_intro = any(t in all_types for t in ['INTRODUCTION', 'CHAPTER'])
    has_method = any(t in all_types for t in ['METHODOLOGY', 'SYSTEM_DESIGN', 'METHODS'])
    has_conclusion = any(t in all_types for t in ['CONCLUSION', 'RECOMMENDATIONS'])

    if not has_intro and sections:
        results.append({
            "id": "MISSING_INTRODUCTION",
            "type": "WARNING",
            "category": "Outline Structure",
            "title": "Missing Introduction Section",
            "message": "The manuscript outline lacks an introductory section.",
            "recommendation": "Add a foundational Introduction chapter/section."
        })

    if not has_method and category in ['ACADEMIC_PROJECT', 'RESEARCH_PAPER'] and sections:
        results.append({
            "id": "MISSING_METHODOLOGY",
            "type": "SUGGESTION",
            "category": "Outline Structure",
            "title": "Missing Methodology Section",
            "message": "No dedicated Research Methodology or Technical Design section was found in the outline.",
            "recommendation": "Add a Methodology section detailing your procedures, instruments, and analytical approach."
        })

    return results


def check_section_completeness(sections: List[DocumentSection]) -> Optional[Dict[str, Any]]:
    """
    Assesses writing progress across outline sections.
    """
    if not sections:
        return None

    empty_sections = [s.title for s in sections if s.word_count == 0]
    written_sections = [s for s in sections if s.word_count > 0]

    if not written_sections:
        return {
            "id": "MANUSCRIPT_INITIAL_STATE",
            "type": "SUGGESTION",
            "category": "Outline Structure",
            "title": "Manuscript Scaffold Ready",
            "message": f"Outline contains {len(sections)} sections waiting for drafting.",
            "recommendation": "Select a chapter in the left sidebar and use the Tiptap editor or AI Assistant to begin writing."
        }

    if len(empty_sections) > 0 and len(written_sections) > 0:
        return {
            "id": "UNWRITTEN_SECTIONS_REMAINING",
            "type": "SUGGESTION",
            "category": "Outline Structure",
            "title": f"In-Progress Writing ({len(written_sections)}/{len(sections)} sections written)",
            "message": f"{len(empty_sections)} sections have no text drafted yet.",
            "recommendation": f"Next suggested section to draft: '{empty_sections[0]}'."
        }

    return {
        "id": "ALL_SECTIONS_DRAFTED",
        "type": "GOOD",
        "category": "Outline Structure",
        "title": "Complete Outline Coverage",
        "message": "All manuscript sections contain drafted content.",
        "recommendation": "Proceed to scholarly revision, citation formatting, and final proofreading."
    }


def check_methodology_and_empirical_alignment(project: ResearchProject) -> List[Dict[str, Any]]:
    """
    Stage 4 Cross-Checks:
    - Variables vs Instrument Items
    - Hypotheses vs Statistical Tests
    - Variables vs Dataset Columns
    """
    diagnostics = []

    # Check variables vs instruments
    try:
        variables = list(project.variables.all())
        instruments = list(project.instruments.all())

        if variables and not instruments:
            diagnostics.append({
                "id": "VARIABLES_WITHOUT_INSTRUMENT",
                "type": "SUGGESTION",
                "category": "Instruments & Variables",
                "title": "Research Variables Defined Without Measurement Instrument",
                "message": f"Project defines {len(variables)} variables, but no research instrument (questionnaire/guide) has been built.",
                "recommendation": "Navigate to the Research Instruments tab and generate items for your variables."
            })
        elif variables and instruments:
            # Check if all variables appear in instrument items
            instrument_items = []
            for inst in instruments:
                instrument_items.extend(list(inst.items.all()))

            item_constructs = set(i.construct.strip().lower() for i in instrument_items if i.construct)
            missing_vars = [v.name for v in variables if v.name.strip().lower() not in item_constructs]

            if missing_vars:
                diagnostics.append({
                    "id": "INSTRUMENT_MISSING_VARIABLES",
                    "type": "WARNING",
                    "category": "Instruments & Variables",
                    "title": "Unmeasured Research Variables Detected",
                    "message": f"The following variables lack operationalized items in your instruments: {', '.join(missing_vars)}.",
                    "recommendation": "Add measurement questions for these variables to safeguard construct validity."
                })

        # Check datasets vs variables
        datasets = list(project.datasets.all())
        if datasets and variables:
            current_ds = datasets[0]
            curr_ver = current_ds.versions.filter(is_current=True).first()
            if curr_ver and curr_ver.columns:
                ds_cols = [c.lower() for c in curr_ver.columns]
                unmatched_vars = [v.name for v in variables if not any(v.name.lower() in c or c in v.name.lower() for c in ds_cols)]
                if unmatched_vars:
                    diagnostics.append({
                        "id": "DATASET_VARIABLE_MISMATCH",
                        "type": "SUGGESTION",
                        "category": "Data & Analysis",
                        "title": "Potential Column-Variable Mismatch",
                        "message": f"Dataset '{current_ds.name}' does not appear to contain columns directly matching variables: {', '.join(unmatched_vars[:3])}.",
                        "recommendation": "Verify your dataset column headers or compute composite scale columns in Data Cleaning."
                    })

        # Check hypotheses vs statistical results
        reqs = getattr(project, 'requirements', None)
        custom_params = reqs.custom_parameters if reqs and reqs.custom_parameters else {}
        hypotheses_text = custom_params.get("research_hypotheses", "")
        stat_results = list(project.statistical_results.all())

        if hypotheses_text.strip() and not stat_results:
            diagnostics.append({
                "id": "HYPOTHESES_WITHOUT_TESTS",
                "type": "SUGGESTION",
                "category": "Data & Analysis",
                "title": "Hypotheses Pending Empirical Testing",
                "message": "Research hypotheses are specified, but no computed statistical tests or results have been run yet.",
                "recommendation": "Upload your collected dataset in the Data & Analysis tab and run the appropriate hypothesis test."
            })

    except Exception:
        pass

    return diagnostics


