"""
Stage 4 Test Suite for ScholarForge AI:
Comprehensive regression & unit tests for Research Methodology, Sampling, Instrument Design,
Dataset Cleaning, Deterministic Statistical Analysis, Hypothesis Testing, Qualitative Research,
and AI Results Interpretation.
"""

import io
import json
import zipfile
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from workspaces.models import Workspace, WorkspaceMembership, WorkspaceRole
from disciplines.models import AcademicDiscipline
from projects.models import ResearchProject, ResearchRequirements
from research.models import (
    ResearchMethodology,
    ResearchVariable,
    SamplingPlan,
    ResearchInstrument,
    InstrumentItem,
    ResearchDataset,
    DatasetVersion,
    DataTransformation,
    StatisticalResult,
    HypothesisTest,
    QualitativeTranscript,
    QualitativeCode,
    EvidenceExcerpt,
    QualitativeTheme
)
from research.methodology_service import MethodologyService
from research.instrument_service import InstrumentService
from research.dataset_service import DatasetService
from research.statistics_service import StatisticsService
from research.qualitative_service import QualitativeService
from research.hypothesis_service import HypothesisService
from research.interpretation_service import InterpretationService
from research.consistency_engine import analyze_academic_consistency

User = get_user_model()


@pytest.fixture
def auth_setup(db):
    user = User.objects.create_user(
        email="stage4_researcher@scholarforge.ai",
        password="ValidPassword123!",
        first_name="Elena",
        last_name="Rostova"
    )
    workspace = Workspace.objects.create(name="Stage 4 Lab", slug="stage4-lab-unique", owner=user)
    WorkspaceMembership.objects.create(workspace=workspace, user=user, role=WorkspaceRole.OWNER)
    discipline = AcademicDiscipline.objects.create(name="Management Studies", slug="management-studies-s4", category="Business")

    project = ResearchProject.objects.create(
        workspace=workspace,
        owner=user,
        title="Impact of Agile Practices on Knowledge Sharing and Team Velocity",
        discipline=discipline,
        document_category="ACADEMIC_PROJECT",
        document_subtype="Undergraduate Project",
        academic_level="UNDERGRADUATE",
        status="ACTIVE"
    )
    ResearchRequirements.objects.create(
        project=project,
        research_methodology="Quantitative Survey Design",
        research_objectives="1. Examine relationship between agile practices and team velocity.\n2. Evaluate knowledge sharing mediation.",
        custom_parameters={
            "research_questions": "1. How do agile practices affect velocity?\n2. What is the role of knowledge sharing?",
            "research_hypotheses": "H1: Agile practices significantly enhance team velocity."
        }
    )

    client = APIClient()
    client.force_authenticate(user=user)
    return {
        "user": user,
        "workspace": workspace,
        "discipline": discipline,
        "project": project,
        "client": client
    }


# ==============================================================================
# 1. METHODOLOGY & SAMPLING TESTS
# ==============================================================================

def test_methodology_recommendation_quantitative():
    recs = MethodologyService.recommend_methodology(
        discipline_name="Business & Economics",
        document_category="DISSERTATION",
        objectives_text="To investigate the statistical effect of leadership style on employee retention.",
        hypotheses_text="H1: Transformational leadership positively impacts retention."
    )
    assert len(recs) >= 2
    top = recs[0]
    assert top["approach"] in ("QUANTITATIVE", "MIXED_METHODS")
    assert "assumptions" in top
    assert "limitations" in top


def test_sampling_yamane_formula():
    # Yamane formula: n = N / (1 + N * e^2)
    # N = 1000, e = 0.05 => 1000 / (1 + 1000 * 0.0025) = 1000 / 3.5 = 285.71 -> 286
    res = MethodologyService.calculate_yamane(population_size=1000, margin_of_error=0.05, nonresponse_rate=0.0)
    assert res["calculated_sample_size"] == 286
    assert res["parameters"]["population_size"] == 1000

    # With 10% nonresponse inflation: 286 / 0.90 = 317.77 -> 318
    res_inflated = MethodologyService.calculate_yamane(population_size=1000, margin_of_error=0.05, nonresponse_rate=0.10)
    assert res_inflated["adjusted_sample_size"] == 318


def test_sampling_cochran_formula():
    # Infinite population Cochran: n0 = (Z^2 * p * q) / e^2
    # Z = 1.96, p = 0.5, e = 0.05 => (3.8416 * 0.25) / 0.0025 = 384.16 -> 385
    res = MethodologyService.calculate_cochran(population_size=None, margin_of_error=0.05, confidence_level=0.95, estimated_proportion=0.5)
    assert res["initial_sample_size"] == 385
    assert res["calculated_sample_size"] == 385


