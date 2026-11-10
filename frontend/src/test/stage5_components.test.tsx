import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResearchWorkflowTimeline from '@/components/workflow/ResearchWorkflowTimeline';
import ResearchPlanningWorkspace from '@/components/workflow/ResearchPlanningWorkspace';
import ResearchAlignmentGrid from '@/components/workflow/ResearchAlignmentGrid';
import ManuscriptAssemblyViewer from '@/components/workflow/ManuscriptAssemblyViewer';
import QualityAssuranceDashboard from '@/components/workflow/QualityAssuranceDashboard';
import ReviewPreparationPanel from '@/components/workflow/ReviewPreparationPanel';

// Mock API clients for Stage 5
vi.mock('@/lib/api', () => ({
  workflowApi: {
    get: vi.fn().mockResolvedValue({
      id: 'wf-1',
      project: 'proj-1',
      overall_progress: 75,
      current_stage: 'MANUSCRIPT',
      stages: [
        {
          id: 'step-1',
          stage_key: 'SETUP',
          title: 'Research Setup & Paradigm Configuration',
          description: 'Establish project scope, disciplinary conventions, and institutional guidelines.',
          status: 'COMPLETED',
          progress_pct: 100,
          order_index: 1,
          is_required: true,
        },
        {
          id: 'step-2',
          stage_key: 'PLANNING',
          title: 'Structured Research Planning & Hypotheses',
          description: 'Define problem statement, aim, research objectives, and operational questions.',
          status: 'IN_PROGRESS',
          progress_pct: 50,
          order_index: 2,
          is_required: true,
        },
      ],
      created_at: '2026-11-04T12:00:00Z',
      updated_at: '2026-11-04T12:00:00Z',
    }),
    updateStep: vi.fn().mockImplementation((id, payload) =>
      Promise.resolve({
        id,
        stage_key: 'PLANNING',
        title: 'Structured Research Planning & Hypotheses',
        description: 'Updated step description.',
        status: payload.status || 'COMPLETED',
        progress_pct: payload.progress_pct || 100,
        order_index: 2,
        is_required: true,
      })
    ),
  },

  planningApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'dec-1',
        project: 'proj-1',
        decision_type: 'RESEARCH_OBJECTIVE',
        title: 'Objective 1: Mobile Money Adoption',
        statement: 'Quantify the elasticity of mobile money uptake with respect to foreign exchange volatility.',
        rationalization: 'Grounded in financial inclusion theory.',
        is_approved: false,
        order_index: 1,
        created_at: '2026-11-04T12:00:00Z',
      },
    ]),
    create: vi.fn().mockImplementation((projId, payload) =>
      Promise.resolve({
        id: 'dec-2',
        project: projId,
        decision_type: payload.decision_type || 'RESEARCH_AIM',
        title: payload.title,
        statement: payload.statement,
        rationalization: payload.rationalization || '',
        is_approved: false,
        order_index: 2,
        created_at: '2026-11-04T12:05:00Z',
      })
    ),
    approve: vi.fn().mockImplementation((id) =>
      Promise.resolve({
        id,
        project: 'proj-1',
        decision_type: 'RESEARCH_OBJECTIVE',
        title: 'Objective 1: Mobile Money Adoption',
        statement: 'Quantify the elasticity of mobile money uptake with respect to foreign exchange volatility.',
        rationalization: 'Grounded in financial inclusion theory.',
        is_approved: true,
        approved_by_name: 'Dr. Marcus Vance',
        approved_at: '2026-11-04T12:10:00Z',
        order_index: 1,
        created_at: '2026-11-04T12:00:00Z',
      })
    ),
  },

  alignmentApi: {
    get: vi.fn().mockResolvedValue({
      id: 'matrix-1',
      project: 'proj-1',
      alignment_score: 88,
      matrix_data: {},
      issues: [
        {
          id: 'iss-1',
          node_source: 'Hypotheses',
          node_target: 'Statistical Tests',
          severity: 'WARNING',
          description: 'Hypothesis H2 has no attached inferential statistical test.',
          recommendation: 'Configure an Independent Samples T-Test or Linear Regression in Chapter 4.',
          is_resolved: false,
          created_at: '2026-11-04T12:00:00Z',
        },
      ],
      unresolved_count: 1,
      created_at: '2026-11-04T12:00:00Z',
      updated_at: '2026-11-04T12:00:00Z',
    }),
  },

  assemblyApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'asm-1',
        project: 'proj-1',
        version_number: 1,
        citation_style: 'APA',
        options: {
          include_preliminary_pages: true,
          include_table_of_contents: true,
          include_references: true,
        },
        total_words: 45200,
        reference_count: 42,
        table_count: 8,
        figure_count: 4,
        status: 'COMPLETED',
        compiled_html: '<div class="manuscript"><h1>Chapter 1: Introduction</h1><p>Compiled content text.</p></div>',
        created_at: '2026-11-04T12:00:00Z',
      },
    ]),
    compile: vi.fn().mockResolvedValue({
      id: 'asm-2',
      project: 'proj-1',
      version_number: 2,
      citation_style: 'APA',
      options: {},
      total_words: 45500,
      reference_count: 43,
      table_count: 8,
      figure_count: 4,
      status: 'COMPLETED',
      compiled_html: '<div class="manuscript"><h1>Compiled Manuscript v2</h1></div>',
      created_at: '2026-11-04T12:30:00Z',
    }),
    getDetail: vi.fn().mockResolvedValue({}),
  },

  qaApi: {
    get: vi.fn().mockResolvedValue({
      id: 'val-1',
      project: 'proj-1',
      overall_score: 84,
      readiness_rating: 'SUBMISSION_READY',
      category_scores: {
        STRUCTURAL_QUALITY: 90,
        RESEARCH_CONSISTENCY: 85,
        CITATION_INTEGRITY: 95,
        EVIDENCE_VALIDITY: 80,
        WRITING_QUALITY: 85,
        MANUSCRIPT_COMPLETENESS: 70,
      },
      issues: [
        {
          id: 'qiss-1',
          category: 'WRITING_QUALITY',
          severity: 'WARNING',
          section_name: 'Chapter 1: Introduction',
          message: 'Unhedged absolute phrasing detected in problem description.',
          academic_suggestion: 'Use academic hedging e.g. "The empirical findings suggest that..."',
          created_at: '2026-11-04T12:00:00Z',
        },
      ],
      total_issues_count: 1,
      error_count: 0,
      warning_count: 1,
      info_count: 0,
      disclaimer: 'Academic Quality Assurance check for scholarly standards. ScholarForge AI provides formative evaluation and does not guarantee journal publication or institutional grading acceptance.',
      created_at: '2026-11-04T12:00:00Z',
    }),
    audit: vi.fn().mockResolvedValue({
      id: 'val-2',
      project: 'proj-1',
      overall_score: 88,
      readiness_rating: 'SUBMISSION_READY',
      category_scores: {
        STRUCTURAL_QUALITY: 95,
        RESEARCH_CONSISTENCY: 85,
        CITATION_INTEGRITY: 95,
        EVIDENCE_VALIDITY: 85,
        WRITING_QUALITY: 85,
        MANUSCRIPT_COMPLETENESS: 80,
      },
      issues: [],
      total_issues_count: 0,
      error_count: 0,
      warning_count: 0,
      info_count: 0,
      disclaimer: 'Formative academic check.',
      created_at: '2026-11-04T12:45:00Z',
    }),
  },

  reviewAssistantApi: {
    execute: vi.fn().mockImplementation((projId, payload) => {
      if (payload.task_type === 'SUGGEST_ABSTRACT') {
        return Promise.resolve({
          success: true,
          refusal: false,
          message: 'Structured abstract generated successfully from empirical evidence.',
          data: {
            abstract_structured: {
              background: 'Investigates digital financial inclusivity...',
              results: 'Significant positive relationship found.',
            },
          },
        });
      }
      return Promise.resolve({
        success: false,
        refusal: true,
        message: 'ScholarForge AI Refusal: Manuscript has insufficient written content (< 100 words).',
      });
    }),
  },

  reviewsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'rev-1',
        project: 'proj-1',
        reviewer_name: 'Prof. Vance',
        review_stage: 'READY_FOR_INTERNAL_REVIEW',
        feedback: 'Overall strong empirical grounding in Chapter 3 and 4.',
        checklist_results: { problem_justified: true, methodology_sound: true },
        is_approved: false,
        created_at: '2026-11-04T12:00:00Z',
        updated_at: '2026-11-04T12:00:00Z',
      },
    ]),
    create: vi.fn().mockImplementation((projId, payload) =>
      Promise.resolve({
        id: 'rev-2',
        project: projId,
        reviewer_name: payload.reviewer_name,
        review_stage: payload.review_stage,
        feedback: payload.feedback,
        checklist_results: payload.checklist_results || {},
        is_approved: payload.is_approved || false,
        created_at: '2026-11-04T12:50:00Z',
        updated_at: '2026-11-04T12:50:00Z',
      })
    ),
  },
}));

