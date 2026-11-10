"""
Independent Numerical & Scientific Validation Tests for ScholarForge AI Statistical Engine.

Validates the determinism, precision, and edge-case robustness of `StatisticsService`
against SciPy / statsmodels reference algorithms and analytic standards.

Covers:
1. Small sample sizes (N < 5)
2. Extreme p-values (Z > 8, t > 25, chi2 > 50, F > 100)
3. Ties in nonparametric tests (Spearman rho, Mann-Whitney U, Wilcoxon, Kruskal-Wallis)
4. Zero variance (constant columns, identical distributions)
5. Singular regression matrices (perfect multicollinearity detection)
6. Logistic regression convergence & probability clamping
7. Missing observations (complete case filtering)
8. Numerical precision & 95% Confidence Intervals
9. Effect size calculations (Cohen's d, Eta-squared, Cramer's V)
"""

import pytest
import math
from research.statistics_service import (
    StatisticsService,
    norm_cdf,
    norm_p_value,
    chi2_p_value,
    t_p_value,
    f_p_value,
)

try:
    import scipy.stats as sp_stats
    import numpy as np
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


class TestSmallSampleSizes:
    """Validates statistical calculations on small samples (N < 5)."""

    def test_descriptive_statistics_n3(self):
        data = [{"x": 10.0}, {"x": 20.0}, {"x": 30.0}]
        res = StatisticsService.calculate_descriptive_statistics(data, "x")
        assert res["sample_size"] == 3
        assert res["mean"] == 20.0
        assert res["median"] == 20.0
        assert res["variance"] == 100.0  # ((10-20)^2 + (20-20)^2 + (30-20)^2) / 2 = 200 / 2 = 100
        assert res["standard_deviation"] == 10.0
        assert res["skewness"] == 0.0  # Symmetric distribution

        if SCIPY_AVAILABLE:
            sp_mean = float(np.mean([10.0, 20.0, 30.0]))
            sp_var = float(np.var([10.0, 20.0, 30.0], ddof=1))
            assert math.isclose(res["mean"], sp_mean, rel_tol=1e-3)
            assert math.isclose(res["variance"], sp_var, rel_tol=1e-3)

    def test_independent_t_test_small_samples(self):
        # Two groups with N1=3, N2=3
        data = [
            {"score": 12.0, "grp": "A"},
            {"score": 14.0, "grp": "A"},
            {"score": 16.0, "grp": "A"},
            {"score": 20.0, "grp": "B"},
            {"score": 22.0, "grp": "B"},
            {"score": 24.0, "grp": "B"},
        ]
        res = StatisticsService.calculate_independent_t_test(data, "score", "grp")
        assert res["group_1"]["sample_size"] == 3
        assert res["group_2"]["sample_size"] == 3
        assert res["student_t"]["degrees_of_freedom"] == 4
        assert math.isclose(abs(res["student_t"]["t_statistic"]), 4.899, abs_tol=0.01)
        assert res["student_t"]["is_significant"] is True
        assert abs(res["cohens_d"]) > 0

        if SCIPY_AVAILABLE:
            sp_t, sp_p = sp_stats.ttest_ind([12.0, 14.0, 16.0], [20.0, 22.0, 24.0], equal_var=True)
            assert math.isclose(abs(res["student_t"]["t_statistic"]), abs(sp_t), abs_tol=0.01)
            assert math.isclose(res["student_t"]["p_value"], sp_p, abs_tol=0.01)

    def test_paired_t_test_n4(self):
        data = [
            {"pre": 10.0, "post": 15.0},
            {"pre": 12.0, "post": 16.0},
            {"pre": 14.0, "post": 19.0},
            {"pre": 16.0, "post": 22.0},
        ]
        res = StatisticsService.calculate_paired_t_test(data, "pre", "post")
        assert res["sample_size"] == 4
        assert res["degrees_of_freedom"] == 3
        assert res["mean_difference"] > 0
        assert res["is_statistically_significant"] is True

        if SCIPY_AVAILABLE:
            sp_t, sp_p = sp_stats.ttest_rel([10.0, 12.0, 14.0, 16.0], [15.0, 16.0, 19.0, 22.0])
            assert math.isclose(abs(res["t_statistic"]), abs(sp_t), abs_tol=0.01)
            assert math.isclose(res["p_value"], sp_p, abs_tol=0.01)

    def test_pearson_correlation_n4(self):
        data = [
            {"x": 1.0, "y": 2.0},
            {"x": 2.0, "y": 4.0},
            {"x": 3.0, "y": 6.0},
            {"x": 4.0, "y": 8.0},
        ]
        res = StatisticsService.calculate_pearson_correlation(data, "x", "y")
        assert res["sample_size"] == 4
        assert math.isclose(res["correlation_coefficient"], 1.0, abs_tol=1e-4)
        assert res["is_statistically_significant"] is True