def test_sampling_krejcie_morgan_formula():
    # For N = 1000, standard Krejcie & Morgan sample size is 278
    res = MethodologyService.calculate_krejcie_morgan(population_size=1000, margin_of_error=0.05, nonresponse_rate=0.0)
    assert 270 <= res["calculated_sample_size"] <= 285


def test_qualitative_sampling_guidance():
    guide = MethodologyService.get_qualitative_sampling_guidance("GROUNDED_THEORY_THEORETICAL")
    assert "scientific_warning" in guide
    assert "saturation" in guide["saturation_criterion"].lower()


# ==============================================================================
# 2. RESEARCH INSTRUMENT & DOCX EXPORT TESTS
# ==============================================================================

def test_instrument_draft_items_and_validation():
    items = InstrumentService.generate_draft_items_for_variable("Team Autonomy", "INDEPENDENT", "INTERVAL")
    assert len(items) >= 3
    # Check that reverse coding item exists
    rev_items = [i for i in items if i["is_reverse_coded"]]
    assert len(rev_items) >= 1

    # Validation
    val_res = InstrumentService.validate_instrument(items, expected_variables=["Team Autonomy"])
    assert val_res["is_valid"] is True
    assert "Team Autonomy" in val_res["constructs_covered"]
    assert val_res["has_reverse_coded_items"] is True


def test_instrument_docx_export():
    docx_bytes = InstrumentService.export_instrument_docx(
        title="Agile Team Performance Survey",
        project_title="Impact of Agile Practices on Knowledge Sharing",
        researcher_name="Dr. Jane Doe",
        instructions="Please answer all questions honestly.",
        demographic_items=InstrumentService.DEMOGRAPHIC_DEFAULTS,
        construct_sections={
            "Agile Practices": [
                {"text": "Our team holds daily standup meetings consistently.", "is_reverse_coded": False},
                {"text": "Sprint planning meetings are rarely held or poorly organized.", "is_reverse_coded": True}
            ]
        }
    )
    assert len(docx_bytes) > 500
    # Verify that it is a genuine ZIP / OpenXML archive
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
        namelist = z.namelist()
        assert "word/document.xml" in namelist
        assert "[Content_Types].xml" in namelist
        doc_xml = z.read("word/document.xml").decode("utf-8")
        assert "Agile Team Performance Survey" in doc_xml
        assert "Our team holds daily standup meetings" in doc_xml


# ==============================================================================
# 3. DATASET SANITIZATION, PROFILING & CLEANING TESTS
# ==============================================================================

def test_csv_upload_and_formula_sanitization():
    # CSV containing potentially dangerous formula injection triggers: =cmd, +123, -SUM, @alert
    csv_content = (
        "id,user_name,score,formula_attack\n"
        "1,Alice,85,=SUM(A1:B1)\n"
        "2,Bob,90,+cmd|' /C calc'!A0\n"
        "3,Charlie,75,@HYPERLINK('http://evil.com')\n"
        "4,David,80,Normal text\n"
    ).encode("utf-8")

    parsed = DatasetService._parse_csv_bytes(csv_content)
    assert parsed["row_count"] == 4
    assert parsed["column_count"] == 4
    assert parsed["sanitized_count"] == 3

    # Check that dangerous triggers were sanitized with leading quote
    rows = parsed["rows"]
    assert rows[0]["formula_attack"].startswith("'=")
    assert rows[1]["formula_attack"].startswith("'+")
    assert rows[2]["formula_attack"].startswith("'@")
    assert rows[3]["formula_attack"] == "Normal text"


def test_dataset_profiling_and_cleaning():
    rows = [
        {"id": "1", "score": "10", "gender": "Female", "item1": "4"},
        {"id": "2", "score": "20", "gender": "Male", "item1": "5"},
        {"id": "3", "score": "", "gender": "Female", "item1": "1"},  # missing score
        {"id": "4", "score": "30", "gender": "Female", "item1": "2"},
        {"id": "4", "score": "30", "gender": "Female", "item1": "2"}   # duplicate row
    ]
    cols = ["id", "score", "gender", "item1"]
    profile = DatasetService.profile_dataset(cols, rows)

    assert profile["total_rows"] == 5
    assert profile["duplicate_rows_count"] == 1
    assert profile["columns"]["score"]["missing_count"] == 1

    # Impute missing score with MEAN (10 + 20 + 30 + 30) / 4 = 22.5
    imputed_rows, count_imp = DatasetService.apply_imputation(rows, "score", strategy="MEAN")
    assert count_imp == 1
    assert imputed_rows[2]["score"] == 22.5

    # Drop duplicates
    dedup_rows, dropped = DatasetService.drop_duplicates(imputed_rows)
    assert dropped == 1
    assert len(dedup_rows) == 4

    # Reverse code 5-point Likert item1 (1 -> 5, 2 -> 4, 4 -> 2, 5 -> 1)
    rev_rows = DatasetService.reverse_code_item(dedup_rows, "item1", min_val=1, max_val=5, new_col_name="item1_rev")
    assert rev_rows[0]["item1_rev"] == 2.0  # 4 -> 2
    assert rev_rows[1]["item1_rev"] == 1.0  # 5 -> 1
    assert rev_rows[2]["item1_rev"] == 5.0  # 1 -> 5


