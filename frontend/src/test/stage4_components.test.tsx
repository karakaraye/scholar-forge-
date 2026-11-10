import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MethodologyWorkspace from '@/components/workspace/MethodologyWorkspace';
import InstrumentBuilder from '@/components/workspace/InstrumentBuilder';
import DatasetManager from '@/components/workspace/DatasetManager';
import AnalysisDashboard from '@/components/workspace/AnalysisDashboard';
import HypothesisPanel from '@/components/workspace/HypothesisPanel';
import QualitativeWorkspace from '@/components/workspace/QualitativeWorkspace';
import ChapterFourWorkspace from '@/components/workspace/ChapterFourWorkspace';
import { ResearchProject } from '@/types/project';

// Mock API calls
vi.mock('@/lib/api', () => ({
  methodologyApi: {
    recommend: vi.fn().mockResolvedValue({
      discipline: 'Management Science',
      recommendations: [
        {
          name: 'Cross-Sectional Survey Design',
          category: 'QUANTITATIVE',
          suitability_score: 95,
          rationale: 'Appropriate for examining organizational behavior variables.',
          assumptions: ['Linearity', 'Normal distribution of residuals'],
          limitations: ['Cannot definitively establish causal directionality'],
        },
      ],
    }),
    getProjectMethodology: vi.fn().mockResolvedValue({
      methodology: {
        id: 'meth-1',
        project: 'proj-1',
        primary_design_type: 'QUANTITATIVE_SURVEY',
        paradigm: 'POSITIVIST',
        sampling_strategy: 'Stratified Random Sampling',
        target_population: 'Branch managers and loan officers',
        sample_size_determination: 'Yamane (1967) formula',
        sample_size: 300,
        approved_by_researcher: true,
      },
    }),
    saveProjectMethodology: vi.fn().mockResolvedValue({
      id: 'meth-1',
      primary_design_type: 'QUANTITATIVE_SURVEY',
      approved_by_researcher: true,
    }),
    calculateSampling: vi.fn().mockResolvedValue({
      formula: 'YAMANE_1967',
      calculated_sample_size: 300,
      inflated_sample_size: 334,
      parameters_used: { population: 1200, margin_of_error: 0.05, nonresponse_rate: 0.1 },
      academic_justification: 'Calculated using Yamane (1967) formula for finite populations.',
    }),
    getVariables: vi.fn().mockResolvedValue([
      {
        id: 'var-1',
        name: 'Transformational Leadership',
        variable_type: 'INTERVAL',
        variable_role: 'INDEPENDENT',
        operational_definition: 'Measured via 5-point Likert scale.',
      },
    ]),
    createVariable: vi.fn().mockResolvedValue({
      id: 'var-2',
      name: 'Employee Retention',
      variable_type: 'INTERVAL',
      variable_role: 'DEPENDENT',
      operational_definition: 'Intent to stay within the organization.',
    }),
    deleteVariable: vi.fn().mockResolvedValue(undefined),
  },
  instrumentsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'inst-1',
        title: 'Leadership and Retention Questionnaire',
        instrument_type: 'QUESTIONNAIRE',
        description: 'Assesses leadership styles and retention intentions.',
        items: [
          {
            id: 'item-1',
            item_text: 'My supervisor inspires me with a compelling organizational vision.',
            construct_name: 'Transformational Leadership',
            item_type: 'LIKERT_5',
            is_reverse_coded: false,
          },
          {
            id: 'item-2',
            item_text: 'I frequently consider leaving this organization.',
            construct_name: 'Employee Retention',
            item_type: 'LIKERT_5',
            is_reverse_coded: true,
          },
        ],
      },
    ]),
    create: vi.fn().mockResolvedValue({
      id: 'inst-2',
      title: 'Interview Protocol',
      instrument_type: 'INTERVIEW_GUIDE',
      description: 'Semi-structured questions',
      items: [],
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    addItem: vi.fn().mockResolvedValue({
      id: 'item-3',
      item_text: 'I feel valued by leadership.',
      construct_name: 'Transformational Leadership',
      item_type: 'LIKERT_5',
      is_reverse_coded: false,
    }),
    removeItem: vi.fn().mockResolvedValue(undefined),
    generateItems: vi.fn().mockResolvedValue({
      generated_items: [{ id: 'item-4', item_text: 'Generated statement' }],
    }),
    validate: vi.fn().mockResolvedValue({
      flagged_items: [],
      passed: true,
    }),
    getDocxDownloadUrl: vi.fn((id: string) => `http://localhost:8000/api/v1/research/instruments/${id}/export-docx/`),
  },
  datasetsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'ds-1',
        name: 'Leadership_Survey_Data',
        file_format: 'CSV',
        row_count: 320,
        column_count: 8,
        current_version_number: 2,
        columns_schema: {
          columns: ['id', 'leadership_score', 'retention_score', 'dept', 'tenure'],
          has_formula_sanitized: true,
          profiles: {
            leadership_score: { type: 'FLOAT', missing_count: 0, missing_percentage: 0, mean: 4.12, min: 1.0, max: 5.0 },
            retention_score: { type: 'FLOAT', missing_count: 4, missing_percentage: 1.25, mean: 3.85, min: 1.0, max: 5.0 },
          },
        },
        versions: [
          {
            id: 'ver-2',
            version_number: 2,
            transformation_applied: 'Impute missing values via mean',
            created_at: '2026-11-04T12:00:00Z',
          },
          {
            id: 'ver-1',
            version_number: 1,
            transformation_applied: 'Initial Ingestion',
            created_at: '2026-11-04T10:00:00Z',
          },
        ],
      },
    ]),
    upload: vi.fn(),
    transform: vi.fn().mockResolvedValue({
      id: 'ds-1',
      name: 'Leadership_Survey_Data',
      current_version_number: 3,
      row_count: 320,
      column_count: 8,
      columns_schema: { columns: ['leadership_score', 'retention_score'] },
    }),
    rollback: vi.fn().mockResolvedValue({
      id: 'ds-1',
      name: 'Leadership_Survey_Data',
      current_version_number: 1,
    }),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  statisticsApi: {
    listResults: vi.fn().mockResolvedValue([
      {
        id: 'res-1',
        analysis_type: 'PEARSON_CORRELATION',
        label: 'Hypothesis 1: Leadership vs Retention',
        sample_size: 320,
        p_values: { p: 0.001 },
        metrics: { r: 0.58, p_value: 0.001, df: 318 },
        apa_format_string: 'r(318) = .58, p = .001, 95% CI [.49, .65]',
        apa_summary: 'There was a statistically significant moderate positive correlation between leadership and retention, r(318) = .58, p = .001.',
        apa_table_html: '<table class="apa-table"><tr><th>Variable</th><th>r</th><th>p</th></tr><tr><td>Retention</td><td>.58**</td><td>.001</td></tr></table>',
      },
    ]),
    runAnalysis: vi.fn().mockResolvedValue({
      id: 'res-2',
      analysis_type: 'MULTIPLE_REGRESSION',
      label: 'Predicting Retention',
      sample_size: 320,
      p_values: { p: 0.0001 },
      metrics: { r_squared: 0.42, f_statistic: 45.2, p_value: 0.0001 },
      apa_format_string: 'F(2, 317) = 45.20, p < .001, R² = .42',
      apa_summary: 'Multiple linear regression demonstrated that leadership significantly predicted retention, F(2, 317) = 45.20, p < .001.',
      apa_table_html: '<table class="apa-table"><tr><th>Model</th><th>R²</th><th>F</th></tr></table>',
    }),
    deleteResult: vi.fn().mockResolvedValue(undefined),
    listHypothesisTests: vi.fn().mockResolvedValue([
      {
        id: 'hypo-1',
        hypothesis_statement: 'There is a significant positive relationship between leadership and retention.',
        test_type: 'PEARSON_CORRELATION',
        decision: 'REJECT_NULL',
        test_statistic_value: 0.58,
        p_value: 0.001,
        effect_size_value: 0.58,
        apa_format_string: 'r(318) = .58, p = .001',
        substantive_interpretation: 'The empirical evidence supports the research hypothesis (Reject H₀). While the association is statistically significant, causal directionality cannot be inferred without experimental or longitudinal controls.',
      },
    ]),
    evaluateHypothesis: vi.fn().mockResolvedValue({
      id: 'hypo-2',
      hypothesis_statement: 'Autonomy significantly increases job commitment.',
      test_type: 'INDEPENDENT_T_TEST',
      decision: 'REJECT_NULL',
      test_statistic_value: 3.42,
      p_value: 0.002,
      apa_format_string: 't(318) = 3.42, p = .002, d = 0.45',
      substantive_interpretation: 'Hypothesis supported.',
    }),
  },
  qualitativeApi: {
    listTranscripts: vi.fn().mockResolvedValue([
      {
        id: 'trans-1',
        title: 'Interview Transcript P1',
        participant_identifier: 'Participant A',
        content: 'Leadership transparency makes me feel valued in this organization, even when workload escalates.',
        word_count: 14,
        transcript_type: 'INTERVIEW',
        excerpts: [
          {
            id: 'ex-1',
            code_name: 'Valued Contribution',
            quote_text: 'Leadership transparency makes me feel valued',
            start_char: 0,
            end_char: 44,
          },
        ],
      },
    ]),
    createTranscript: vi.fn().mockResolvedValue({
      id: 'trans-2',
      title: 'Interview P2',
      content: 'New content',
      word_count: 2,
    }),
    listCodes: vi.fn().mockResolvedValue([
      { id: 'code-1', name: 'Valued Contribution', excerpt_count: 1 },
      { id: 'code-2', name: 'Workload Escalation', excerpt_count: 0 },
    ]),
    createCode: vi.fn().mockResolvedValue({
      id: 'code-3',
      name: 'Autonomy in Practice',
      description: 'Self-directed agency',
    }),
    suggestCandidateCodes: vi.fn().mockResolvedValue({
      candidate_codes: [
        { name: 'Organizational Transparency', description: 'Communication openness' },
      ],
    }),
    tagExcerpt: vi.fn().mockResolvedValue({
      id: 'ex-2',
      code_name: 'Workload Escalation',
      quote_text: 'when workload escalates',
      start_char: 60,
      end_char: 83,
    }),
    listThemes: vi.fn().mockResolvedValue([
      {
        id: 'th-1',
        name: 'Relational Leadership Culture',
        narrative_summary: 'Participants emphasize interpersonal leadership clarity over rigid hierarchical supervision.',
      },
    ]),
    createTheme: vi.fn().mockResolvedValue({
      id: 'th-2',
      name: 'Structural Work Pressures',
    }),
  },
  interpretationApi: {
    interpret: vi.fn().mockImplementation((projectId, payload) => {
      if (payload.task_type === 'GENERATE_RESULTS_SECTION') {
        return Promise.resolve({
          success: true,
          data: {
            title: 'Chapter Four: Presentation and Analysis of Results',
            content: 'The empirical analysis investigated the relationship between transformational leadership and employee retention. A Pearson correlation test confirmed a significant positive relationship, r(318) = .58, p = .001. Multiple regression further indicated that leadership accounted for 42% of retention variance.',
          },
        });
      }
      return Promise.reject(new Error('ScholarForge AI Refusal: No statistical results found for this project. Cannot generate interpretation without empirical data.'));
    }),
  },
}));

