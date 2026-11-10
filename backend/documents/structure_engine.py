"""
ScholarForge AI - Academic Structure Engine
Provides intelligent, multidisciplinary manuscript outline scaffolding tailored to:
- Document Category (Academic Project, Research Paper, Journal Article)
- Document Subtype (Undergraduate Thesis, Master's Thesis, PhD Dissertation, Proposal, Systematic Review, etc.)
- Academic Discipline (Management, Computer Science, Engineering, Medicine, Law, Humanities, etc.)
- Academic Level & Research Methodology

Avoids forcing a rigid five-chapter structure across all fields of scholarship.
"""

from typing import List, Dict, Any, Optional
from documents.models import ResearchDocument, DocumentSection


# ============================================================================
# TEMPLATE DEFINITIONS ACROSS DISCIPLINES AND DOCUMENT TYPES
# ============================================================================

def get_management_project_structure(subtype: str) -> List[Dict[str, Any]]:
    """
    Standard Business / Management / Economics / Accounting Project Structure.
    Features the classical 5-chapter empirical structure with comprehensive subsections.
    """
    return [
        {
            "title": "Chapter One: Introduction",
            "section_type": "CHAPTER",
            "description": "Foundational overview of the research topic and organizational context.",
            "subsections": [
                {"title": "Background to the Study", "section_type": "INTRODUCTION", "description": "Contextualize the organizational, market, or economic setting."},
                {"title": "Statement of the Problem", "section_type": "PROBLEM_STATEMENT", "description": "Clearly state the specific business/managerial deficit or empirical dilemma."},
                {"title": "Objectives of the Study", "section_type": "OBJECTIVES", "description": "Formulate general aim and specific measurable research objectives."},
                {"title": "Research Questions", "section_type": "RESEARCH_QUESTIONS", "description": "Key research questions directly answering each research objective."},
                {"title": "Research Hypotheses", "section_type": "HYPOTHESES", "description": "Null (H0) and alternate (H1) testable hypotheses for empirical analysis."},
                {"title": "Significance of the Study", "section_type": "SIGNIFICANCE", "description": "Practical value to managers, policymakers, and contribution to scholarship."},
                {"title": "Scope of the Study", "section_type": "SCOPE", "description": "Geographical, unit of analysis, and temporal boundaries."},
                {"title": "Operational Definition of Terms", "section_type": "DEFINITIONS", "description": "Operationalized definitions of core managerial variables."},
            ]
        },
        {
            "title": "Chapter Two: Review of Related Literature",
            "section_type": "CHAPTER",
            "description": "Comprehensive appraisal of existing scholarly literature, concepts, and theories.",
            "subsections": [
                {"title": "Conceptual Review", "section_type": "CONCEPTUAL_FRAMEWORK", "description": "Elaboration of independent, dependent, and moderating variables."},
                {"title": "Theoretical Framework", "section_type": "THEORETICAL_FRAMEWORK", "description": "Foundational management theories anchoring the study."},
                {"title": "Empirical Review", "section_type": "EMPIRICAL_REVIEW", "description": "Critical review of recent prior studies, comparing methodologies and findings."},
                {"title": "Summary of Literature & Research Gap", "section_type": "RESEARCH_GAP", "description": "Synthesized gaps in current literature that this study addresses."},
            ]
        },
        {
            "title": "Chapter Three: Research Methodology",
            "section_type": "CHAPTER",
            "description": "Operational blueprint for data gathering and scientific investigation.",
            "subsections": [
                {"title": "Research Design", "section_type": "METHODOLOGY", "description": "Survey design, cross-sectional, longitudinal, or experimental approach."},
                {"title": "Population of the Study", "section_type": "POPULATION", "description": "Target enterprise, employee, consumer, or industry demographic."},
                {"title": "Sample Size and Sampling Technique", "section_type": "SAMPLING", "description": "Sample determination (Taro Yamane, Cochran, etc.) and sampling strategy."},
                {"title": "Research Instrument", "section_type": "INSTRUMENTS", "description": "Structured questionnaire, interview guide, or secondary financial datasets."},
                {"title": "Validity and Reliability of Instrument", "section_type": "VALIDITY_RELIABILITY", "description": "Content/construct validity and Cronbach's alpha reliability index."},
                {"title": "Method of Data Collection", "section_type": "DATA_COLLECTION", "description": "Fieldwork procedures and ethical compliance."},
                {"title": "Method of Data Analysis", "section_type": "DATA_ANALYSIS", "description": "Descriptive statistics, regression models, SEM, or econometrics."},
            ]
        },
        {
            "title": "Chapter Four: Data Presentation, Analysis and Discussion",
            "section_type": "CHAPTER",
            "description": "Empirical presentation of statistical results and hypothesis tests.",
            "subsections": [
                {"title": "Response Rate & Demographic Profile", "section_type": "DEMOGRAPHICS", "description": "Overview of respondents and return percentages."},
                {"title": "Data Presentation and Descriptive Analysis", "section_type": "DESCRIPTIVE_STATS", "description": "Tables, mean, standard deviation, and percentage frequency distributions."},
                {"title": "Hypotheses Testing", "section_type": "HYPOTHESIS_TESTING", "description": "Statistical significance testing (ANOVA, t-test, multiple regression, p-values)."},
                {"title": "Discussion of Findings", "section_type": "DISCUSSION", "description": "Relating empirical findings back to theoretical framework and prior studies."},
            ]
        },
        {
            "title": "Chapter Five: Summary, Conclusion and Recommendations",
            "section_type": "CHAPTER",
            "description": "Executive synthesis, managerial implications, and concluding insights.",
            "subsections": [
                {"title": "Summary of Major Findings", "section_type": "FINDINGS_SUMMARY", "description": "Concise summary answering each specific objective."},
                {"title": "Conclusion", "section_type": "CONCLUSION", "description": "Logical academic inference drawn from verified findings."},
                {"title": "Recommendations", "section_type": "RECOMMENDATIONS", "description": "Actionable, evidence-grounded recommendations for industry executives."},
                {"title": "Contribution to Knowledge", "section_type": "CONTRIBUTION", "description": "New conceptual, theoretical, or empirical additions to scholarship."},
                {"title": "Suggestions for Further Studies", "section_type": "FUTURE_WORK", "description": "Unexplored avenues and future research questions."},
            ]
        }
    ]