# ==============================================================================
# 4. DETERMINISTIC STATISTICAL ANALYSIS ENGINE TESTS
# ==============================================================================

def test_descriptive_statistics():
    rows = [{"val": x} for x in [10, 12, 14, 16, 18, 20, 22, 24, 26, 28]]
    stats = StatisticsService.calculate_descriptive_statistics(rows, "val")
    assert stats["sample_size"] == 10
    assert stats["mean"] == 19.0
    assert stats["median"] == 19.0
    assert stats["minimum"] == 10.0
    assert stats["maximum"] == 28.0
    assert 5.5 <= stats["standard_deviation"] <= 6.5


def test_cronbach_alpha():
    # Highly correlated items
    rows = [
        {"q1": 5, "q2": 5, "q3": 4, "q4": 5},
        {"q1": 4, "q2": 4, "q3": 5, "q4": 4},
        {"q1": 1, "q2": 2, "q3": 1, "q4": 1},
        {"q1": 2, "q2": 1, "q3": 2, "q4": 2},
        {"q1": 5, "q2": 4, "q3": 5, "q4": 5},
        {"q1": 3, "q2": 3, "q3": 3, "q4": 3},
    ]
    alpha_res = StatisticsService.calculate_cronbach_alpha(rows, ["q1", "q2", "q3", "q4"])
    assert alpha_res["cronbach_alpha"] >= 0.85
    assert alpha_res["is_acceptable"] is True
    assert alpha_res["benchmark_interpretation"] in ("Good", "Excellent")


def test_pearson_correlation():
    # Strong positive linear relationship: y = 2x + 1
    rows = [{"x": i, "y": 2 * i + 1} for i in range(1, 15)]
    corr = StatisticsService.calculate_pearson_correlation(rows, "x", "y")
    assert round(corr["correlation_coefficient"], 3) == 1.000
    assert corr["is_statistically_significant"] is True
    assert corr["strength"] == "Large / Strong"


def test_independent_t_test():
    # Two distinct groups
    g1 = [{"group": "A", "score": s} for s in [10, 12, 11, 13, 12, 14]]
    g2 = [{"group": "B", "score": s} for s in [20, 22, 21, 23, 22, 24]]
    rows = g1 + g2
    res = StatisticsService.calculate_independent_t_test(rows, dv_col="score", group_col="group")

    assert res["group_1"]["mean"] == 12.0
    assert res["group_2"]["mean"] == 22.0
    assert res["mean_difference"] == -10.0
    assert res["student_t"]["is_significant"] is True
    assert res["student_t"]["p_value"] < 0.001
    assert abs(res["cohens_d"]) > 1.5  # Large effect size


def test_one_way_anova():
    g1 = [{"group": "Low", "perf": s} for s in [10, 12, 11]]
    g2 = [{"group": "Med", "perf": s} for s in [20, 22, 21]]
    g3 = [{"group": "High", "perf": s} for s in [30, 32, 31]]
    rows = g1 + g2 + g3
    anova = StatisticsService.calculate_one_way_anova(rows, dv_col="perf", group_col="group")
    assert anova["number_of_groups"] == 3
    assert anova["anova_table"]["f_statistic"] > 50.0
    assert anova["is_statistically_significant"] is True
    assert anova["eta_squared"] > 0.80


def test_linear_regression():
    # y = 3 + 2*x1 + 4*x2
    rows = []
    for i in range(1, 25):
        x1 = float(i)
        x2 = float(i % 5)
        y = 3.0 + 2.0 * x1 + 4.0 * x2
        rows.append({"x1": x1, "x2": x2, "y": y})

    reg = StatisticsService.calculate_linear_regression(rows, dv_col="y", iv_cols=["x1", "x2"])
    assert reg["r_squared"] > 0.99
    assert reg["is_model_significant"] is True
    coefs = {c["variable"]: c["coefficient_b"] for c in reg["coefficients"]}
    assert abs(coefs["(Intercept)"] - 3.0) < 0.1
    assert abs(coefs["x1"] - 2.0) < 0.1
    assert abs(coefs["x2"] - 4.0) < 0.1