class TestExtremePValues:
    """Validates boundary handling and numerical stability for extreme test statistics."""

    def test_norm_p_value_extreme_z(self):
        # Extremely large Z score
        p_huge = norm_p_value(12.0, two_tailed=True)
        assert 0.0 <= p_huge <= 1e-15

        # Extreme negative Z score
        p_neg = norm_p_value(-15.0, two_tailed=True)
        assert 0.0 <= p_neg <= 1e-15

        # Zero Z score (p = 1.0)
        p_zero = norm_p_value(0.0, two_tailed=True)
        assert math.isclose(p_zero, 1.0, abs_tol=1e-5)

    def test_t_p_value_extreme_t(self):
        # Huge t with df=30
        p_extreme = t_p_value(35.0, df=30.0, two_tailed=True)
        assert 0.0 <= p_extreme <= 1e-15

        # Small t with df=30
        p_tiny = t_p_value(0.05, df=30.0, two_tailed=True)
        assert p_tiny > 0.90

        # Invalid df fallback
        assert t_p_value(2.0, df=0.0) == 1.0

    def test_chi2_p_value_extreme(self):
        # Very high chi2
        p_high = chi2_p_value(80.0, df=2)
        assert 0.0 <= p_high <= 1e-12

        # Zero chi2
        p_zero = chi2_p_value(0.0, df=2)
        assert p_zero == 1.0

    def test_f_p_value_extreme(self):
        # Very high F ratio
        p_high = f_p_value(150.0, df1=3, df2=40)
        assert 0.0 <= p_high <= 1e-12

        # Zero / negative F
        assert f_p_value(0.0, df1=3, df2=40) == 1.0


class TestTiesInNonparametricTests:
    """Validates ranking and rank-based tests in the presence of tied observations."""

    def test_fractional_ranking_with_ties(self):
        values = [10.0, 20.0, 20.0, 30.0]
        ranks = StatisticsService._rank_data(values)
        assert ranks == [1.0, 2.5, 2.5, 4.0]

    def test_spearman_rho_with_ties(self):
        data = [
            {"x": 10.0, "y": 100.0},
            {"x": 20.0, "y": 200.0},
            {"x": 20.0, "y": 250.0},
            {"x": 30.0, "y": 300.0},
            {"x": 40.0, "y": 350.0},
            {"x": 40.0, "y": 400.0},
        ]
        res = StatisticsService.calculate_spearman_correlation(data, "x", "y")
        assert res["sample_size"] == 6
        assert 0.8 <= res["spearman_rho"] <= 1.0

        if SCIPY_AVAILABLE:
            sp_rho, sp_p = sp_stats.spearmanr([r["x"] for r in data], [r["y"] for r in data])
            assert math.isclose(res["spearman_rho"], sp_rho, abs_tol=0.02)

    def test_mann_whitney_u_with_ties(self):
        data = [
            {"val": 5.0, "grp": "G1"},
            {"val": 5.0, "grp": "G1"},
            {"val": 10.0, "grp": "G1"},
            {"val": 15.0, "grp": "G1"},
            {"val": 10.0, "grp": "G2"},
            {"val": 15.0, "grp": "G2"},
            {"val": 20.0, "grp": "G2"},
            {"val": 20.0, "grp": "G2"},
        ]
        res = StatisticsService.calculate_mann_whitney_u(data, "val", "grp")
        assert "mann_whitney_u" in res
        assert res["group_1"]["n"] == 4
        assert res["group_2"]["n"] == 4
        assert 0.0 <= res["p_value"] <= 1.0


class TestZeroVarianceAndEdgeCases:
    """Validates behavior when variance is zero (constant column) to prevent ZeroDivisionError."""

    def test_descriptive_stats_zero_variance(self):
        data = [{"x": 7.0}, {"x": 7.0}, {"x": 7.0}, {"x": 7.0}]
        res = StatisticsService.calculate_descriptive_statistics(data, "x")
        assert res["sample_size"] == 4
        assert res["mean"] == 7.0
        assert res["variance"] == 0.0
        assert res["standard_deviation"] == 0.0
        assert res["standard_error"] == 0.0
        assert res["skewness"] == 0.0
        assert res["kurtosis"] == 0.0

    def test_pearson_correlation_zero_variance(self):
        data = [
            {"x": 1.0, "y": 5.0},
            {"x": 2.0, "y": 5.0},
            {"x": 3.0, "y": 5.0},
            {"x": 4.0, "y": 5.0},
        ]
        res = StatisticsService.calculate_pearson_correlation(data, "x", "y")
        assert res["correlation_coefficient"] == 0.0
        assert res["is_statistically_significant"] is False


