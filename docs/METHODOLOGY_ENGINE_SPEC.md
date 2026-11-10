# Methodology Engine Specification

## 1. Overview & Architectural Principles

The ScholarForge AI **Intelligent Research Methodology Engine** provides discipline-aware methodological scaffolding for scholarly manuscripts. It enforces five foundational research principles:

1. **Discipline Sensitivity**: Recommendations adapt across Quantitative, Qualitative, Mixed Methods, and Discipline-Specific designs (e.g. Doctrinal Legal Research, Engineering Simulations, Computational Experiments).
2. **Explicit Assumption & Limitation Tracking**: Every suggested design exposes its epistemological stance, statistical assumptions (e.g., normality, homoscedasticity, linearity), and methodological limitations (e.g., cross-sectional designs cannot establish causality).
3. **Researcher Sovereignty**: The AI assistant never silently alters or imposes a methodology. The researcher must explicitly approve (`approved_by_researcher = True`) and adopt the design.
4. **Sampling Rigor**: Enforces mathematical sample size formulas for quantitative studies and explicitly rejects statistical formulas for qualitative inquiries in favor of purposive saturation frameworks.
5. **Operational Alignment**: Connects research variables (Independent, Dependent, Mediating, Moderating, Control) directly to instrument scale items and empirical datasets.

---

## 2. Supported Methodology Taxonomy

| Paradigm | Design Category | Supported Designs |
| :--- | :--- | :--- |
| **Quantitative** | Observational & Correlational | Descriptive Survey, Cross-Sectional Survey, Longitudinal Panel, Correlational Cohort |
| **Quantitative** | Experimental & Quasi-Experimental | True Randomized Controlled Trial (RCT), Quasi-Experimental Pretest-Posttest, Ex Post Facto, Comparative Design |
| **Qualitative** | Inductive & Interpretive | Case Study, Phenomenology, Grounded Theory, Ethnography, Narrative Inquiry, Discourse Analysis, Thematic Analysis |
| **Mixed Methods** | Integrated Sequential/Parallel | Convergent Parallel, Explanatory Sequential ($QUAN \to qual$), Exploratory Sequential ($QUAL \to quan$), Embedded Case Design |
| **Discipline-Specific**| Engineering & Computing | Computational Benchmarking, Software Architecture Evaluation, Simulation-Based Modeling |
| **Discipline-Specific**| Humanities & Legal | Doctrinal Legal Analysis, Comparative Jurisprudence, Historical Archival Inquiry, Textual Hermeneutics |

---

## 3. Sampling Size Determination Mathematics

The engine implements four deterministic quantitative sampling algorithms and one reasoned qualitative purposive sampling framework.

### 3.1 Yamane (1967) Formula for Finite Populations

Used when the total population size $N$ is known and finite:
$$n = \frac{N}{1 + N(e^2)}$$
Where:
- $N$ = Known finite population size
- $e$ = Desired margin of error (standard: $0.05$ or $0.01$)

With nonresponse inflation adjustment:
$$n_{\text{adjusted}} = \frac{n}{1 - r_{\text{nonresponse}}}$$
Where $r_{\text{nonresponse}}$ is the expected attrition rate (e.g., $10\% = 0.10$).

### 3.2 Cochran (1977) Formula for Infinite / Large Populations

Used when the target population is large or infinite:
$$n_0 = \frac{Z^2 \cdot p(1 - p)}{e^2}$$
Where:
- $Z$ = Critical value from standard normal distribution ($Z = 1.96$ for $95\%$ confidence, $Z = 2.576$ for $99\%$ confidence)
- $p$ = Estimated proportion of attribute in population (defaults to $0.50$ for maximum variance)
- $e$ = Margin of error

When applied to a finite population $N$, Cochran's Finite Population Correction (FPC) is deterministically applied:
$$n = \frac{n_0}{1 + \frac{n_0 - 1}{N}}$$

### 3.3 Krejcie & Morgan (1970) Formula

Standard for educational and behavioral science research:
$$s = \frac{\chi^2 \cdot N \cdot P(1 - P)}{d^2 (N - 1) + \chi^2 \cdot P(1 - P)}$$
Where:
- $\chi^2$ = Chi-square value for 1 degree of freedom at desired confidence ($3.841$ for $95\%$)
- $N$ = Population size
- $P$ = Population proportion ($0.50$)
- $d$ = Degree of accuracy expressed as a proportion ($0.05$)

### 3.4 Statistical Power Analysis ($1 - \beta$)

Determines minimum sample size required to detect an anticipated effect size ($d$, $r$, or $f$) at a specified power level ($1 - \beta = 0.80$ or $0.90$) and significance level ($\alpha = 0.05$):
$$n = \frac{2 \cdot (Z_{\alpha/2} + Z_{\beta})^2}{\delta^2}$$
Where:
- $Z_{\alpha/2}$ = Two-tailed alpha threshold ($1.96$)
- $Z_{\beta}$ = One-tailed beta threshold ($0.842$ for $80\%$ power, $1.282$ for $90\%$ power)
- $\delta$ = Standardized effect size (Cohen's $d$)

### 3.5 Rejection of Statistical Formulas for Qualitative Research

When a researcher selects a qualitative design (e.g. Grounded Theory, Phenomenology, Narrative Inquiry), the engine **strictly rejects mathematical formulas**:
- **Explicit Warning**: Emits an educational directive explaining that probabilistic sample size formulas violate the epistemological foundation of interpretive inquiry.
- **Saturation Guidelines**: Recommends reasoned purposive ranges based on methodological literature (e.g. Creswell, 2013; Guest et al., 2006):
  - *Phenomenology*: 5 to 25 in-depth interview participants.
  - *Grounded Theory*: 20 to 35 participants to achieve theoretical saturation of categories.
  - *Case Study*: 3 to 5 distinct cases for multi-case comparative designs.
  - *Ethnography*: Prolonged engagement with key informants over time.

---

## 4. Research Variable Operationalization

Variables are structured in the database with strict role and measurement scales:
- **Variable Roles**: `INDEPENDENT`, `DEPENDENT`, `MEDIATING`, `MODERATING`, `CONTROL`
- **Measurement Scales**: `NOMINAL`, `ORDINAL`, `INTERVAL`, `RATIO`
- **Linkage**: Operational definitions flow directly into `InstrumentItem` prompts and `ResearchDataset` column profiles.