describe('Stage 5 Research Workflow, Assembly & QA Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ResearchWorkflowTimeline and updates step status', async () => {
    render(<ResearchWorkflowTimeline projectId="proj-1" />);

    expect(screen.getByText(/Loading Research Lifecycle Engine/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Adaptive Academic Research Lifecycle/i)).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText(/Research Setup & Paradigm Configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/Structured Research Planning & Hypotheses/i)).toBeInTheDocument();
    });

    // Mark step complete
    const completeBtns = screen.getAllByRole('button', { name: /Complete/i });
    fireEvent.click(completeBtns[1]);

    await waitFor(() => {
      expect(screen.getByText(/Adaptive Academic Research Lifecycle/i)).toBeInTheDocument();
    });
  });

  it('renders ResearchPlanningWorkspace and handles decision creation and approval', async () => {
    render(<ResearchPlanningWorkspace projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Structured Research Planning & Governance Gate/i)).toBeInTheDocument();
      expect(screen.getByText(/Objective 1: Mobile Money Adoption/i)).toBeInTheDocument();
      expect(screen.getByText(/Pending Approval Gate/i)).toBeInTheDocument();
    });

    // Approve the decision
    const approveBtn = screen.getByRole('button', { name: /Approve Decision/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    });
  });

  it('renders ResearchAlignmentGrid with 13-node chain and issues', async () => {
    render(<ResearchAlignmentGrid projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText(/13-Node Research Alignment Matrix/i)).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
      expect(screen.getAllByText(/Node 1/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Problem Statement/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Conclusions/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Hypothesis H2 has no attached inferential statistical test/i)).toBeInTheDocument();
    });
  });

  it('renders ManuscriptAssemblyViewer and compiles full document', async () => {
    render(<ManuscriptAssemblyViewer projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText(/End-to-End Manuscript Assembly Engine/i)).toBeInTheDocument();
      expect(screen.getByText('45,200')).toBeInTheDocument();
      expect(screen.getByText(/Chapter 1: Introduction/i)).toBeInTheDocument();
    });

    const compileBtn = screen.getByRole('button', { name: /Compile Full Manuscript/i });
    fireEvent.click(compileBtn);

    await waitFor(() => {
      expect(screen.getByText(/Compiled Manuscript v2/i)).toBeInTheDocument();
    });
  });

  it('renders QualityAssuranceDashboard with 6 categories and mandatory disclaimer', async () => {
    render(<QualityAssuranceDashboard projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Academic Quality Assurance & Readiness Index/i)).toBeInTheDocument();
      expect(screen.getByText('84%')).toBeInTheDocument();
      expect(screen.getByText(/Submission Ready/i)).toBeInTheDocument();
      expect(screen.getByText('Structural Quality')).toBeInTheDocument();
      expect(screen.getByText('Citation Integrity')).toBeInTheDocument();
      expect(screen.getByText('Evidence Validity')).toBeInTheDocument();
      expect(screen.getAllByText(/Writing Quality/i).length).toBeGreaterThan(0);
      expect(screen.getByText('Manuscript Completeness')).toBeInTheDocument();
      // Prominent non-guarantee disclaimer
      expect(screen.getByText(/ScholarForge AI provides formative evaluation and does not guarantee journal publication/i)).toBeInTheDocument();
    });
  });

  it('renders ReviewPreparationPanel with AI review execution and defense checklist', async () => {
    render(<ReviewPreparationPanel projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText(/AI Academic Review Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/Pre-Defense Readiness Checklist/i)).toBeInTheDocument();
      expect(screen.getByText(/Record Reviewer Feedback & Approval/i)).toBeInTheDocument();
      expect(screen.getByText(/Prof. Vance/i)).toBeInTheDocument();
    });

    // Execute AI abstract review
    const aiReviewBtn = screen.getByRole('button', { name: /Execute AI Academic Review/i });
    fireEvent.click(aiReviewBtn);

    await waitFor(() => {
      expect(screen.getByText(/AI Academic Review Completed/i)).toBeInTheDocument();
      expect(screen.getByText(/Structured abstract generated successfully from empirical evidence/i)).toBeInTheDocument();
    });
  });
});