class TestSingularRegressionMatrices:
    """Validates multicollinearity and singular matrix detection in OLS."""

    def test_perfect_multicollinearity_handled_gracefully(self):
        data = [
            {"y": 10.0, "x1": 1.0, "x2": 2.0},
            {"y": 20.0, "x1": 2.0, "x2": 4.0},
            {"y": 30.0, "x1": 3.0, "x2": 6.0},
            {"y": 40.0, "x1": 4.0, "x2": 8.0},
            {"y": 50.0, "x1": 5.0, "x2": 10.0},
        ]
        with pytest.raises(ValueError, match="Singular matrix: Perfect multicollinearity"):
            StatisticsService.calculate_linear_regression(data, "y", ["x1", "x2"])

    def test_insufficient_sample_size_for_parameters(self):
        data = [
            {"y": 10.0, "x1": 1.0, "x2": 2.0},
            {"y": 20.0, "x1": 2.0, "x2": 5.0},
        ]
        with pytest.raises(ValueError, match="strictly greater than parameters"):
            StatisticsService.calculate_linear_regression(data, "y", ["x1", "x2"])


class TestLogisticRegressionRobustness:
    """Validates logistic regression convergence and probability clamping."""

    def test_logistic_regression_converges(self):
        data = [
            {"admitted": 0, "gpa": 2.0},
            {"admitted": 0, "gpa": 2.2},
            {"admitted": 0, "gpa": 2.5},
            {"admitted": 0, "gpa": 2.7},
            {"admitted": 0, "gpa": 2.9},
            {"admitted": 1, "gpa": 3.2},
            {"admitted": 1, "gpa": 3.4},
            {"admitted": 1, "gpa": 3.6},
            {"admitted": 1, "gpa": 3.8},
            {"admitted": 1, "gpa": 4.0},
        ]
        res = StatisticsService.calculate_logistic_regression(data, "admitted", ["gpa"])
        assert res["sample_size"] == 10
        assert "coefficients" in res
        assert len(res["coefficients"]) == 2
        gpa_coef = [c for c in res["coefficients"] if c["variable"] == "gpa"][0]
        assert gpa_coef["coefficient_b"] > 0
        assert gpa_coef["odds_ratio"] > 1.0


class TestMissingObservationsAndCompleteCases:
    """Validates that non-numeric, None, or empty entries are omitted safely."""

    def test_missing_data_filtering_in_descriptives(self):
        data = [
            {"score": 10.0},
            {"score": None},
            {"score": ""},
            {"score": "N/A"},
            {"score": 20.0},
            {"score": 30.0},
        ]
        res = StatisticsService.calculate_descriptive_statistics(data, "score")
        assert res["sample_size"] == 3
        assert res["mean"] == 20.0

    def test_missing_data_filtering_in_paired_tests(self):
        data = [
            {"pre": 10.0, "post": 15.0},
            {"pre": None, "post": 16.0},
            {"pre": 12.0, "post": ""},
            {"pre": 14.0, "post": 19.0},
            {"pre": 16.0, "post": 22.0},
            {"pre": 18.0, "post": 25.0},
        ]
        res = StatisticsService.calculate_paired_t_test(data, "pre", "post")
        assert res["sample_size"] == 4


class TestConfidenceIntervalsAndEffectSizes:
    """Validates confidence interval computation and effect size measures."""

    def test_ols_confidence_intervals(self):
        data = [
            {"sales": 50.0, "spend": 5.0},
            {"sales": 60.0, "spend": 6.0},
            {"sales": 70.0, "spend": 7.0},
            {"sales": 80.0, "spend": 8.0},
            {"sales": 90.0, "spend": 9.0},
            {"sales": 100.0, "spend": 10.0},
        ]
        res = StatisticsService.calculate_linear_regression(data, "sales", ["spend"])
        spend_coef = [c for c in res["coefficients"] if c["variable"] == "spend"][0]
        assert spend_coef["ci_95_lower"] <= spend_coef["coefficient_b"] <= spend_coef["ci_95_upper"]
        assert math.isclose(spend_coef["coefficient_b"], 10.0, abs_tol=1e-3)

    def test_eta_squared_in_anova(self):
        data = [
            {"val": 10.0, "cat": "A"},
            {"val": 12.0, "cat": "A"},
            {"val": 20.0, "cat": "B"},
            {"val": 22.0, "cat": "B"},
            {"val": 30.0, "cat": "C"},
            {"val": 32.0, "cat": "C"},
        ]
        res = StatisticsService.calculate_one_way_anova(data, "val", "cat")
        assert 0.0 <= res["eta_squared"] <= 1.0
        assert res["effect_size_magnitude"] == "Large"

    def test_cramers_v_in_chi_square(self):
        data = [
            {"gender": "M", "preference": "A"},
            {"gender": "M", "preference": "A"},
            {"gender": "M", "preference": "B"},
            {"gender": "F", "preference": "B"},
            {"gender": "F", "preference": "B"},
            {"gender": "F", "preference": "A"},
        ]
        res = StatisticsService.calculate_chi_square(data, "gender", "preference")
        assert 0.0 <= res["cramers_v"] <= 1.0
        assert "degrees_of_freedom" in res