# ==============================================================================
# 5. HYPOTHESIS TESTING ASSISTANT TESTS
# ==============================================================================

def test_hypothesis_evaluation_decision_rules():
    # Test significant correlation
    sig_result = {
        "correlation_coefficient": 0.65,
        "degrees_of_freedom": 58,
        "p_value": 0.0001,
        "r_squared": 0.4225
    }
    eval_sig = HypothesisService.evaluate_hypothesis(
        hypothesis_statement="Agile methods positively influence team velocity.",
        hypothesis_type="DIRECTIONAL",
        test_type="PEARSON_CORRELATION",
        statistical_result_data=sig_result
    )
    assert eval_sig["decision"] == "REJECT_NULL"
    assert eval_sig["is_supported"] is True
    assert "r(58) = 0.650, p = 0.0001" in eval_sig["apa_reporting_format"]

    # Test non-significant result
    nonsig_result = {
        "correlation_coefficient": 0.08,
        "degrees_of_freedom": 58,
        "p_value": 0.54,
        "r_squared": 0.0064
    }
    eval_nonsig = HypothesisService.evaluate_hypothesis(
        hypothesis_statement="Team age diversity positively impacts velocity.",
        hypothesis_type="DIRECTIONAL",
        test_type="PEARSON_CORRELATION",
        statistical_result_data=nonsig_result
    )
    assert eval_nonsig["decision"] == "FAIL_TO_REJECT_NULL"
    assert eval_nonsig["is_supported"] is False


# ==============================================================================
# 6. QUALITATIVE DATA ANALYSIS TESTS
# ==============================================================================

def test_qualitative_verbatim_linking_and_anti_hallucination():
    transcript_text = (
        "Interviewer: How do standup meetings impact your productivity?\n"
        "Participant A: The daily standups keep our priorities crystal clear, but when they drag past 15 minutes, "
        "energy plummets and frustration builds among junior engineers."
    )
    quote = "The daily standups keep our priorities crystal clear"
    start_char = transcript_text.find(quote)
    end_char = start_char + len(quote)

    # Valid excerpt verification
    res = QualitativeService.verify_and_create_excerpt(transcript_text, start_char, end_char, quote)
    assert res["is_verified"] is True
    assert res["quote_text"] == quote

    # Hallucinated or mismatched quotation must fail
    with pytest.raises(ValueError):
        QualitativeService.verify_and_create_excerpt(
            transcript_text, start_char, end_char, "This is a fabricated sentence not in the text."
        )


def test_qualitative_candidate_code_suggestions():
    text = (
        "Leadership communication was sporadic during the agile transition. "
        "Communication gaps created substantial friction between software architects and sprint teams. "
        "Better communication channels are essential."
    )
    suggestions = QualitativeService.suggest_candidate_codes(text, "Management Studies")
    assert len(suggestions) > 0
    top_code = suggestions[0]
    assert top_code["status"] == "CANDIDATE"
    assert top_code["requires_researcher_approval"] is True


# ==============================================================================
# 7. AI RESULTS INTERPRETATION & ZERO-HALLUCINATION GUARD
# ==============================================================================

def test_ai_interpretation_zero_hallucination_refusal():
    # Attempting to interpret results when no statistical results exist must strictly REFUSE
    result = InterpretationService.execute_interpretation_task(
        task_type="INTERPRET_DESCRIPTIVE_RESULTS",
        project_context={"title": "Test Project"},
        statistical_results=[]
    )
    assert result["refusal"] is True
    assert result["success"] is False
    assert "no computed statistical analysis found" in result["message"]


def test_ai_interpretation_grounded_output():
    # Grounded interpretation with actual statistical results
    stat_results = [
        {
            "test_name": "Pearson Correlation Velocity",
            "output_data": {
                "variable_1": "Agile Maturity",
                "variable_2": "Team Velocity",
                "sample_size": 120,
                "correlation_coefficient": 0.584,
                "p_value": 0.0001,
                "r_squared": 0.341,
                "is_statistically_significant": True,
                "strength": "Large / Strong",
                "direction": "Positive",
                "confidence_interval_95": {"lower": 0.44, "upper": 0.70}
            }
        }
    ]
    interp = InterpretationService.execute_interpretation_task(
        task_type="INTERPRET_CORRELATION_RESULTS",
        project_context={"title": "Agile Velocity Study"},
        statistical_results=stat_results
    )
    assert interp["success"] is True
    assert interp["refusal"] is False
    content = interp["data"]["content"]
    assert "r = 0.584" in content
    assert "Agile Maturity" in content
    assert "causality cannot be inferred" in content