def get_cs_engineering_project_structure(subtype: str) -> List[Dict[str, Any]]:
    """
    Computer Science, Software Engineering, IT & Engineering Structure.
    Focuses on Problem Formulation, System Architecture, Algorithm Implementation, and Verification.
    """
    return [
        {
            "title": "Chapter 1: Introduction",
            "section_type": "CHAPTER",
            "description": "Technical problem domain, research motivation, and scope.",
            "subsections": [
                {"title": "Background to the Problem", "section_type": "INTRODUCTION", "description": "Technological context and existing systems limitations."},
                {"title": "Problem Statement", "section_type": "PROBLEM_STATEMENT", "description": "Exact computational or engineering challenge being addressed."},
                {"title": "Aim and Objectives", "section_type": "OBJECTIVES", "description": "Main project goal and technical milestones (requirements, architecture, implementation, evaluation)."},
                {"title": "Significance of the Project", "section_type": "SIGNIFICANCE", "description": "Engineering impact, efficiency gains, or technical contribution."},
                {"title": "Scope and Limitations", "section_type": "SCOPE", "description": "Technical bounds, hardware/software constraints, and operational assumptions."},
                {"title": "Project Organization", "section_type": "OUTLINE", "description": "Structure of the remainder of the manuscript."},
            ]
        },
        {
            "title": "Chapter 2: Literature Review and Related Systems",
            "section_type": "CHAPTER",
            "description": "Theoretical computational foundations and state-of-the-art benchmark systems.",
            "subsections": [
                {"title": "Theoretical Foundations", "section_type": "THEORY", "description": "Algorithms, mathematical modeling, and core domain concepts."},
                {"title": "Review of Related Work & Existing Systems", "section_type": "RELATED_WORK", "description": "Critical review of existing software architectures, algorithms, or papers."},
                {"title": "Comparative Analysis of Existing Approaches", "section_type": "COMPARATIVE_ANALYSIS", "description": "Structured matrix comparing features, performance, and limitations."},
                {"title": "Identified Technical Deficiencies & Gap", "section_type": "RESEARCH_GAP", "description": "Deficiencies in existing solutions justifying the proposed system."},
            ]
        },
        {
            "title": "Chapter 3: System Requirements and Architectural Design",
            "section_type": "CHAPTER",
            "description": "Engineering specifications, design patterns, and system modeling.",
            "subsections": [
                {"title": "Requirements Specification", "section_type": "REQUIREMENTS", "description": "Functional and non-functional requirements (throughput, latency, security)."},
                {"title": "System Architecture & High-Level Design", "section_type": "ARCHITECTURE", "description": "Block diagrams, microservices/component diagrams, dataflow."},
                {"title": "Algorithm Design & Computational Workflow", "section_type": "ALGORITHMS", "description": "Pseudocode, algorithmic time/space complexity analysis."},
                {"title": "Data Modeling and Database Schema", "section_type": "DATA_MODEL", "description": "Entity-Relationship models, schemas, and API contracts."},
                {"title": "Security, Scalability and Fault Tolerance Design", "section_type": "SECURITY", "description": "Threat model, encryption, failover, and isolation."},
            ]
        },
        {
            "title": "Chapter 4: Implementation and System Verification",
            "section_type": "CHAPTER",
            "description": "Concrete development details, deployment environment, and testing protocols.",
            "subsections": [
                {"title": "Implementation Environment and Tech Stack", "section_type": "TECH_STACK", "description": "Languages, frameworks, libraries, runtime, and hardware setup."},
                {"title": "Core Module Implementation Details", "section_type": "IMPLEMENTATION", "description": "Detailed walkthrough of critical computational routines and services."},
                {"title": "Testing and Verification Strategy", "section_type": "TESTING", "description": "Unit tests, integration tests, fuzzing, and stress test suites."},
                {"title": "Test Results and Defect Analysis", "section_type": "TEST_RESULTS", "description": "Code coverage metrics, pass/fail logs, and bug resolution."},
            ]
        },
        {
            "title": "Chapter 5: Evaluation, Discussion and Future Work",
            "section_type": "CHAPTER",
            "description": "Empirical performance benchmarks, comparative analysis, and future roadmap.",
            "subsections": [
                {"title": "Experimental Setup and Evaluation Metrics", "section_type": "EVALUATION_SETUP", "description": "Datasets, baseline models, latency, accuracy, F1-score, or resource consumption."},
                {"title": "Benchmark Results and Comparative Performance", "section_type": "BENCHMARKS", "description": "Graphs, performance curves, and comparative quantitative tables."},
                {"title": "Discussion and Limitations", "section_type": "DISCUSSION", "description": "Analysis of trade-offs, edge cases, and architectural constraints."},
                {"title": "Conclusion and Future Enhancements", "section_type": "CONCLUSION", "description": "Summary of technical deliverables and future research directions."},
            ]
        }
    ]


