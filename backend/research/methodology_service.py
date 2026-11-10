"""
ScholarForge AI — Intelligent Research Methodology & Sampling Engine.

Provides discipline-aware methodology recommendations, design trade-offs,
assumptions, limitations, and rigorous sample size planning calculations.
"""

import math
from typing import Dict, Any, List, Optional


class MethodologyService:
    """
    Intelligent research methodology recommender and sampling calculation engine.
    """

    METHODOLOGY_TAXONOMY = {
        'QUANTITATIVE': [
            {
                'design_type': 'DESCRIPTIVE_SURVEY',
                'name': 'Descriptive Survey Design',
                'description': 'Systematic empirical gathering of data to describe characteristics, frequencies, and trends of a target population.',
                'suitable_disciplines': ['Business', 'Management', 'Social Sciences', 'Education', 'Health'],
                'assumptions': [
                    'The sample accurately reflects the demographic distribution of the target population.',
                    'Survey questions are interpreted consistently across diverse respondents.',
                    'Non-response bias is minimal or can be controlled methodologically.'
                ],
                'tradeoffs': [
                    'High generalizability across broad populations with standardized measurement.',
                    'Limited depth compared to qualitative inquiry; susceptible to self-reporting bias.'
                ],
                'limitations': [
                    'Cannot infer causality or directional causation.',
                    'Contextual nuances may be obscured by fixed-choice response scales.'
                ],
                'suggested_instruments': ['QUESTIONNAIRE'],
                'suggested_analysis': ['DESCRIPTIVES', 'CHI_SQUARE', 'RELIABILITY_CRONBACH']
            },
            {
                'design_type': 'CORRELATIONAL_STUDY',
                'name': 'Correlational Study Design',
                'description': 'Measures statistical relationships and co-variation between two or more variables without experimental manipulation.',
                'suitable_disciplines': ['Economics', 'Business', 'Psychology', 'Education', 'Social Sciences'],
                'assumptions': [
                    'Variables exhibit linear or monotonic relationships.',
                    'Observations are independent across respondents or measurement occasions.',
                    'Measurement scales possess adequate construct validity and internal consistency.'
                ],
                'tradeoffs': [
                    'Enables predictive modeling and quantitative verification of hypotheses.',
                    'Vulnerable to confounding variables and the third-variable problem.'
                ],
                'limitations': [
                    'Correlation does NOT establish causation.',
                    'Susceptible to spurious correlations in large-sample datasets.'
                ],
                'suggested_instruments': ['QUESTIONNAIRE', 'DATA_EXTRACTION_FORM'],
                'suggested_analysis': ['PEARSON_CORRELATION', 'SPEARMAN_CORRELATION', 'LINEAR_REGRESSION']
            },
            {
                'design_type': 'EXPERIMENTAL_DESIGN',
                'name': 'True Experimental Design',
                'description': 'Rigorous scientific design featuring random assignment, control groups, and systematic manipulation of independent variables.',
                'suitable_disciplines': ['Computer Science', 'Medicine', 'Engineering', 'Psychology', 'Natural Sciences'],
                'assumptions': [
                    'Random assignment equalizes experimental and control groups prior to treatment.',
                    'Extraneous environmental variables can be isolated or controlled.',
                    'Treatment fidelity is preserved across all experimental trials.'
                ],
                'tradeoffs': [
                    'High internal validity and definitive evidence of causal mechanisms.',
                    'Artificial laboratory conditions may limit ecological and external validity.'
                ],
                'limitations': [
                    'May be unfeasible or unethical in human behavioral and organizational settings.',
                    'Requires substantial resources and specialized laboratory instrumentation.'
                ],
                'suggested_instruments': ['EXPERIMENTAL_RECORDING_SHEET'],
                'suggested_analysis': ['T_TEST_INDEPENDENT', 'ANOVA_ONE_WAY', 'LINEAR_REGRESSION']
            },
            {
                'design_type': 'QUASI_EXPERIMENTAL',
                'name': 'Quasi-Experimental Design',
                'description': 'Investigates causal relationships in settings where random assignment is impractical or unethical (e.g. non-equivalent control group).',
                'suitable_disciplines': ['Education', 'Public Health', 'Policy Studies', 'Management'],
                'assumptions': [
                    'Baseline pre-test scores control for pre-existing group differences.',
                    'History and maturation threats affect both groups symmetrically.'
                ],
                'tradeoffs': [
                    'Higher ecological validity in natural classroom or organizational settings.',
                    'Internal validity is lower than true experimental setups due to selection bias.'
                ],
                'limitations': [
                    'Pre-existing baseline differences cannot be completely ruled out statistically.',
                    'Requires robust pre-treatment covariate adjustments.'
                ],
                'suggested_instruments': ['DATA_EXTRACTION_FORM', 'QUESTIONNAIRE'],
                'suggested_analysis': ['T_TEST_PAIRED', 'ANOVA_ONE_WAY', 'LINEAR_REGRESSION']
            }
        ],
        'QUALITATIVE': [
            {
                'design_type': 'CASE_STUDY',
                'name': 'In-Depth Case Study Design',
                'description': 'Empirical inquiry that investigates a contemporary phenomenon within its real-world context using multiple sources of evidence.',
                'suitable_disciplines': ['Business', 'Management', 'Law', 'Information Systems', 'Education'],
                'assumptions': [
                    'Boundaries between phenomenon and context are not clearly evident.',
                    'Multiple sources of evidence converge in a triangulating fashion.'
                ],
                'tradeoffs': [
                    'Unrivaled richness, contextual depth, and holistic system understanding.',
                    'Findings cannot be generalized statistically to a wider universe.'
                ],
                'limitations': [
                    'Potential researcher subjectivity in evidence interpretation.',
                    'Extensive time investment required for multi-source fieldwork.'
                ],
                'suggested_instruments': ['INTERVIEW_GUIDE', 'OBSERVATION_CHECKLIST'],
                'suggested_analysis': ['QUALITATIVE_THEMATIC']
            },
            {
                'design_type': 'PHENOMENOLOGY',
                'name': 'Phenomenological Inquiry',
                'description': 'Investigates the essence and common meaning of lived experiences for several individuals regarding a specific phenomenon.',
                'suitable_disciplines': ['Nursing', 'Health Sciences', 'Psychology', 'Education'],
                'assumptions': [
                    'Participants have directly lived and can articulate the central phenomenon.',
                    'The researcher can bracket (epoche) personal preconceptions.'
                ],
                'tradeoffs': [
                    'Deep empathy and profound insight into human consciousness and subjective experience.',
                    'Requires articulate participants and high psychological reflexivity.'
                ],
                'limitations': [
                    'Difficult to bracket personal biases completely.',
                    'Findings are idiographic rather than nomothetic.'
                ],
                'suggested_instruments': ['INTERVIEW_GUIDE'],
                'suggested_analysis': ['QUALITATIVE_THEMATIC']
            },
            {
                'design_type': 'THEMATIC_ANALYSIS',
                'name': 'Systematic Thematic Analysis',
                'description': 'Method for systematically identifying, analyzing, and reporting qualitative patterns (themes) within text corpora.',
                'suitable_disciplines': ['Social Sciences', 'Communications', 'Humanities', 'Interdisciplinary'],
                'assumptions': [
                    'Language reflects socially constructed realities or psychological states.',
                    'Transcripts accurately capture verbatim participant utterances.'
                ],
                'tradeoffs': [
                    'Highly accessible, flexible, and applicable across diverse theoretical frameworks.',
                    'Lacks specific prescriptive guidelines compared to grounded theory.'
                ],
                'limitations': [
                    'Risk of cherry-picking quotes without verifying thematic coherence.',
                    'Does not automatically generate an overarching structural model.'
                ],
                'suggested_instruments': ['INTERVIEW_GUIDE', 'FOCUS_GROUP_GUIDE'],
                'suggested_analysis': ['QUALITATIVE_THEMATIC']
            }
        ],
        'MIXED_METHODS': [
            {
                'design_type': 'EXPLANATORY_SEQUENTIAL',
                'name': 'Explanatory Sequential Mixed Design (QUAN -> qual)',
                'description': 'Collects and analyzes quantitative survey/experimental data first, followed by qualitative interviews to explain surprising or outlier quantitative trends.',
                'suitable_disciplines': ['Management', 'Public Health', 'Education', 'Social Sciences'],
                'assumptions': [
                    'Quantitative trends require qualitative contextualization to understand underlying mechanisms.',
                    'The researcher possesses expertise in both quantitative and qualitative traditions.'
                ],
                'tradeoffs': [
                    'Combines generalizable quantitative breadth with rich qualitative explanatory power.',
                    'Substantially extended research timeline and dual methodological demands.'
                ],
                'limitations': [
                    'Resource-intensive; requires sequential sampling protocols.',
                    'Integrating disparate philosophical paradigms requires careful reflexivity.'
                ],
                'suggested_instruments': ['QUESTIONNAIRE', 'INTERVIEW_GUIDE'],
                'suggested_analysis': ['DESCRIPTIVES', 'LINEAR_REGRESSION', 'QUALITATIVE_THEMATIC']
            },
            {
                'design_type': 'CONVERGENT_MIXED',
                'name': 'Convergent Mixed Methods Design (QUAN + QUAL)',
                'description': 'Collects quantitative and qualitative data concurrently, compares the results side-by-side, and synthesizes findings to provide comprehensive evidence.',
                'suitable_disciplines': ['Health Services', 'Organizational Studies', 'Evaluation Research'],
                'assumptions': [
                    'Both quantitative and qualitative facets address the same overarching research questions.',
                    'Contradictions between datasets can be theoretically resolved.'
                ],
                'tradeoffs': [
                    'Direct comparison and triangulation of diverse evidence streams.',
                    'Divergent findings can be complex to synthesize without bias.'
                ],
                'limitations': [
                    'Logistical complexity in concurrent data collection.',
                    'Sample size differences between arms may complicate direct synthesis.'
                ],
                'suggested_instruments': ['QUESTIONNAIRE', 'INTERVIEW_GUIDE'],
                'suggested_analysis': ['DESCRIPTIVES', 'QUALITATIVE_THEMATIC']
            }
        ],
        'DISCIPLINE_SPECIFIC': [
            {
                'design_type': 'COMPUTATIONAL_SIMULATION',
                'name': 'Computational Experimentation & Benchmark Simulation',
                'description': 'Evaluates algorithmic efficiency, protocol latency, error tolerance, and architectural scalability under controlled synthetic workloads.',
                'suitable_disciplines': ['Computer Science', 'Software Engineering', 'Data Science'],
                'assumptions': [
                    'Hardware testbeds and simulation parameters emulate production environments.',
                    'Random seeds and workload distributions are reproducible across runs.'
                ],
                'tradeoffs': [
                    'Complete control over network faults, packet drops, and concurrent load.',
                    'May omit unmodeled real-world environmental stochasticity.'
                ],
                'limitations': [
                    'Heavy dependence on specific hardware benchmarks and driver environments.',
                    'Simulated scale may not capture chaotic internet-scale distributed dynamics.'
                ],
                'suggested_instruments': ['EXPERIMENTAL_RECORDING_SHEET'],
                'suggested_analysis': ['DESCRIPTIVES', 'T_TEST_INDEPENDENT', 'ANOVA_ONE_WAY']
            },
            {
                'design_type': 'DOCTRINAL_LEGAL',
                'name': 'Doctrinal Legal Research & Case Analysis',
                'description': 'Rigorous textual, statutory, and jurisprudence analysis of primary legal sources (constitutions, statutes, appellate precedents) and secondary commentaries.',
                'suitable_disciplines': ['Law', 'Legal Studies', 'Jurisprudence'],
                'assumptions': [
                    'Legal statutes and judicial precedents form a coherent, interpretable normative framework.',
                    'Statutory canons of interpretation can resolve legislative ambiguities.'
                ],
                'tradeoffs': [
                    'Authoritative normative clarity regarding legal duties, liabilities, and rights.',
                    'Does not assess empirical sociological implementation or courtroom behavioral realities.'
                ],
                'limitations': [
                    'Jurisdiction-bound; findings cannot be generalized across differing legal systems.',
                    'Susceptible to judicial ideological interpretative shifts.'
                ],
                'suggested_instruments': ['DATA_EXTRACTION_FORM'],
                'suggested_analysis': ['QUALITATIVE_THEMATIC']
            }
        ]
    }

    @classmethod
    def recommend_methodology(
        cls,
        discipline_name: str,
        document_category: str,
        objectives_text: str = '',
        hypotheses_text: str = '',
        study_type_hint: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Recommends tailored research methodologies based on discipline, objectives, and hypotheses.
        """
        disc_lower = (discipline_name or '').lower()
        has_hypotheses = bool(hypotheses_text and hypotheses_text.strip())
        obj_lower = (objectives_text or '').lower()

        recommendations = []

        # Check all categories in taxonomy
        for approach, designs in cls.METHODOLOGY_TAXONOMY.items():
            for d in designs:
                score = 0.50  # baseline

                # Discipline matching
                suitable_discs = [s.lower() for s in d.get('suitable_disciplines', [])]
                if any(s in disc_lower for s in suitable_discs):
                    score += 0.25

                # Hypotheses affinity
                if has_hypotheses and approach == 'QUANTITATIVE':
                    score += 0.20
                elif not has_hypotheses and approach == 'QUALITATIVE':
                    score += 0.15

                # Keyword affinity
                if 'relationship' in obj_lower or 'influence' in obj_lower or 'impact' in obj_lower:
                    if d['design_type'] in ('CORRELATIONAL_STUDY', 'EXPERIMENTAL_DESIGN'):
                        score += 0.20
                if 'experience' in obj_lower or 'explore' in obj_lower or 'meaning' in obj_lower:
                    if d['design_type'] in ('PHENOMENOLOGY', 'THEMATIC_ANALYSIS', 'CASE_STUDY'):
                        score += 0.20
                if 'algorithm' in obj_lower or 'benchmark' in obj_lower or 'performance' in obj_lower:
                    if d['design_type'] == 'COMPUTATIONAL_SIMULATION':
                        score += 0.35

                # Discipline specific overrides
                if 'computer' in disc_lower or 'software' in disc_lower:
                    if d['design_type'] == 'COMPUTATIONAL_SIMULATION':
                        score = max(score, 0.95)
                if 'law' in disc_lower or 'legal' in disc_lower:
                    if d['design_type'] == 'DOCTRINAL_LEGAL':
                        score = max(score, 0.95)

                suitability = min(round(score, 2), 0.98)
                recommendations.append({
                    **d,
                    'approach': approach,
                    'suitability_score': suitability,
                    'is_recommended': suitability >= 0.70
                })

        # Sort descending by suitability score
        recommendations.sort(key=lambda r: r['suitability_score'], reverse=True)
        return recommendations

    # =========================================================================
    # SAMPLE SIZE CALCULATORS
    # =========================================================================

    @staticmethod
    def calculate_cochran(
        margin_of_error: float = 0.05,
        confidence_level: float = 0.95,
        estimated_proportion: float = 0.50,
        population_size: Optional[int] = None,
        nonresponse_rate: float = 0.10
    ) -> Dict[str, Any]:
        """
        Calculates sample size using Cochran's formula with optional finite population correction.
        n0 = (Z^2 * p * (1-p)) / e^2
        """
        # Z-values for common confidence levels
        z_map = {0.90: 1.645, 0.95: 1.96, 0.99: 2.576}
        z = z_map.get(confidence_level, 1.96)
        e = margin_of_error
        p = estimated_proportion
        q = 1.0 - p

        if e <= 0:
            raise ValueError("Margin of error must be greater than 0.")

        n0 = (z ** 2 * p * q) / (e ** 2)
        n0_int = math.ceil(n0)

        # Finite Population Correction (FPC)
        if population_size and population_size > 0:
            n_final = n0 / (1.0 + ((n0 - 1.0) / population_size))
            n_final_int = math.ceil(n_final)
            fpc_applied = True
        else:
            n_final_int = n0_int
            fpc_applied = False

        # Nonresponse adjustment: n_adj = n / (1 - R)
        if 0.0 <= nonresponse_rate < 1.0:
            adjusted = math.ceil(n_final_int / (1.0 - nonresponse_rate))
        else:
            adjusted = n_final_int

        return {
            'formula_name': "Cochran's Formula",
            'formula_expression': "n0 = (Z^2 * p * (1-p)) / e^2" + (" ; n = n0 / (1 + (n0-1)/N)" if fpc_applied else ""),
            'parameters': {
                'confidence_level': confidence_level,
                'z_score': z,
                'margin_of_error': margin_of_error,
                'estimated_proportion': estimated_proportion,
                'population_size': population_size,
                'nonresponse_rate': nonresponse_rate
            },
            'fpc_applied': fpc_applied,
            'initial_sample_size': n0_int,
            'calculated_sample_size': n_final_int,
            'adjusted_sample_size': adjusted,
            'assumptions': [
                "Assumes normally distributed sampling distribution of the proportion.",
                "Assumes maximum population variability when p=0.50.",
                "Requires simple random sampling (SRS) from the sampling frame."
            ],
            'limitations': [
                "If cluster or multi-stage sampling is used, design effects must be multiplied.",
                "Assumes continuous scale or binomial classification."
            ]
        }

    @staticmethod
    def calculate_yamane(
        population_size: int,
        margin_of_error: float = 0.05,
        nonresponse_rate: float = 0.10
    ) -> Dict[str, Any]:
        """
        Calculates sample size using Yamane's (1967) formula for known finite populations:
        n = N / (1 + N * e^2)
        """
        N = population_size
        e = margin_of_error
        if N <= 0:
            raise ValueError("Yamane's formula strictly requires a positive finite population size (N).")
        if e <= 0:
            raise ValueError("Margin of error must be greater than 0.")

        n = N / (1.0 + (N * (e ** 2)))
        n_int = math.ceil(n)

        if 0.0 <= nonresponse_rate < 1.0:
            adjusted = math.ceil(n_int / (1.0 - nonresponse_rate))
        else:
            adjusted = n_int

        return {
            'formula_name': "Yamane's Formula (1967)",
            'formula_expression': "n = N / (1 + N * e^2)",
            'parameters': {
                'population_size': N,
                'margin_of_error': e,
                'confidence_level': 0.95,
                'nonresponse_rate': nonresponse_rate
            },
            'calculated_sample_size': n_int,
            'adjusted_sample_size': adjusted,
            'assumptions': [
                "Assumes 95% confidence level and 50% proportion variability implicitly.",
                "Requires a defined, finite target population size (N).",
                "Assumes random selection of respondents."
            ],
            'limitations': [
                "Does not allow custom confidence levels (e.g. 90% or 99%).",
                "Tends to underestimate required sample sizes for highly skewed parameters."
            ]
        }

    @staticmethod
    def calculate_krejcie_morgan(
        population_size: int,
        margin_of_error: float = 0.05,
        confidence_level: float = 0.95,
        nonresponse_rate: float = 0.10
    ) -> Dict[str, Any]:
        """
        Calculates sample size using Krejcie & Morgan (1970) formulation:
        s = (X^2 * N * P * (1-P)) / (d^2 * (N-1) + X^2 * P * (1-P))
        where X^2 = chi-square for 1 df at confidence level (3.841 for 95%).
        """
        N = population_size
        d = margin_of_error
        P = 0.50
        chi_sq_map = {0.90: 2.706, 0.95: 3.841, 0.99: 6.635}
        chi_sq = chi_sq_map.get(confidence_level, 3.841)

        if N <= 1:
            raise ValueError("Krejcie and Morgan formula requires N > 1.")
        if d <= 0:
            raise ValueError("Margin of error must be > 0.")

        numerator = chi_sq * N * P * (1.0 - P)
        denominator = (d ** 2 * (N - 1)) + (chi_sq * P * (1.0 - P))
        s = numerator / denominator
        s_int = math.ceil(s)

        if 0.0 <= nonresponse_rate < 1.0:
            adjusted = math.ceil(s_int / (1.0 - nonresponse_rate))
        else:
            adjusted = s_int

        return {
            'formula_name': "Krejcie & Morgan (1970) Approach",
            'formula_expression': "s = (chi^2 * N * P * (1-P)) / (d^2 * (N-1) + chi^2 * P * (1-P))",
            'parameters': {
                'population_size': N,
                'margin_of_error': d,
                'confidence_level': confidence_level,
                'chi_square_critical': chi_sq,
                'proportion': P,
                'nonresponse_rate': nonresponse_rate
            },
            'calculated_sample_size': s_int,
            'adjusted_sample_size': adjusted,
            'assumptions': [
                "Produces sample sizes where sample proportion is within ±0.05 of population proportion.",
                "Assumes 95% confidence and maximum population variance (P=0.50).",
                "Widely accepted standard in educational and social science research."
            ],
            'limitations': [
                "Sample size plateaus around 384 for very large populations.",
                "Assumes simple random sampling without stratification weights."
            ]
        }

    @staticmethod
    def calculate_power_analysis(
        effect_size: float = 0.50,
        alpha: float = 0.05,
        power: float = 0.80,
        test_type: str = 'TWO_SAMPLE_T_TEST',
        nonresponse_rate: float = 0.10
    ) -> Dict[str, Any]:
        """
        Calculates sample size requirements based on statistical power analysis (1 - beta).
        For two-sample t-test: n_per_group = 2 * ((z_alpha/2 + z_beta) / d)^2
        """
        # Two-tailed alpha Z
        z_alpha = 1.96 if alpha == 0.05 else (2.576 if alpha == 0.01 else 1.645)
        # Power Z (one-tailed)
        z_power_map = {0.80: 0.842, 0.85: 1.036, 0.90: 1.282, 0.95: 1.645}
        z_beta = z_power_map.get(power, 0.842)

        if effect_size <= 0:
            raise ValueError("Effect size must be positive.")

        if test_type == 'CORRELATION':
            # n = ((z_alpha + z_beta) / (0.5 * ln((1+r)/(1-r))))^2 + 3
            z_r = 0.5 * math.log((1.0 + effect_size) / (1.0 - effect_size)) if abs(effect_size) < 1 else 0.5
            n_raw = ((z_alpha + z_beta) / max(z_r, 0.01)) ** 2 + 3
            n_total = math.ceil(n_raw)
            per_group = n_total
        else:
            # Default two-sample t-test
            n_per_group = 2 * (((z_alpha + z_beta) / effect_size) ** 2)
            per_group = math.ceil(n_per_group)
            n_total = per_group * 2

        if 0.0 <= nonresponse_rate < 1.0:
            adjusted = math.ceil(n_total / (1.0 - nonresponse_rate))
        else:
            adjusted = n_total

        return {
            'formula_name': "Statistical Power Analysis",
            'test_type': test_type,
            'formula_expression': "n = 2 * ((Z_alpha/2 + Z_beta) / d)^2 per group",
            'parameters': {
                'effect_size_cohens_d': effect_size,
                'significance_level_alpha': alpha,
                'statistical_power_1_minus_beta': power,
                'z_alpha': z_alpha,
                'z_beta': z_beta,
                'nonresponse_rate': nonresponse_rate
            },
            'sample_size_per_group': per_group,
            'calculated_sample_size': n_total,
            'adjusted_sample_size': adjusted,
            'assumptions': [
                "Controls both Type I error rate (alpha) and Type II error rate (beta).",
                "Assumes data will be normally distributed with homogeneous variances."
            ],
            'limitations': [
                "Requires prior estimate of expected effect size from pilot studies or meta-analyses.",
                "Underpowered studies risk inconclusive findings; overpowered studies detect trivial differences."
            ]
        }

    @staticmethod
    def get_qualitative_sampling_guidance(strategy: str = 'PURPOSIVE') -> Dict[str, Any]:
        """
        Provides reasoned qualitative sampling plans with saturation criteria.
        Refuses to apply statistical sample size formulas to non-probabilistic qualitative inquiry.
        """
        strategies = {
            'PURPOSIVE': {
                'name': 'Purposive (Criterion) Sampling',
                'description': 'Selects participants who have directly experienced the central phenomenon and meet predetermined inclusion criteria.',
                'typical_sample_range': '12 to 25 in-depth interviews',
                'saturation_criterion': 'Data saturation is achieved when 3 consecutive interviews reveal no novel thematic dimensions or properties.',
                'rationale': 'Maximizes informational density on specific research questions rather than demographic representation.',
                'limitations': 'Potential researcher bias in criteria definition; findings cannot be generalized statistically.'
            },
            'MAXIMUM_VARIATION': {
                'name': 'Maximum Variation (Heterogeneity) Sampling',
                'description': 'Purposively selects cases across divergent demographics, organizational tiers, or geographic sites to identify cross-cutting common patterns.',
                'typical_sample_range': '15 to 30 interviews across 3-4 distinct strata',
                'saturation_criterion': 'Thematic recurrence across diverse contexts indicates robust core phenomenon patterns.',
                'rationale': 'Strengthens transferability by showing findings persist across disparate settings.',
                'limitations': 'Requires substantial fieldwork coordination to identify outlier cases.'
            },
            'GROUNDED_THEORY_THEORETICAL': {
                'name': 'Theoretical Sampling (Grounded Theory)',
                'description': 'Data collection and analysis proceed iteratively; emergent conceptual categories dictate where to sample next.',
                'typical_sample_range': '20 to 40 interviews / field observations',
                'saturation_criterion': 'Theoretical saturation is reached when conceptual categories are dense and well-developed with verified linkages.',
                'rationale': 'Guarantees the resulting theoretical model is grounded directly in empirical qualitative data.',
                'limitations': 'Exact final sample size cannot be determined at the proposal stage.'
            }
        }
        selected = strategies.get(strategy.upper(), strategies['PURPOSIVE'])
        return {
            'strategy_name': selected['name'],
            'description': selected['description'],
            'typical_sample_range': selected['typical_sample_range'],
            'saturation_criterion': selected['saturation_criterion'],
            'rationale': selected['rationale'],
            'limitations': selected['limitations'],
            'scientific_warning': (
                "Mathematical sample size formulas (e.g. Cochran, Yamane) apply strictly to probabilistic "
                "surveys and cannot be validly applied to qualitative phenomenology, grounded theory, or narrative inquiry."
            )
        }

