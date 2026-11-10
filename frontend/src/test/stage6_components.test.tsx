import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CollaboratorsManager } from '@/components/collaboration/CollaboratorsManager';
import { InlineCommentsPanel } from '@/components/collaboration/InlineCommentsPanel';
import { SupervisorFeedbackWorkspace } from '@/components/collaboration/SupervisorFeedbackWorkspace';
import { CorrectionTracker } from '@/components/collaboration/CorrectionTracker';
import { VersionDiffViewer } from '@/components/collaboration/VersionDiffViewer';
import { JournalReviewMatrix } from '@/components/collaboration/JournalReviewMatrix';
import { SupervisorDashboardView } from '@/components/collaboration/SupervisorDashboardView';

// Mock Stage 6 APIs
vi.mock('@/lib/api', () => ({
  collaborationApi: {
    list: vi.fn().mockResolvedValue({
      collaborators: [],
      pending_invitations: [],
      current_user_role: 'PROJECT_OWNER',
    }),
    getCollaborators: vi.fn().mockResolvedValue([]),
    getInvitations: vi.fn().mockResolvedValue([]),
    invite: vi.fn().mockImplementation((projectId, payload) =>
      Promise.resolve({
        id: 'inv-new',
        project: projectId,
        invitee_email: payload.email,
        role: payload.role,
        assigned_sections: payload.assigned_sections || [],
        status: 'PENDING',
        expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        created_at: new Date().toISOString(),
      })
    ),
    revokeInvitation: vi.fn().mockResolvedValue({ success: true }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    updateRole: vi.fn().mockResolvedValue({ success: true }),
  },
  commentsApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'c-1' }),
    reply: vi.fn().mockImplementation((id, text) =>
      Promise.resolve({
        id: 'reply-1',
        comment: id,
        author_name: 'Dr. Supervisor',
        content: text,
        created_at: new Date().toISOString(),
      })
    ),
    updateStatus: vi.fn().mockImplementation((id, status) =>
      Promise.resolve({ id, status })
    ),
  },
  supervisorFeedbackApi: {
    list: vi.fn().mockResolvedValue([]),
    ingest: vi.fn().mockImplementation((projectId, payload) =>
      Promise.resolve({
        id: 'fb-new',
        project: projectId,
        source_type: payload.source_type,
        raw_content: payload.raw_content,
        title: payload.title,
        created_at: new Date().toISOString(),
      })
    ),
    analyze: vi.fn().mockResolvedValue({
      tasks_count: 2,
      conflicts_count: 0,
      missing_evidence_count: 1,
      tasks: [
        { id: 't-1', title: 'Task 1' },
        { id: 't-2', title: 'Task 2' },
      ],
      conflicts: [],
    }),
  },
  correctionTasksApi: {
    list: vi.fn().mockResolvedValue([]),
    apply: vi.fn().mockResolvedValue({
      task_id: 'task-1',
      status: 'PROPOSED',
      applied_version_number: 2,
    }),
    review: vi.fn().mockImplementation((id, payload) =>
      Promise.resolve({
        task_id: id,
        status: payload.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        review_notes: payload.review_notes || '',
      })
    ),
  },
  documentDiffApi: {
    getDiff: vi.fn().mockResolvedValue({
      document_id: 'doc-1',
      base_version: 1,
      target_version: 2,
      base_word_count: 100,
      target_word_count: 120,
      net_word_change: 20,
      word_diff: {
        added_words_count: 2,
        deleted_words_count: 1,
        net_word_change: 20,
        chunks: [
          { type: 'equal', text: 'This is the initial' },
          { type: 'deleted', text: 'draft' },
          { type: 'added', text: 'scholarly revision' },
        ],
      },
      paragraph_diff: [],
    }),
    restore: vi.fn().mockResolvedValue({
      document_id: 'doc-1',
      restored_from_version: 1,
      new_version_number: 3,
      message: 'Restored successfully',
    }),
  },
  journalReviewApi: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation((projectId, payload) =>
      Promise.resolve({
        id: 'rev-1',
        project: projectId,
        reviewer_label: payload.reviewer_label,
        comment_number: payload.comment_number,
        original_comment: payload.original_comment,
        revision_category: payload.revision_category,
        author_response: payload.author_response || '',
        is_verified_applied: false,
        created_at: new Date().toISOString(),
      })
    ),
    update: vi.fn().mockImplementation((id, payload) =>
      Promise.resolve({
        id,
        ...payload,
      })
    ),
    getMatrixDocument: vi.fn().mockResolvedValue({
      project_id: 'proj-1',
      formatted_markdown: '# Response Matrix\n\n### Reviewer 1: Comment 1\nPoint-by-Point Response to Reviewers',
      point_count: 1,
      applied_count: 1,
    }),
  },
  supervisorApi: {
    getProjects: vi.fn().mockResolvedValue([
      {
        project_id: 'proj-1',
        title: 'Empirical Study on Financial Inclusion',
        student_name: 'Amina Bello',
        student_email: 'amina@example.com',
        discipline: 'Development Economics',
        category: 'DISSERTATION',
        role: 'SUPERVISOR',
        open_comments_count: 3,
        pending_tasks_count: 2,
        updated_at: '2026-11-04T12:00:00Z',
      },
    ]),
  },
}));

