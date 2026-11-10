# ScholarForge AI — Academic Structure & Template Specification

**Document Version:** 1.0.0 (Stage 2 Release)  
**Status:** Implemented & Verified in Production Scaffolding Engine  
**Module:** `backend/documents/structure_engine.py`

---

## 1. Overview & Architectural Philosophy

A foundational limitation of generic thesis generators is the rigid assumption that all academic scholarship follows a homogenous five-chapter social science structure (Introduction, Literature Review, Methodology, Data Analysis, Conclusion).

**ScholarForge AI** rejects this monolithic assumption. Different disciplines, methodologies, and publication venues adhere to fundamentally distinct structural epistemologies:

- **Empirical Management & Social Sciences** rely on hypothesis testing, instrument reliability, and questionnaire sampling.
- **Computer Science & Software Engineering** focus on requirements specifications, architecture, algorithm design, system implementation, and performance benchmarking.
- **Medicine, Nursing & Health Sciences** require ethical approvals, clinical cohorts, CONSORT/STROBE protocols, and biochemical or clinical outcome measures.
- **Legal Scholarship** proceeds through doctrine, case law, statutory frameworks, comparative jurisdiction, and policy recommendations.
- **Humanities & Arts** require thematic, historical, or hermeneutic chapters rather than experimental methodology chapters.
- **Systematic Literature Reviews** demand PRISMA protocol adherence, eligibility criteria, risk of bias assessment, and evidence synthesis.
- **Research Proposals** emphasize preliminary timelines, anticipated contributions, and resource feasibility rather than empirical findings.
- **Journal Articles** follow the condensed IMRaD (Introduction, Methods, Results, and Discussion) format.

ScholarForge's **Academic Structure Engine** dynamically maps the multidimensional tuple:
```
(Document Category, Document Subtype, Academic Discipline, Academic Level, Research Methodology)
```
to a tailored manuscript outline while allowing the researcher to add, remove, rename, reorder, and convert chapters and subsections at any time without losing written prose.

---

## 2. Supported Scaffolding Templates