def get_medical_health_structure(subtype: str) -> List[Dict[str, Any]]:
    """
    Medicine, Nursing, Public Health, and Biomedical Sciences.
    Clinical IMRaD adapted structure with epidemiology, cohorts, ethical clearance, and assays.
    """
    return [
        {
            "title": "Chapter 1: Clinical Introduction & Background",
            "section_type": "CHAPTER",
            "description": "Pathophysiological context, epidemiology, and clinical burden.",
            "subsections": [
                {"title": "Epidemiological Background & Disease Burden", "section_type": "INTRODUCTION", "description": "Prevalence, incidence, mortality, and clinical context."},
                {"title": "Statement of Clinical Problem", "section_type": "PROBLEM_STATEMENT", "description": "Unaddressed diagnostic, therapeutic, or healthcare delivery challenge."},
                {"title": "Research Questions and Clinical Hypotheses", "section_type": "HYPOTHESES", "description": "Primary and secondary hypotheses concerning clinical outcomes."},
                {"title": "Research Aims and Clinical Objectives", "section_type": "OBJECTIVES", "description": "Primary endpoint and secondary exploratory endpoints."},
                {"title": "Significance and Clinical Relevance", "section_type": "SIGNIFICANCE", "description": "Potential impact on patient outcomes, prognosis, or healthcare policy."},
            ]
        },
        {
            "title": "Chapter 2: Review of Clinical & Pathophysiological Literature",
            "section_type": "CHAPTER",
            "description": "Biological mechanisms, previous clinical trials, and clinical guidelines.",
            "subsections": [
                {"title": "Pathophysiological Mechanisms", "section_type": "MECHANISMS", "description": "Biological, molecular, or behavioral mechanisms involved."},
                {"title": "Critical Appraisal of Clinical Evidence", "section_type": "LITERATURE_REVIEW", "description": "Systematic evaluation of previous randomized trials, cohort, or case-control studies."},
                {"title": "Current Clinical Guidelines and Deficiencies", "section_type": "GUIDELINES", "description": "Standard of care protocols and clinical gaps."},
            ]
        },
        {
            "title": "Chapter 3: Materials, Patients and Clinical Methods",
            "section_type": "CHAPTER",
            "description": "Study design, patient selection, clinical protocols, and statistical plan.",
            "subsections": [
                {"title": "Study Design & Clinical Setting", "section_type": "METHODOLOGY", "description": "Prospective, retrospective cohort, RCT, or cross-sectional hospital setting."},
                {"title": "Patient Cohort / Inclusion & Exclusion Criteria", "section_type": "COHORT", "description": "Participant eligibility, recruitment criteria, and sample size power calculation."},
                {"title": "Interventions, Clinical Assays or Instruments", "section_type": "INTERVENTIONS", "description": "Diagnostic assays, pharmacological doses, or validated psychometric instruments."},
                {"title": "Ethical Considerations & Institutional Review Board (IRB)", "section_type": "ETHICS", "description": "Informed consent protocols, patient confidentiality, and IRB approvals."},
                {"title": "Statistical Analysis Plan", "section_type": "STATISTICAL_PLAN", "description": "Survival analysis (Kaplan-Meier), hazard ratios, logistic regression, power (alpha=0.05)."},
            ]
        },
        {
            "title": "Chapter 4: Clinical Results and Statistical Findings",
            "section_type": "CHAPTER",
            "description": "Patient demographics, primary clinical endpoints, and adverse events.",
            "subsections": [
                {"title": "Cohort Demographics & Baseline Characteristics", "section_type": "DEMOGRAPHICS", "description": "Table 1 patient baseline characteristics by study arm."},
                {"title": "Primary Outcome Results", "section_type": "PRIMARY_RESULTS", "description": "Primary clinical endpoint data with confidence intervals and p-values."},
                {"title": "Secondary Outcomes & Subgroup Analysis", "section_type": "SECONDARY_RESULTS", "description": "Secondary biomarkers, stratified cohorts, and sensitivity analyses."},
                {"title": "Safety Profile and Adverse Events", "section_type": "SAFETY", "description": "Documented side effects, morbidity, or dropouts."},
            ]
        },
        {
            "title": "Chapter 5: Discussion, Translational Impact & Recommendations",
            "section_type": "CHAPTER",
            "description": "Clinical interpretation, biological plausibility, and translational healthcare implications.",
            "subsections": [
                {"title": "Interpretation of Clinical Findings", "section_type": "DISCUSSION", "description": "Contextualizing outcomes with existing international literature."},
                {"title": "Study Strengths and Limitations", "section_type": "LIMITATIONS", "description": "Confounding variables, selection bias, and statistical power constraints."},
                {"title": "Implications for Clinical Practice & Translational Policy", "section_type": "CLINICAL_IMPLICATIONS", "description": "Direct actionable relevance for physicians, nurses, and hospital guidelines."},
                {"title": "Conclusion and Future Clinical Trials", "section_type": "CONCLUSION", "description": "Summary and proposed follow-up longitudinal clinical studies."},
            ]
        }
    ]


