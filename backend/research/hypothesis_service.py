"""
Hypothesis Testing Assistant Service for ScholarForge AI.

Maps formal research hypotheses to computed statistical tests, applies rigorous decision rules
(alpha = 0.05), extracts effect sizes, and provides grounded academic interpretations.
Ensures zero confusion between correlation and causation.
"""

from typing import Dict, List, Any, Optional


class HypothesisService:
    """Evaluates project hypotheses against verified statistical outputs."""

    @classmethod
    def evaluate_hypothesis(
        cls,
        hypothesis_statement: str,
        hypothesis_type: str,
        test_type: str,
        statistical_result_data: Dict[str, Any],
        significance_threshold: float = 0.05
    ) -> Dict[str, Any]:
        """
        Evaluates a hypothesis based on computed statistical results.
        Enforces decision rules: REJECT_NULL vs FAIL_TO_REJECT_NULL.
        """
        p_val = None
        test_stat = None
        stat_name = ""
        df = ""
        effect_size = None
        effect_name = ""

        # Extract values based on test_type
        if test_type in ("PEARSON_CORRELATION", "CORRELATION"):
            p_val = statistical_result_data.get("p_value")
            test_stat = statistical_result_data.get("correlation_coefficient")
            stat_name = "r"
            df = f"df={statistical_result_data.get('degrees_of_freedom', '')}"
            effect_size = statistical_result_data.get("r_squared")
            effect_name = "R²"
        elif test_type in ("INDEPENDENT_T_TEST", "T_TEST"):
            st_info = statistical_result_data.get("student_t", {})
            p_val = st_info.get("p_value")
            test_stat = st_info.get("t_statistic")
            stat_name = "t"
            df = f"df={st_info.get('degrees_of_freedom', '')}"
            effect_size = statistical_result_data.get("cohens_d")
            effect_name = "Cohen's d"
        elif test_type in ("ONE_WAY_ANOVA", "ANOVA"):
            an_info = statistical_result_data.get("anova_table", {})
            p_val = an_info.get("p_value")
            test_stat = an_info.get("f_statistic")
            stat_name = "F"
            df = f"df=({an_info.get('df_between')}, {an_info.get('df_within')})"
            effect_size = statistical_result_data.get("eta_squared")
            effect_name = "η²"
        elif test_type in ("LINEAR_REGRESSION", "REGRESSION"):
            p_val = statistical_result_data.get("f_p_value")
            test_stat = statistical_result_data.get("f_statistic")
            stat_name = "F"
            dfs = statistical_result_data.get("f_degrees_of_freedom", [0, 0])
            df = f"df=({dfs[0]}, {dfs[1]})"
            effect_size = statistical_result_data.get("r_squared")
            effect_name = "R²"
        elif test_type in ("CHI_SQUARE", "CHI_SQUARE_INDEPENDENCE"):
            p_val = statistical_result_data.get("p_value")
            test_stat = statistical_result_data.get("chi_square_statistic")
            stat_name = "χ²"
            df = f"df={statistical_result_data.get('degrees_of_freedom')}"
            effect_size = statistical_result_data.get("cramers_v")
            effect_name = "Cramer's V"
        else:
            p_val = statistical_result_data.get("p_value", 1.0)
            test_stat = statistical_result_data.get("test_statistic", 0.0)
            stat_name = "Statistic"

        if p_val is None:
            raise ValueError(f"No p-value found in statistical result data for test '{test_type}'.")

        is_significant = p_val < significance_threshold
        decision = "REJECT_NULL" if is_significant else "FAIL_TO_REJECT_NULL"

        # Construct APA-style statistical report sentence
        apa_stat = f"{stat_name}({df.replace('df=', '')}) = {test_stat:.3f}, p = {p_val:.4f}"
        if effect_size is not None:
            apa_stat += f", {effect_name} = {effect_size:.3f}"

        # Substantive narrative interpretation
        if is_significant:
            interpretation = (
                f"The empirical data provides sufficient statistical evidence to reject the null hypothesis at the "
                f"alpha = {significance_threshold} level ({apa_stat}). Consequently, empirical support is found for the "
                f"postulated research hypothesis. However, researchers must be careful to interpret this relationship "
                f"strictly within the empirical parameters of this study, recognizing that statistical correlation does not imply direct causation."
            )
        else:
            interpretation = (
                f"The statistical test failed to reach significance at the alpha = {significance_threshold} level ({apa_stat}). "
                f"Therefore, the researcher fails to reject the null hypothesis. The observed differences or associations may be "
                f"attributable to random sampling variation rather than a genuine systemic effect."
            )

        return {
            "hypothesis_statement": hypothesis_statement,
            "hypothesis_type": hypothesis_type,
            "test_type": test_type,
            "decision": decision,
            "decision_rule": f"Reject H0 if p < {significance_threshold}; Fail to reject H0 if p >= {significance_threshold}.",
            "p_value": p_val,
            "test_statistic": test_stat,
            "statistic_name": stat_name,
            "degrees_of_freedom": df,
            "effect_size": effect_size,
            "effect_size_name": effect_name,
            "apa_reporting_format": apa_stat,
            "substantive_interpretation": interpretation,
            "is_supported": is_significant
        }