### 2.1 Management, Business, Economics & Social Sciences
- **Template ID:** `management_default`
- **Applicable Disciplines:** Management, Business Administration, Accounting, Economics, Finance, Marketing, Human Resources, Public Administration.
- **Structure:**
  - **Chapter One: Introduction**
    - 1.1 Background to the Study
    - 1.2 Statement of the Problem
    - 1.3 Objectives of the Study (General & Specific)
    - 1.4 Research Questions
    - 1.5 Research Hypotheses ($H_0$ and $H_1$)
    - 1.6 Significance of the Study
    - 1.7 Scope of the Study (Geographical, Conceptual, Temporal)
    - 1.8 Operational Definition of Terms
  - **Chapter Two: Review of Related Literature**
    - 2.1 Conceptual Review
    - 2.2 Theoretical Framework
    - 2.3 Empirical Review
    - 2.4 Summary of Literature & Research Gap
  - **Chapter Three: Research Methodology**
    - 3.1 Research Design (Survey, Correlational, Ex-post facto)
    - 3.2 Population of the Study
    - 3.3 Sample Size and Sampling Technique (Taro Yamane, Cochran, etc.)
    - 3.4 Research Instrument
    - 3.5 Validity and Reliability of Instrument (Cronbach's Alpha)
    - 3.6 Method of Data Collection
    - 3.7 Method of Data Analysis (Descriptive, Regression, SEM)
  - **Chapter Four: Data Presentation, Analysis and Discussion**
    - 4.1 Response Rate & Demographic Profile
    - 4.2 Data Presentation and Descriptive Analysis
    - 4.3 Hypotheses Testing (p-values, F-statistics, t-statistics)
    - 4.4 Discussion of Findings
  - **Chapter Five: Summary, Conclusion and Recommendations**
    - 5.1 Summary of Major Findings
    - 5.2 Conclusion
    - 5.3 Recommendations (Managerial & Policy)
    - 5.4 Contribution to Knowledge
    - 5.5 Suggestions for Further Studies

---

### 2.2 Computer Science, Software Engineering & IT
- **Template ID:** `cs_engineering_default`
- **Applicable Disciplines:** Computer Science, Software Engineering, Information Technology, Cybersecurity, Artificial Intelligence, Data Science.
- **Structure:**
  - **Chapter 1: Introduction**
    - 1.1 Background to the Problem
    - 1.2 Problem Statement
    - 1.3 Aim and Objectives
    - 1.4 Significance of the Project
    - 1.5 Scope and Limitations
    - 1.6 Project Organization
  - **Chapter 2: Literature Review and Related Systems**
    - 2.1 Theoretical Foundations
    - 2.2 Review of Related Work & Existing Systems
    - 2.3 Comparative Analysis of Existing Approaches
    - 2.4 Identified Technical Deficiencies & Gap
  - **Chapter 3: System Requirements and Architectural Design**
    - 3.1 Requirements Specification (Functional & Non-Functional)
    - 3.2 System Architecture & High-Level Design
    - 3.3 Algorithm Design & Computational Workflow
    - 3.4 Data Modeling and Database Schema
    - 3.5 Security, Scalability and Fault Tolerance Design
  - **Chapter 4: Implementation and System Verification**
    - 4.1 Implementation Environment and Tech Stack
    - 4.2 Core Module Implementation Details
    - 4.3 Testing and Verification Strategy (Unit, Integration, Stress)
    - 4.4 Test Results and Defect Analysis
  - **Chapter 5: Evaluation, Discussion and Future Work**
    - 5.1 Experimental Setup and Evaluation Metrics
    - 5.2 Benchmark Results and Comparative Performance
    - 5.3 Discussion and Limitations
    - 5.4 Conclusion and Future Enhancements

---

### 2.3 Medicine, Nursing & Health Sciences
- **Template ID:** `medicine_health_default`
- **Applicable Disciplines:** Medicine, Nursing, Public Health, Pharmacy, Biomedical Sciences, Epidemiology.
- **Structure:**
  - **Chapter 1: Introduction & Clinical Context**
    - 1.1 Epidemiology and Clinical Background
    - 1.2 Statement of the Health Problem
    - 1.3 Research Questions and Hypotheses
    - 1.4 Aims and Specific Objectives
    - 1.5 Clinical and Public Health Significance
    - 1.6 Operational Definitions
  - **Chapter 2: Comprehensive Literature Review**
    - 2.1 Pathophysiology and Disease Mechanisms
    - 2.2 Standard of Care and Current Clinical Interventions
    - 2.3 Empirical Review of Prior Clinical Trials/Observational Studies
    - 2.4 Knowledge Gaps in Current Clinical Practice
  - **Chapter 3: Materials and Methods (Protocol)**
    - 3.1 Study Design (Cohort, Case-Control, RCT, Cross-Sectional)
    - 3.2 Setting and Target Patient Population
    - 3.3 Inclusion and Exclusion Criteria
    - 3.4 Sample Size Estimation & Statistical Power Calculation
    - 3.5 Clinical / Laboratory Procedures & Interventions
    - 3.6 Primary and Secondary Outcome Measures
    - 3.7 Ethical Considerations & Institutional Review Board (IRB) Approval
    - 3.8 Statistical Analysis Plan
  - **Chapter 4: Results & Statistical Analysis**
    - 4.1 Participant Enrollment and Baseline Characteristics
    - 4.2 Primary Outcome Results
    - 4.3 Secondary Outcome Results & Subgroup Analyses
    - 4.4 Safety, Adverse Events and Tolerability
  - **Chapter 5: Discussion & Translational Impact**
    - 5.1 Principal Findings Synthesis
    - 5.2 Comparison with Existing Medical Literature
    - 5.3 Strengths and Limitations of the Study
    - 5.4 Clinical Implications and Practice Recommendations
    - 5.5 Conclusion and Future Translational Directions

---

### 2.4 Law & Legal Studies
- **Template ID:** `law_default`
- **Applicable Disciplines:** Law, Jurisprudence, International Law, Constitutional Law, Commercial Law, Human Rights Law.
- **Structure:**
  - **Chapter 1: General Introduction**
    - 1.1 Context and Background to the Legal Problem
    - 1.2 Statement of the Legal Dilemma
    - 1.3 Research Questions
    - 1.4 Aims and Objectives of the Research
    - 1.5 Research Methodology (Doctrinal, Socio-Legal, Comparative)
    - 1.6 Significance of the Legal Study
    - 1.7 Scope and Delimitation
  - **Chapter 2: Conceptual and Theoretical Framework**
    - 2.1 Jurisprudential and Theoretical Underpinnings (Positivism, Natural Law, Realism)
    - 2.2 Conceptual Clarifications of Core Legal Principles
    - 2.3 Historical Evolution of the Relevant Doctrine
  - **Chapter 3: Existing Legal and Regulatory Framework**
    - 3.1 Constitutional and Statutory Provisions
    - 3.2 Judicial Precedents and Case Law Analysis
    - 3.3 Administrative Regulations and Enforcement Mechanisms
    - 3.4 Gaps, Inconsistencies, and Lacunae in the Law
  - **Chapter 4: Comparative Legal Perspectives & International Standards**
    - 4.1 International Treaties, Conventions, and Best Practices
    - 4.2 Comparative Analysis of Selected Jurisdictions
    - 4.3 Lessons for Domestic Legal Reform
  - **Chapter 5: Conclusion and Recommendations for Law Reform**
    - 5.1 Summary of Major Legal Findings
    - 5.2 Legislative and Statutory Reform Proposals
    - 5.3 Judicial and Institutional Recommendations
    - 5.4 Concluding Remarks

---

### 2.5 Humanities & Arts
- **Template ID:** `humanities_default`
- **Applicable Disciplines:** History, Philosophy, Literature, Linguistics, Religious Studies, Cultural Studies.
- **Structure:**
  - **Chapter 1: Introduction and Historiographical / Critical Framework**
    - 1.1 Historical / Cultural Context
    - 1.2 The Critical Question or Dialectic
    - 1.3 Theoretical Framework & Critical Lens
    - 1.4 Historiographical / Scholarly Review
    - 1.5 Methodology & Primary Source Appraisal
    - 1.6 Chapter Outline and Structural Argument
  - **Chapter 2: Thematic Analysis / Historical Development I**
    - 2.1 Origins and Foundational Conditions
    - 2.2 Textual / Archival Analysis
    - 2.3 Scholarly Interpretations and Critiques
  - **Chapter 3: Thematic Analysis / Critical Synthesis II**
    - 3.1 Key Dialectical Tension or Conflict
    - 3.2 Close Reading / Documentary Evidence
    - 3.3 Broader Cultural / Intellectual Implications
  - **Chapter 4: Thematic Analysis / Contemporary Reverberations III**
    - 4.1 Evolution of the Discourse
    - 4.2 Comparative Perspectives
    - 4.3 Synthesis of Critical Arguments
  - **Chapter 5: Conclusion**
    - 5.1 Synthesis of Central Thesis
    - 5.2 Contribution to Field and Historiography
    - 5.3 Unresolved Dialectics and Future Inquiries

---

### 2.6 Systematic Literature Review (PRISMA-Aligned)
- **Template ID:** `systematic_review`
- **Structure:**
  - 1.0 Introduction & Rationale
  - 2.0 Review Questions & Eligibility Criteria (PICOS/SPIDER framework)
  - 3.0 Search Strategy & Information Sources
  - 4.0 Study Selection & Data Extraction (PRISMA Flow)
  - 5.0 Risk of Bias & Quality Assessment
  - 6.0 Results & Evidence Synthesis (Meta-analysis / Narrative Synthesis)
  - 7.0 Discussion, Certainty of Evidence & Limitations
  - 8.0 Conclusions and Implications for Practice

---

### 2.7 Research Proposal
- **Template ID:** `research_proposal`
- **Structure:**
  - 1.0 Proposed Research Title & Executive Summary
  - 2.0 Background and Problem Statement
  - 3.0 Research Questions and Specific Objectives
  - 4.0 Preliminary Literature Review & Theoretical Grounding
  - 5.0 Proposed Research Methodology & Work Plan
  - 6.0 Ethical Considerations and Data Management Plan
  - 7.0 Projected Research Timeline (Gantt Chart Milestones)
  - 8.0 Expected Outcomes, Contribution and Budget Feasibility

---

### 2.8 Peer-Reviewed Journal Article (IMRaD Format)
- **Template ID:** `journal_imrad`
- **Structure:**
  - Title, Abstract, and Keywords
  - 1. Introduction & Theoretical Context
  - 2. Materials and Methods
  - 3. Results and Empirical Findings
  - 4. Discussion (Implications & Limitations)
  - 5. Conclusion & Policy / Practice Relevance
  - Acknowledgments & Conflicts of Interest

---

## 3. Dynamic Section Operations & Data Preservation Guarantee

When a researcher alters the outline in the UI:
1. **Adding a Section:** The user can add top-level chapters (`is_chapter=True`) or nested sub-sections linked via `parent_section_id`.
2. **Reordering Sections:** Bulk drag-and-drop or increment/decrement updates batch-process sequence indices inside atomic database transactions without overwriting text.
3. **Template Re-application:** If a user selects "Apply Discipline Outline Template", the system:
   - Matches existing sections by normalized title and updates their ordering.
   - Appends newly introduced template sections.
   - **Never deletes** existing researcher sections or written prose. Unmatched user sections are retained safely at the end of the outline.