describe('Stage 6: Academic Collaboration & Supervisor Review Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CollaboratorsManager', () => {
    it('renders collaborators and pending invitations table', () => {
      render(
        <CollaboratorsManager
          projectId="proj-1"
          initialCollaborators={[
            {
              id: 'collab-1',
              project: 'proj-1',
              user: 'user-1',
              user_email: 'supervisor@example.com',
              user_name: 'Dr. Jane Smith',
              role: 'SUPERVISOR',
              assigned_sections: ['literature-review'],
              is_active: true,
              created_at: '2026-11-01T10:00:00Z',
              updated_at: '2026-11-01T10:00:00Z',
            },
          ]}
          initialInvitations={[
            {
              id: 'inv-1',
              project: 'proj-1',
              invited_by: 'user-owner',
              invited_by_name: 'Project Owner',
              invitee_email: 'reviewer@university.edu',
              role: 'ACADEMIC_REVIEWER',
              assigned_sections: [],
              token: 'test-token',
              status: 'PENDING',
              expires_at: '2026-11-15T00:00:00Z',
              is_expired: false,
              created_at: '2026-11-01T00:00:00Z',
            },
          ]}
          currentUserRole="PROJECT_OWNER"
        />
      );

      expect(screen.getByText('Research Collaborators & Supervisors')).toBeInTheDocument();
      expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('supervisor@example.com')).toBeInTheDocument();
      expect(screen.getByText('reviewer@university.edu')).toBeInTheDocument();
      expect(screen.getByText(/Pending Invitations/i)).toBeInTheDocument();
    });

    it('submits a new collaborator invitation', async () => {
      render(
        <CollaboratorsManager
          projectId="proj-1"
          initialCollaborators={[]}
          initialInvitations={[]}
          currentUserRole="PROJECT_OWNER"
        />
      );

      fireEvent.click(screen.getByText('+ Invite Collaborator'));
      const emailInput = screen.getByPlaceholderText('supervisor@university.edu');
      fireEvent.change(emailInput, { target: { value: 'coauthor@example.com' } });

      const sendButton = screen.getByText('Send Secure Invitation');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Invitation sent to coauthor@example.com/i)).toBeInTheDocument();
      });
    });
  });

  describe('InlineCommentsPanel', () => {
    it('renders comments, filters, and displays anchor text', () => {
      const mockComments = [
        {
          id: 'comm-1',
          project: 'proj-1',
          document: 'doc-1',
          section: 'sec-1',
          author: 'user-1',
          author_name: 'Prof. Adeyemi',
          author_email: 'adeyemi@university.edu',
          anchor_text: 'sample size of 400 respondents',
          anchor_prefix: 'Based on a ',
          anchor_suffix: ' across four regions',
          start_offset: 10,
          end_offset: 42,
          content: 'Clarify sampling stratification method.',
          status: 'OPEN' as const,
          created_at: '2026-11-04T10:00:00Z',
          updated_at: '2026-11-04T10:00:00Z',
          replies: [],
        },
      ];

      render(
        <InlineCommentsPanel
          projectId="proj-1"
          documentId="doc-1"
          comments={mockComments}
        />
      );

      expect(screen.getByText('Manuscript Comments')).toBeInTheDocument();
      expect(screen.getByText(/sample size of 400 respondents/i)).toBeInTheDocument();
      expect(screen.getByText('Clarify sampling stratification method.')).toBeInTheDocument();
      expect(screen.getByText('Prof. Adeyemi')).toBeInTheDocument();
    });

    it('submits a reply to an existing comment thread', async () => {
      const mockComments = [
        {
          id: 'comm-1',
          project: 'proj-1',
          document: 'doc-1',
          author: 'user-1',
          author_name: 'Prof. Adeyemi',
          author_email: 'adeyemi@university.edu',
          anchor_text: 'methodology',
          start_offset: 0,
          end_offset: 11,
          content: 'Please verify instrument reliability.',
          status: 'OPEN' as const,
          created_at: '2026-11-04T10:00:00Z',
          updated_at: '2026-11-04T10:00:00Z',
          replies: [],
        },
      ];

      render(
        <InlineCommentsPanel
          projectId="proj-1"
          documentId="doc-1"
          comments={mockComments}
        />
      );

      const replyInput = screen.getByPlaceholderText('Reply to this thread...');
      fireEvent.change(replyInput, { target: { value: 'Cronbach alpha is 0.88.' } });

      const replyButton = screen.getByText('Reply');
      fireEvent.click(replyButton);

      await waitFor(() => {
        expect(replyInput).toHaveValue('');
      });
    });
  });

  describe('SupervisorFeedbackWorkspace', () => {
    it('renders manual entry and shows PDF disclaimer notice when present', () => {
      const mockFeedbacks = [
        {
          id: 'fb-1',
          project: 'proj-1',
          uploaded_by: 'user-sup',
          uploaded_by_name: 'Dr. Jane Smith',
          uploaded_by_email: 'supervisor@example.com',
          source_type: 'PDF_UPLOAD' as const,
          raw_content: 'Supervisor review of Chapter 3 and 4.',
          title: 'Thesis_Draft_Supervisor_Markup.pdf',
          extracted_comments: [],
          has_unextracted_annotations: true,
          created_at: '2026-11-04T12:00:00Z',
        },
      ];

      render(
        <SupervisorFeedbackWorkspace
          projectId="proj-1"
          feedbacks={mockFeedbacks}
        />
      );

      expect(screen.getByText('Supervisor Feedback Assistant')).toBeInTheDocument();
      expect(screen.getByText('Thesis_Draft_Supervisor_Markup.pdf')).toBeInTheDocument();
      expect(
        screen.getByText(/PDF text extraction complete. Graphical margin annotations require manual verification./i)
      ).toBeInTheDocument();
      expect(screen.getByText('⚡ AI Correction Analysis')).toBeInTheDocument();
    });

    it('triggers AI correction analysis', async () => {
      const mockFeedbacks = [
        {
          id: 'fb-1',
          project: 'proj-1',
          uploaded_by: 'user-sup',
          uploaded_by_name: 'Dr. Jane Smith',
          uploaded_by_email: 'supervisor@example.com',
          source_type: 'MANUAL_ENTRY' as const,
          raw_content: 'Update the literature review on financial inclusion.',
          title: 'Meeting Notes Nov 4',
          extracted_comments: [],
          has_unextracted_annotations: false,
          created_at: '2026-11-04T12:00:00Z',
        },
      ];

      render(
        <SupervisorFeedbackWorkspace
          projectId="proj-1"
          feedbacks={mockFeedbacks}
        />
      );

      const analyzeBtn = screen.getByText('⚡ AI Correction Analysis');
      fireEvent.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText(/AI Correction Analysis Summary \(2 Tasks Generated\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('CorrectionTracker', () => {
    it('renders correction tasks with priority badges', () => {
      const mockTasks = [
        {
          id: 'task-1',
          project: 'proj-1',
          title: 'Address Literature Gap in Mobile Money',
          instruction: 'Include recent 2024-2025 empirical studies on agent networks.',
          category: 'EMPIRICAL_LITERATURE' as const,
          priority: 'HIGH' as const,
          status: 'OPEN' as const,
          section_title: 'Literature Review',
          original_text: '',
          proposed_text: '',
          is_stale_after_subsequent_edit: false,
          created_at: '2026-11-04T12:00:00Z',
          updated_at: '2026-11-04T12:00:00Z',
        },
      ];

      render(
        <CorrectionTracker
          projectId="proj-1"
          tasks={mockTasks}
          currentUserRole="PROJECT_OWNER"
        />
      );

      expect(screen.getByText('Revision & Correction Tracker')).toBeInTheDocument();
      expect(screen.getByText('Address Literature Gap in Mobile Money')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('EMPIRICAL LITERATURE')).toBeInTheDocument();
    });

    it('approves a correction task as supervisor', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          project: 'proj-1',
          title: 'Revise Statistical Interpretation',
          instruction: 'Ensure p-value reporting adheres to APA 7th style.',
          category: 'STATISTICAL_INTERPRETATION' as const,
          priority: 'HIGH' as const,
          status: 'READY_FOR_REVIEW' as const,
          section_title: 'Results',
          original_text: '',
          proposed_text: '',
          is_stale_after_subsequent_edit: false,
          created_at: '2026-11-04T12:00:00Z',
          updated_at: '2026-11-04T12:00:00Z',
        },
      ];

      render(
        <CorrectionTracker
          projectId="proj-1"
          tasks={mockTasks}
          currentUserRole="SUPERVISOR"
        />
      );

      const approveBtn = screen.getByText('✓ Approve');
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Task marked as approved/i)).toBeInTheDocument();
      });
    });
  });

  describe('VersionDiffViewer', () => {
    it('displays word level diff additions and deletions', async () => {
      render(
        <VersionDiffViewer
          documentId="doc-1"
          currentVersionNumber={2}
          availableVersions={[1, 2]}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Manuscript Version Comparison/i)).toBeInTheDocument();
        expect(screen.getByText('Net Delta')).toBeInTheDocument();
        expect(screen.getByText(/scholarly revision/i)).toBeInTheDocument();
        expect(screen.getByText(/draft/i)).toBeInTheDocument();
      });
    });
  });

  describe('JournalReviewMatrix', () => {
    it('renders reviewer point-by-point matrix', () => {
      const mockResponses = [
        {
          id: 'rev-1',
          project: 'proj-1',
          reviewer_label: 'Reviewer 1',
          comment_number: 1,
          original_comment: 'The conceptual framework lacks a clear operationalization of trust.',
          revision_category: 'MAJOR' as const,
          author_response: 'We added Section 2.4 defining trust metrics per Mayer et al. (1995).',
          is_verified_applied: true,
          created_at: '2026-11-04T12:00:00Z',
          updated_at: '2026-11-04T12:00:00Z',
        },
      ];

      render(
        <JournalReviewMatrix
          projectId="proj-1"
          initialItems={mockResponses}
        />
      );

      expect(screen.getByText('Journal Reviewer Point-by-Point Response Matrix')).toBeInTheDocument();
      expect(screen.getByText(/The conceptual framework lacks a clear/i)).toBeInTheDocument();
      expect(screen.getByText('✓ Verified Applied')).toBeInTheDocument();
    });

    it('generates the synthesis response document', async () => {
      render(
        <JournalReviewMatrix
          projectId="proj-1"
          initialItems={[]}
        />
      );

      const genButton = screen.getByText('Export Response Document');
      fireEvent.click(genButton);

      await waitFor(() => {
        expect(screen.getByText('Formatted Response to Reviewers Document')).toBeInTheDocument();
        expect(screen.getByText(/Point-by-Point Response to Reviewers/i)).toBeInTheDocument();
      });
    });
  });

  describe('SupervisorDashboardView', () => {
    it('loads and lists supervised student advisee projects', async () => {
      render(<SupervisorDashboardView />);

      await waitFor(() => {
        expect(screen.getByText('Academic Supervisor Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Empirical Study on Financial Inclusion')).toBeInTheDocument();
        expect(screen.getByText(/Amina Bello/i)).toBeInTheDocument();
        expect(screen.getByText('Development Economics')).toBeInTheDocument();
        expect(screen.getByText('Open Workspace ➔')).toBeInTheDocument();
      });
    });
  });
});