def get_law_legal_structure(subtype: str) -> List[Dict[str, Any]]:
    """
    Law, Jurisprudence, and Legal Studies Structure.
    Doctrinal legal research methodology, statutory frameworks, case law, and reform proposals.
    """
    return [
        {
            "title": "Chapter 1: General Introduction and Conceptual Framework",
            "section_type": "CHAPTER",
            "description": "Jurisprudential problem statement, legal scope, and research objectives.",
            "subsections": [
                {"title": "Background to the Legal Problem", "section_type": "INTRODUCTION", "description": "Historical context and legal dilemma."},
                {"title": "Statement of the Legal Problem", "section_type": "PROBLEM_STATEMENT", "description": "Ambiguity, statutory lacuna, or constitutional controversy."},
                {"title": "Research Questions and Legal Objectives", "section_type": "OBJECTIVES", "description": "Doctrinal questions to be resolved by the inquiry."},
                {"title": "Scope and Jurisdictional Delimitation", "section_type": "SCOPE", "description": "Relevant domestic or international legal jurisdictions."},
                {"title": "Doctrinal Research Methodology & Sources", "section_type": "METHODOLOGY", "description": "Primary sources (statutes, treaties, cases) and secondary legal authorities."},
            ]
        },
        {
            "title": "Chapter 2: Historical Evolution and Statutory Framework",
            "section_type": "CHAPTER",
            "description": "Legislative history, constitutional foundations, and statutory analysis.",
            "subsections": [
                {"title": "Historical and Legislative Evolution", "section_type": "HISTORICAL_CONTEXT", "description": "Origins of the relevant statutory provisions and common law doctrines."},
                {"title": "Examination of Governing Statutory Enactments", "section_type": "STATUTORY_ANALYSIS", "description": "In-depth textual interpretation of current legislation."},
                {"title": "Comparative Jurisprudence and International Standards", "section_type": "COMPARATIVE_LAW", "description": "Treaty obligations and comparative legal approaches across foreign jurisdictions."},
            ]
        },
        {
            "title": "Chapter 3: Judicial Interpretation and Precedent Analysis",
            "section_type": "CHAPTER",
            "description": "Critical analysis of appellate case law, ratios decidendi, and legal conflict.",
            "subsections": [
                {"title": "Analysis of Landmark Precedents", "section_type": "CASE_LAW", "description": "Leading Supreme Court or appellate decisions shaping current doctrine."},
                {"title": "Judicial Inconsistencies and Conflicting Decisions", "section_type": "JUDICIAL_CONFLICTS", "description": "Divergent judicial interpretations among trial and appellate courts."},
                {"title": "Judicial Activism versus Restraint in Topic Context", "section_type": "JUDICIAL_PHILOSOPHY", "description": "Doctrinal implications of prevailing court philosophy."},
            ]
        },
        {
            "title": "Chapter 4: Critical Appraisal, Institutional Gaps & Socio-Legal Challenges",
            "section_type": "CHAPTER",
            "description": "Socio-legal reality, procedural obstacles, and systemic inadequacies.",
            "subsections": [
                {"title": "Gaps in Existing Substantive and Procedural Law", "section_type": "LEGAL_GAPS", "description": "Identified statutory ambiguities and enforcement hurdles."},
                {"title": "Institutional, Regulatory, and Compliance Challenges", "section_type": "INSTITUTIONAL_CHALLENGES", "description": "Capacity of regulatory bodies and procedural bottlenecks."},
                {"title": "Socio-Legal Implications and Access to Justice", "section_type": "SOCIO_LEGAL", "description": "Human rights and economic ramifications on affected stakeholders."},
            ]
        },
        {
            "title": "Chapter 5: Summary, Conclusions and Law Reform Proposals",
            "section_type": "CHAPTER",
            "description": "Actionable legislative amendments, policy changes, and legal conclusion.",
            "subsections": [
                {"title": "Summary of Doctrinal Findings", "section_type": "FINDINGS_SUMMARY", "description": "Synthesis of answers to the core legal research questions."},
                {"title": "Specific Proposals for Legislative Amendment", "section_type": "LAW_REFORM", "description": "Concrete legislative drafting proposals and statutory reforms."},
                {"title": "Judicial and Institutional Recommendations", "section_type": "RECOMMENDATIONS", "description": "Guidelines for court administration, practice directions, and regulators."},
                {"title": "Conclusion", "section_type": "CONCLUSION", "description": "Final doctrinal perspective on the evolution of the law."},
            ]
        }
    ]