# ==============================================================================
# 8. REST API INTEGRATION ENDPOINT TESTS
# ==============================================================================

def test_api_sampling_calculator_endpoint(auth_setup):
    client = auth_setup["client"]
    url = reverse("sampling-calculate")
    payload = {
        "formula": "YAMANE",
        "population_size": 1200,
        "margin_of_error": 0.05,
        "nonresponse_inflation_rate": 0.10
    }
    resp = client.post(url, payload, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert "calculated_sample_size" in resp.data
    assert "inflated_sample_size" in resp.data


def test_api_instrument_lifecycle(auth_setup):
    client = auth_setup["client"]
    project = auth_setup["project"]

    # 1. Create Instrument
    inst_url = reverse("project-instruments", kwargs={"project_id": str(project.id)})
    inst_resp = client.post(inst_url, {
        "title": "Agile Team Dynamics Survey",
        "instrument_type": "QUESTIONNAIRE",
        "instructions": "Rate items from 1 to 5."
    }, format="json")
    assert inst_resp.status_code == status.HTTP_201_CREATED
    inst_id = inst_resp.data["id"]

    # 2. Add variable and generate items
    var_url = reverse("project-variables", kwargs={"project_id": str(project.id)})
    client.post(var_url, {
        "name": "Knowledge Sharing",
        "variable_role": "INDEPENDENT",
        "variable_type": "INTERVAL"
    }, format="json")

    gen_url = reverse("instrument-generate-items", kwargs={"pk": inst_id})
    gen_resp = client.post(gen_url, {}, format="json")
    assert gen_resp.status_code == status.HTTP_201_CREATED
    assert len(gen_resp.data["items"]) >= 3

    # 3. Export DOCX
    docx_url = reverse("instrument-export-docx", kwargs={"pk": inst_id})
    docx_resp = client.get(docx_url)
    assert docx_resp.status_code == status.HTTP_200_OK
    assert docx_resp["Content-Type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert len(docx_resp.content) > 500


def test_api_dataset_upload_analysis_and_interpretation_flow(auth_setup):
    client = auth_setup["client"]
    project = auth_setup["project"]

    # 1. Upload CSV dataset
    csv_bytes = (
        "respondent_id,agile_score,velocity\n"
        "1,4.5,88\n"
        "2,4.0,82\n"
        "3,3.5,70\n"
        "4,5.0,95\n"
        "5,2.5,60\n"
        "6,3.0,65\n"
    ).encode("utf-8")
    uploaded = SimpleUploadedFile("teams_data.csv", csv_bytes, content_type="text/csv")

    upload_url = reverse("project-datasets", kwargs={"project_id": str(project.id)})
    upload_resp = client.post(upload_url, {"file": uploaded, "name": "Sprint Velocity Dataset"}, format="multipart")
    assert upload_resp.status_code == status.HTTP_201_CREATED
    dataset_id = upload_resp.data["id"]

    # 2. Run Pearson Correlation Analysis
    run_url = reverse("project-run-analysis", kwargs={"project_id": str(project.id)})
    run_resp = client.post(run_url, {
        "dataset_id": dataset_id,
        "test_type": "PEARSON_CORRELATION",
        "parameters": {"variable_1": "agile_score", "variable_2": "velocity"},
        "label": "Agile vs Velocity Correlation"
    }, format="json")
    assert run_resp.status_code == status.HTTP_201_CREATED
    stat_res_id = run_resp.data["id"]
    assert run_resp.data["output_data"]["correlation_coefficient"] > 0.90

    # 3. Evaluate Hypothesis against computed result
    hyp_url = reverse("project-evaluate-hypothesis", kwargs={"project_id": str(project.id)})
    hyp_resp = client.post(hyp_url, {
        "hypothesis_statement": "Agile practices significantly increase velocity.",
        "hypothesis_type": "DIRECTIONAL",
        "statistical_result_id": stat_res_id
    }, format="json")
    assert hyp_resp.status_code == status.HTTP_201_CREATED
    assert hyp_resp.data["decision"] == "REJECT_NULL"

    # 4. Request AI Results Interpretation
    interp_url = reverse("project-interpret-results", kwargs={"project_id": str(project.id)})
    interp_resp = client.post(interp_url, {
        "task_type": "INTERPRET_CORRELATION_RESULTS"
    }, format="json")
    assert interp_resp.status_code == status.HTTP_200_OK
    assert interp_resp.data["success"] is True
    assert "agile_score" in interp_resp.data["data"]["content"]