const mockProject: ResearchProject = {
  id: 'proj-1',
  title: 'Impact of Transformational Leadership on Employee Retention',
  document_category: 'RESEARCH_PAPER',
  document_subtype: 'Master Thesis',
  academic_level: 'MASTERS',
  discipline: 'management-uuid',
  country: 'Nigeria',
  preferred_language: 'en',
  citation_style: 'APA',
  status: 'ACTIVE',
  documents: [
    {
      id: 'doc-1',
      title: 'Master Thesis Manuscript',
      document_type: 'MANUSCRIPT',
      current_version_number: 1,
      sections: [],
      created_at: '2026-11-04T00:00:00Z',
      updated_at: '2026-11-04T00:00:00Z',
    },
  ],
  created_at: '2026-11-04T00:00:00Z',
  updated_at: '2026-11-04T00:00:00Z',
};

describe('STAGE 4: Empirical Research & Analysis Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MethodologyWorkspace and handles sampling calculation', async () => {
    render(<MethodologyWorkspace project={mockProject} />);

    expect(screen.getByText(/Intelligent Research Methodology Engine/i)).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText(/Sampling Calculator/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Sampling Calculator/i));

    await waitFor(() => {
      expect(screen.getByText(/Sampling Formula & Parameters/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Calculate Sample Size/i })).toBeInTheDocument();
    });
  });

  it('renders InstrumentBuilder, displays items and reverse-coding badges', async () => {
    render(<InstrumentBuilder project={mockProject} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Leadership and Retention Questionnaire/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Reverse Coded/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Export Word \(\.docx\)/i)).toBeInTheDocument();
    });
  });

  it('renders DatasetManager, displays column profiling and formula sanitization indicator', async () => {
    render(<DatasetManager project={mockProject} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Leadership_Survey_Data/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Security Protection Applied/i)).toBeInTheDocument();
      expect(screen.getByText(/Attribute Types & Distribution Profile/i)).toBeInTheDocument();
      expect(screen.getAllByText(/leadership_score/i).length).toBeGreaterThan(0);
    });
  });

  it('renders AnalysisDashboard with publication APA tables and chart visualization', async () => {
    const handleInsert = vi.fn();
    render(<AnalysisDashboard project={mockProject} onInsertContent={handleInsert} />);

    await waitFor(() => {
      expect(screen.getByText(/Deterministic Statistical Analysis Engine/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Hypothesis 1: Leadership vs Retention/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/APA 7th Format/i)).toBeInTheDocument();
      expect(screen.getByText(/Insert Table into Manuscript/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Insert Table into Manuscript/i));
    expect(handleInsert).toHaveBeenCalled();
  });

  it('renders HypothesisPanel and substantive non-causal decision badges', async () => {
    render(<HypothesisPanel project={mockProject} />);

    await waitFor(() => {
      expect(screen.getByText(/Hypothesis Testing & Empirical Decisions/i)).toBeInTheDocument();
      expect(screen.getByText(/Supported \(Reject H₀\)/i)).toBeInTheDocument();
      expect(screen.getByText(/causal directionality cannot be inferred/i)).toBeInTheDocument();
    });
  });

  it('renders QualitativeWorkspace with verbatim excerpt verification and themes', async () => {
    render(<QualitativeWorkspace project={mockProject} />);

    await waitFor(() => {
      expect(screen.getByText(/Qualitative Research Analysis & Excerpts/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Interview Transcript P1/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Verified Verbatim/i)).toBeInTheDocument();
      expect(screen.getByText(/Relational Leadership Culture/i)).toBeInTheDocument();
    });
  });

  it('renders ChapterFourWorkspace and handles AI results generation & refusal banner', async () => {
    const handleInsert = vi.fn();
    render(<ChapterFourWorkspace project={mockProject} onInsertContent={handleInsert} />);

    expect(screen.getByText(/Chapter 4 & Results Interpretation Assistant/i)).toBeInTheDocument();
    const executeBtn = screen.getByRole('button', { name: /Execute Results Interpretation/i });
    expect(executeBtn).toBeInTheDocument();

    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chapter Four: Presentation and Analysis of Results/i)).toBeInTheDocument();
      expect(screen.getByText(/Insert into Manuscript Section/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Insert into Manuscript Section/i));
    expect(handleInsert).toHaveBeenCalled();
  });
});