def get_humanities_arts_structure(subtype: str) -> List[Dict[str, Any]]:
    """
    Humanities, Arts, History, Literature, Philosophy Structure.
    Emphasizes Historiography, Primary Source Survey, Thematic Discourse, and Epistemological Synthesis.
    """
    return [
        {
            "title": "Chapter One: Introduction & Historiographical Context",
            "section_type": "CHAPTER",
            "description": "Critical entry point, historical or cultural context, and theoretical stance.",
            "subsections": [
                {"title": "Historical and Cultural Background", "section_type": "INTRODUCTION", "description": "Temporal, cultural, artistic, or socio-political milieu of inquiry."},
                {"title": "The Research Problematic and Critical Inquiries", "section_type": "PROBLEM_STATEMENT", "description": "Central critical dilemma, aesthetic paradox, or historiographical question."},
                {"title": "Critical Aims and Hermeneutic Objectives", "section_type": "OBJECTIVES", "description": "Analytical aims guiding the interpretive inquiry."},
                {"title": "Theoretical Perspective & Methodological Hermeneutics", "section_type": "METHODOLOGY", "description": "Critical theory (postcolonialism, structuralism, phenomenology, etc.) and primary source criticism."},
                {"title": "Survey of Primary and Archival Sources", "section_type": "SOURCES", "description": "Corpus of literary texts, historical archives, or artistic artifacts examined."},
            ]
        },
        {
            "title": "Chapter Two: Historiographical Survey & Critical Context",
            "section_type": "CHAPTER",
            "description": "Critical review of existing intellectual scholarship and interpretive debates.",
            "subsections": [
                {"title": "Evolution of Scholarly Interpretations", "section_type": "LITERATURE_REVIEW", "description": "Historical evolution of debate surrounding the topic."},
                {"title": "Interrogating Dominant Narratives", "section_type": "CRITICAL_APPRAISAL", "description": "Critique of established ideological and historiographical paradigms."},
                {"title": "The Theoretical Apparatus in Focus", "section_type": "THEORETICAL_FRAMEWORK", "description": "Detailed grounding in the chosen conceptual framework."},
            ]
        },
        {
            "title": "Chapter Three: Thematic Discourse Analysis I: Textual Foundations",
            "section_type": "CHAPTER",
            "description": "First major thematic analysis of primary texts or archival materials.",
            "subsections": [
                {"title": "Close Reading and Discourse Analysis", "section_type": "THEMATIC_ANALYSIS", "description": "Explication of primary textual motifs, stylistic devices, or archival evidence."},
                {"title": "Ideological Representation and Meaning Construction", "section_type": "IDEOLOGY", "description": "How cultural values or historical relations are encoded in the work."},
            ]
        },
        {
            "title": "Chapter Four: Thematic Discourse Analysis II: Comparative Synthesis",
            "section_type": "CHAPTER",
            "description": "Second major thematic pillar connecting cultural and socio-historical resonance.",
            "subsections": [
                {"title": "Comparative Intertextual Perspectives", "section_type": "INTERTEXTUALITY", "description": "Interplay between the analyzed corpus and external cultural discourses."},
                {"title": "Subversion, Resistance, and Agency", "section_type": "AGENCY", "description": "Critical examination of counter-narratives and artistic autonomy."},
            ]
        },
        {
            "title": "Chapter Five: Synthesis, Epistemological Reflections & Conclusion",
            "section_type": "CHAPTER",
            "description": "Philosophical or historical synthesis and contribution to humanistic knowledge.",
            "subsections": [
                {"title": "Synthesis of Critical Arguments", "section_type": "SYNTHESIS", "description": "Integration of the core thematic threads across the study."},
                {"title": "Epistemological and Cultural Contributions", "section_type": "CONTRIBUTION", "description": "Contribution to wider humanistic scholarship."},
                {"title": "Concluding Reflections and Further Inquiries", "section_type": "CONCLUSION", "description": "Enduring implications and future avenues of critical inquiry."},
            ]
        }
    ]


def get_research_proposal_structure(discipline_name: str) -> List[Dict[str, Any]]:
    """
    Standard Grant or Academic Degree Research Proposal Structure.
    Used for dissertation proposals, funding bids, and seminar defenses.
    """
    return [
        {
            "title": "1. Project Title & Executive Abstract",
            "section_type": "ABSTRACT",
            "description": "High-level executive summary of proposed inquiry, budget, and significance."
        },
        {
            "title": "2. Background and Statement of the Research Problem",
            "section_type": "INTRODUCTION",
            "description": "Academic problem context, empirical deficit, and justification for inquiry."
        },
        {
            "title": "3. Research Aim, Objectives, and Research Questions",
            "section_type": "OBJECTIVES",
            "description": "Precise primary aim, SMART research objectives, and operational questions/hypotheses."
        },
        {
            "title": "4. Literature Review and Theoretical Foundation",
            "section_type": "LITERATURE_REVIEW",
            "description": "Concise review of foundational and state-of-the-art literature establishing the research gap."
        },
        {
            "title": "5. Proposed Research Methodology & Work Plan",
            "section_type": "METHODOLOGY",
            "description": "Research design, population, sampling, data collection protocols, and analytic strategy."
        },
        {
            "title": "6. Ethical Considerations & Risk Management",
            "section_type": "ETHICS",
            "description": "IRB approval plan, participant protection, data security, and anticipated risks."
        },
        {
            "title": "7. Timeline, Milestones & Budget Justification",
            "section_type": "TIMELINE",
            "description": "Gantt chart milestones, deliverable deadlines, and itemized resource requirements."
        },
        {
            "title": "8. Preliminary References & Working Bibliography",
            "section_type": "REFERENCES",
            "description": "Key scholarly references anchoring the proposed study."
        }
    ]


def get_systematic_review_structure() -> List[Dict[str, Any]]:
    """
    PRISMA-aligned Systematic Review and Meta-Analysis Structure.
    """
    return [
        {
            "title": "Structured Abstract",
            "section_type": "ABSTRACT",
            "description": "Structured overview: Background, Methods, Results, Conclusions, Registration."
        },
        {
            "title": "Section 1: Introduction",
            "section_type": "INTRODUCTION",
            "description": "Rationale for the review and explicit statement of questions using PICO/PECO framework."
        },
        {
            "title": "Section 2: Methods",
            "section_type": "METHODOLOGY",
            "description": "PRISMA protocol, eligibility criteria, information sources, search strategy, and data extraction.",
            "subsections": [
                {"title": "Protocol and Registration", "section_type": "PROTOCOL", "description": "PROSPERO registration details and protocol documentation."},
                {"title": "Eligibility Criteria (PICO)", "section_type": "CRITERIA", "description": "Study inclusion and exclusion boundaries."},
                {"title": "Information Sources & Search Strategy", "section_type": "SEARCH_STRATEGY", "description": "Databases searched, date ranges, and exact Boolean search strings."},
                {"title": "Study Selection Process", "section_type": "SELECTION", "description": "Screening flowchart and independent dual-reviewer process."},
                {"title": "Data Collection Process & Risk of Bias Assessment", "section_type": "BIAS_ASSESSMENT", "description": "Cochrane RoB 2, ROBINS-I, or Newcastle-Ottawa scale protocols."},
                {"title": "Synthesis Methods and Statistical Meta-Analysis", "section_type": "SYNTHESIS_METHODS", "description": "Heterogeneity assessment (I²), forest plots, and sensitivity analyses."},
            ]
        },
        {
            "title": "Section 3: Results",
            "section_type": "RESULTS",
            "description": "Study selection, study characteristics, risk of bias in studies, and synthesized findings.",
            "subsections": [
                {"title": "Study Selection Flow (PRISMA Flowchart)", "section_type": "PRISMA_FLOW", "description": "Identified records, duplicates removed, screened, and included count."},
                {"title": "Study Characteristics and Summary Table", "section_type": "STUDY_CHARACTERISTICS", "description": "Comprehensive comparative table of included studies."},
                {"title": "Risk of Bias within Studies", "section_type": "BIAS_RESULTS", "description": "Tabular presentation of risk of bias across all domains."},
                {"title": "Results of Syntheses & Meta-Analysis", "section_type": "META_ANALYSIS", "description": "Pooled effect sizes, odds ratios, confidence intervals, and forest plots."},
            ]
        },
        {
            "title": "Section 4: Discussion",
            "section_type": "DISCUSSION",
            "description": "Summary of evidence, strengths, limitations, and implications for clinical or policy practice."
        },
        {
            "title": "Section 5: Conclusions & Funding Disclosures",
            "section_type": "CONCLUSION",
            "description": "Final takeaways, competing interests, and financial support disclosures."
        }
    ]


def get_journal_article_structure(subtype: str, discipline_name: str) -> List[Dict[str, Any]]:
    """
    Journal Article Structure:
    Supports IMRaD for empirical research and Conceptual/Review structures for theoretical manuscripts.
    """
    subtype_lower = (subtype or '').lower()
    if 'review' in subtype_lower or 'systematic' in subtype_lower:
        return get_systematic_review_structure()
    
    if 'conceptual' in subtype_lower or 'theoretical' in subtype_lower:
        return [
            {
                "title": "Title & Abstract",
                "section_type": "ABSTRACT",
                "description": "Abstract and keywords summarizing theoretical problem and conceptual framework."
            },
            {
                "title": "Introduction",
                "section_type": "INTRODUCTION",
                "description": "Theoretical motivation, problem domain, and research gap."
            },
            {
                "title": "Theoretical Foundations and Literature Synthesis",
                "section_type": "THEORETICAL_FRAMEWORK",
                "description": "Survey and critical interrogation of foundational paradigms."
            },
            {
                "title": "Conceptual Framework & Proposition Development",
                "section_type": "PROPOSITIONS",
                "description": "Delineation of constructs, conceptual model, and formal academic propositions (P1, P2...)."
            },
            {
                "title": "Theoretical and Practical Implications",
                "section_type": "IMPLICATIONS",
                "description": "Disciplinary advancements, policy relevance, and managerial or technical implications."
            },
            {
                "title": "Future Research Agenda & Conclusions",
                "section_type": "CONCLUSION",
                "description": "Unanswered theoretical questions, boundary conditions, and concluding synthesis."
            }
        ]
    
    # Standard IMRaD Journal Article Structure
    return [
        {
            "title": "Title, Abstract & Keywords",
            "section_type": "ABSTRACT",
            "description": "Self-contained summary (Background, Methods, Results, Conclusion) and 4-6 indexing keywords."
        },
        {
            "title": "1. Introduction",
            "section_type": "INTRODUCTION",
            "description": "Academic problem context, relevant literature, research question, and explicit contribution."
        },
        {
            "title": "2. Methods / Materials and Methods",
            "section_type": "METHODOLOGY",
            "description": "Sufficient detail to allow replication: design, participants/samples, instruments, and statistical tests."
        },
        {
            "title": "3. Results",
            "section_type": "RESULTS",
            "description": "Clear presentation of empirical findings with tables, figures, and statistical significance."
        },
        {
            "title": "4. Discussion",
            "section_type": "DISCUSSION",
            "description": "Interpretation of findings, comparison with existing literature, mechanisms, and limitations."
        },
        {
            "title": "5. Conclusions & Declarations",
            "section_type": "CONCLUSION",
            "description": "Major conclusions, practical implications, data availability, and conflict of interest statements."
        }
    ]


# ============================================================================
# MAIN STRUCTURE ENGINE DISPATCHER
# ============================================================================

def get_academic_structure(
    discipline_name: str,
    document_category: str,
    document_subtype: str,
    academic_level: Optional[str] = None,
    methodology: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Primary dispatcher returning an intelligent, multidisciplinary manuscript outline.
    """
    d_name = (discipline_name or '').lower()
    sub_type = (document_subtype or '').lower()
    cat = (document_category or '').upper()

    # Special check: Research Proposal
    if 'proposal' in sub_type:
        return get_research_proposal_structure(discipline_name)

    # Special check: Systematic Review
    if 'systematic review' in sub_type:
        return get_systematic_review_structure()

    # Category: JOURNAL_ARTICLE
    if cat == 'JOURNAL_ARTICLE':
        return get_journal_article_structure(document_subtype, discipline_name)

    # Discipline classification for Academic Projects and Research Papers
    if any(term in d_name for term in ['management', 'business', 'accounting', 'economics', 'finance', 'marketing']):
        return get_management_project_structure(document_subtype)

    if any(term in d_name for term in ['computer science', 'information technology', 'software', 'cybersecurity']):
        return get_cs_engineering_project_structure(document_subtype)

    if any(term in d_name for term in ['engineering', 'mechanical', 'electrical', 'civil', 'chemical']):
        return get_cs_engineering_project_structure(document_subtype)

    if any(term in d_name for term in ['medicine', 'nursing', 'public health', 'health', 'biomedical', 'pharmacy']):
        return get_medical_health_structure(document_subtype)

    if any(term in d_name for term in ['law', 'legal', 'jurisprudence', 'criminology']):
        return get_law_legal_structure(document_subtype)

    if any(term in d_name for term in ['history', 'literature', 'philosophy', 'arts', 'humanities', 'theology']):
        return get_humanities_arts_structure(document_subtype)

    if any(term in d_name for term in ['sociology', 'psychology', 'political science', 'social work']):
        # Social sciences follow the management/empirical model with hypotheses & survey/experimental analysis
        return get_management_project_structure(document_subtype)

    if any(term in d_name for term in ['agriculture', 'environmental', 'biology', 'chemistry', 'physics']):
        return get_medical_health_structure(document_subtype)

    # Default fallback: IMRaD / 5-Chapter empirical framework
    if cat == 'RESEARCH_PAPER':
        return get_journal_article_structure(document_subtype, discipline_name)

    return get_management_project_structure(document_subtype)


def generate_document_outline(
    document: ResearchDocument,
    discipline_name: str,
    category: str,
    subtype: str,
    academic_level: Optional[str] = None,
    methodology: Optional[str] = None,
    preserve_existing_content: bool = True
) -> List[DocumentSection]:
    """
    Populates or updates the ResearchDocument with dynamic chapter and section models.
    Preserves existing content if a section with the same title or type already exists.
    """
    structure = get_academic_structure(
        discipline_name=discipline_name,
        document_category=category,
        document_subtype=subtype,
        academic_level=academic_level,
        methodology=methodology
    )

    # Cache existing sections to preserve content
    existing_by_title = {}
    if preserve_existing_content:
        for s in document.sections.all():
            existing_by_title[s.title.lower().strip()] = s.content

    # If re-generating, safely clear previous sections or update
    document.sections.all().delete()

    created_sections = []
    order_counter = 0

    for item in structure:
        title = item["title"]
        sec_type = item.get("section_type", "SECTION")
        subsections = item.get("subsections", [])

        # Recover preserved content if available
        recovered_content = existing_by_title.get(title.lower().strip(), "")

        parent_sec = DocumentSection.objects.create(
            document=document,
            title=title,
            section_type=sec_type,
            order_index=order_counter,
            content=recovered_content,
            word_count=len(recovered_content.split()) if recovered_content else 0
        )
        created_sections.append(parent_sec)
        order_counter += 1

        # Create subsections if defined
        for sub in subsections:
            sub_title = sub["title"]
            sub_type = sub.get("section_type", "SUBSECTION")
            recovered_sub_content = existing_by_title.get(sub_title.lower().strip(), "")

            child_sec = DocumentSection.objects.create(
                document=document,
                parent_section=parent_sec,
                title=sub_title,
                section_type=sub_type,
                order_index=order_counter,
                content=recovered_sub_content,
                word_count=len(recovered_sub_content.split()) if recovered_sub_content else 0
            )
            created_sections.append(child_sec)
            order_counter += 1

    return created_sections


def list_available_templates() -> List[Dict[str, Any]]:
    """
    Catalog of all structure templates supported by the Academic Structure Engine.
    Used for frontend structure previews and template selection.
    """
    return [
        {
            "id": "management_empirical",
            "name": "Management, Business & Social Sciences Empirical Structure",
            "disciplines": ["Management", "Business Administration", "Accounting", "Economics", "Finance", "Sociology", "Psychology"],
            "categories": ["ACADEMIC_PROJECT", "RESEARCH_PAPER"],
            "description": "5-chapter empirical inquiry with Problem Statement, Hypotheses, Instrument Validity, and Regression Analysis.",
            "preview": [
                "Chapter One: Introduction (Background, Problem, Objectives, Questions, Hypotheses)",
                "Chapter Two: Review of Related Literature (Conceptual, Theoretical, Empirical, Gap)",
                "Chapter Three: Research Methodology (Design, Population, Sampling, Reliability)",
                "Chapter Four: Data Presentation, Analysis and Hypothesis Testing",
                "Chapter Five: Summary, Conclusion, Recommendations and Contribution"
            ]
        },
        {
            "id": "cs_engineering",
            "name": "Computer Science, IT & Engineering Systems Structure",
            "disciplines": ["Computer Science", "Information Technology", "Software Engineering", "Engineering"],
            "categories": ["ACADEMIC_PROJECT", "RESEARCH_PAPER"],
            "description": "Technical system architecture, algorithmic complexity, module implementation, and benchmark evaluation.",
            "preview": [
                "Chapter 1: Introduction (Problem, Aim & Objectives, Technical Scope)",
                "Chapter 2: Literature Review and Related Systems (State of the Art, Comparative Matrix)",
                "Chapter 3: System Requirements and Architectural Design (Architecture, Algorithms, Data Model)",
                "Chapter 4: Implementation and System Verification (Tech Stack, Code Walkthrough, Testing)",
                "Chapter 5: Evaluation, Discussion and Future Work (Benchmarks, Comparative Results)"
            ]
        },
        {
            "id": "medical_health",
            "name": "Medicine, Nursing & Public Health Clinical Structure",
            "disciplines": ["Medicine", "Nursing", "Public Health", "Environmental Science", "Agriculture"],
            "categories": ["ACADEMIC_PROJECT", "RESEARCH_PAPER"],
            "description": "Clinical IMRaD with Epidemiological Background, Patient Cohort, IRB Ethics, and Statistical Plan.",
            "preview": [
                "Chapter 1: Clinical Introduction & Background (Epidemiology, Clinical Problem, Aims)",
                "Chapter 2: Review of Clinical & Pathophysiological Literature",
                "Chapter 3: Materials, Patients and Clinical Methods (Cohort, Assays, IRB Ethics)",
                "Chapter 4: Clinical Results and Statistical Findings (Demographics, Primary Endpoints)",
                "Chapter 5: Discussion, Translational Impact & Clinical Practice Guidelines"
            ]
        },
        {
            "id": "law_jurisprudence",
            "name": "Law, Jurisprudence & Legal Studies Structure",
            "disciplines": ["Law", "Political Science"],
            "categories": ["ACADEMIC_PROJECT", "RESEARCH_PAPER"],
            "description": "Doctrinal legal inquiry with Statutory Evolution, Judicial Precedent, and Law Reform Proposals.",
            "preview": [
                "Chapter 1: General Introduction and Conceptual Framework (Doctrinal Methodology)",
                "Chapter 2: Historical Evolution and Statutory Framework (Comparative Jurisprudence)",
                "Chapter 3: Judicial Interpretation and Precedent Analysis (Leading Precedents)",
                "Chapter 4: Critical Appraisal, Institutional Gaps & Socio-Legal Challenges",
                "Chapter 5: Summary, Conclusions and Law Reform Proposals (Legislative Amendments)"
            ]
        },
        {
            "id": "humanities_arts",
            "name": "Humanities, History & Critical Arts Structure",
            "disciplines": ["Humanities", "Arts"],
            "categories": ["ACADEMIC_PROJECT", "RESEARCH_PAPER"],
            "description": "Hermeneutic analysis with Historiographical Context, Primary Source Surveys, and Thematic Discourses.",
            "preview": [
                "Chapter One: Introduction & Historiographical Context (Problematic, Primary Corpus)",
                "Chapter Two: Historiographical Survey & Critical Theoretical Framework",
                "Chapter Three: Thematic Discourse Analysis I: Textual Foundations",
                "Chapter Four: Thematic Discourse Analysis II: Comparative Synthesis",
                "Chapter Five: Synthesis, Epistemological Reflections & Conclusion"
            ]
        },
        {
            "id": "journal_imrad",
            "name": "Peer-Reviewed Journal Article (IMRaD Standard)",
            "disciplines": ["All Disciplines"],
            "categories": ["JOURNAL_ARTICLE"],
            "description": "Universal scientific journal article format: Introduction, Methods, Results, and Discussion.",
            "preview": [
                "Title, Abstract & Keywords",
                "1. Introduction (Context, Literature, Research Question)",
                "2. Methods / Materials and Methods (Replicable Procedures)",
                "3. Results (Empirical Findings & Data Presentations)",
                "4. Discussion (Interpretation, Comparison, Limitations)",
                "5. Conclusions & Declarations"
            ]
        },
        {
            "id": "systematic_review",
            "name": "PRISMA-Aligned Systematic Review & Meta-Analysis",
            "disciplines": ["All Disciplines"],
            "categories": ["RESEARCH_PAPER", "JOURNAL_ARTICLE"],
            "description": "PRISMA 2020 compliant review protocol with Search Strategy, Risk of Bias, and Meta-Analysis.",
            "preview": [
                "Structured Abstract (Background, Methods, Results, Conclusion)",
                "Section 1: Introduction (Rationale & PICO questions)",
                "Section 2: Methods (Protocol, Search String, Screening, Risk of Bias)",
                "Section 3: Results (PRISMA Flowchart, Characteristics, Syntheses)",
                "Section 4: Discussion (Summary of Evidence, Limitations)",
                "Section 5: Conclusions & Funding Disclosures"
            ]
        },
        {
            "id": "research_proposal",
            "name": "Academic Degree / Grant Research Proposal",
            "disciplines": ["All Disciplines"],
            "categories": ["ACADEMIC_PROJECT"],
            "description": "Formal research proposal with Objectives, Methodology, Work Plan, Budget, and Risk Assessment.",
            "preview": [
                "1. Project Title & Executive Abstract",
                "2. Background and Statement of the Research Problem",
                "3. Research Aim, Objectives, and Research Questions",
                "4. Literature Review and Theoretical Foundation",
                "5. Proposed Research Methodology & Work Plan",
                "6. Ethical Considerations & Risk Management",
                "7. Timeline, Milestones & Budget Justification",
                "8. Preliminary References & Working Bibliography"
            ]
        }
    ]

