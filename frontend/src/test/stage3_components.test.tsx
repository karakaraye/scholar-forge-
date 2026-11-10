import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CitationModal from '@/components/workspace/CitationModal';
import CitationAuditModal from '@/components/workspace/CitationAuditModal';
import LiteratureReviewPanel from '@/components/workspace/LiteratureReviewPanel';
import { ResearchProject, ResearchSource, CitationAuditReport } from '@/types/project';

// Mock api calls
vi.mock('@/lib/api', () => ({
  projectSourcesApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'ps-1',
        source: {
          id: 'src-1',
          title: 'Attention Is All You Need',
          authors: ['Vaswani, A.', 'Shazeer, N.'],
          publication_year: 2017,
          source_type: 'JOURNAL_ARTICLE',
          verification_status: 'METADATA_VERIFIED',
          citation_count: 95000,
          is_open_access: true,
          retracted: false,
          provenance: ['openalex'],
        },
      },
      {
        id: 'ps-2',
        source: {
          id: 'src-2',
          title: 'Retracted Cancer Gene Study',
          authors: ['Smith, J.'],
          publication_year: 2020,
          source_type: 'JOURNAL_ARTICLE',
          verification_status: 'WITHDRAWN_OR_RETRACTED',
          citation_count: 5,
          is_open_access: false,
          retracted: true,
          provenance: ['crossref'],
        },
      },
    ]),
  },
  citationsApi: {
    formatCitation: vi.fn().mockResolvedValue({
      citation_style: 'APA_7TH',
      format_type: 'parenthetical',
      in_text_citation: '(Vaswani & Shazeer, 2017)',
      bibliography_entry: 'Vaswani, A., & Shazeer, N. (2017). Attention Is All You Need.',
      sources: [{ id: 'src-1', title: 'Attention Is All You Need' }],
    }),
    runAudit: vi.fn().mockResolvedValue({
      integrity_score: 85,
      total_citations: 12,
      in_text_count: 10,
      bibliography_count: 10,
      discrepancies_count: 1,
      total_in_text_citations: 10,
      total_bibliography_entries: 10,
      uncited_bibliography_count: 0,
      missing_bibliography_count: 0,
      unverified_count: 0,
      retracted_count: 1,
      conflict_count: 0,
      diagnostics: [
        {
          category: 'RETRACTION',
          severity: 'CRITICAL',
          issue: 'Citing retracted publication',
          issue_type: 'RETRACTED_PUBLICATION',
          affected_section: 'Section 2',
          suggested_correction: 'Remove or contextualize retraction',
          suggestion: 'Remove or replace source src-2.',
        },
      ],
      disclaimer: 'Verified against authoritative Crossref & OpenAlex databases.',
    }),
    getBibliography: vi.fn().mockResolvedValue({
      project_id: 'proj-123',
      citation_style: 'APA_7TH',
      total_references: 1,
      references: [
        {
          source_id: 'src-1',
          title: 'Attention Is All You Need',
          full_reference: 'Vaswani, A., & Shazeer, N. (2017). Attention Is All You Need.',
        },
      ],
    }),
  },
  literatureApi: {
    analyze: vi.fn().mockResolvedValue({
      job_id: 'job-1',
      task_type: 'CREATE_LITERATURE_SYNTHESIS',
      status: 'COMPLETED',
      evidence_basis: 'FULL_TEXT',
      content: 'Empirical synthesis demonstrates strong foundational transformer dynamics.',
      sources_analyzed: ['src-1'],
      academic_integrity_verified: true,
    }),
  },
}));

describe('CitationModal Component', () => {
  it('renders modal when open, lists attached sources and displays verification badges', async () => {
    const handleInsert = vi.fn();
    const handleClose = vi.fn();

    render(
      <CitationModal
        isOpen={true}
        onClose={handleClose}
        projectId="proj-123"
        onInsertCitation={handleInsert}
      />
    );

    expect(screen.getByText('Insert Scholarly Citation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
      expect(screen.getByText('Retracted Cancer Gene Study')).toBeInTheDocument();
      expect(screen.getByText('VERIFIED')).toBeInTheDocument();
      expect(screen.getByText('RETRACTED')).toBeInTheDocument();
    });

    // Parenthetical and Narrative format buttons are present
    expect(screen.getByRole('button', { name: 'Parenthetical' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Narrative' })).toBeInTheDocument();

    // Citation standard dropdown includes APA, MLA, IEEE, etc.
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Trigger insert citation
    const insertBtn = screen.getByRole('button', { name: /Insert In-Text Citation/i });
    expect(insertBtn).toBeInTheDocument();
  });
});

describe('CitationAuditModal Component', () => {
  it('runs audit and displays integrity score and diagnostic findings', async () => {
    const handleClose = vi.fn();
    const handleSync = vi.fn();

    render(
      <CitationAuditModal
        isOpen={true}
        onClose={handleClose}
        projectId="proj-123"
        onSyncBibliography={handleSync}
      />
    );

    expect(screen.getByText('Manuscript Citation Integrity Audit')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Citation Integrity Score')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('RETRACTED PUBLICATION')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Sync Bibliography/i })).toBeInTheDocument();
  });
});

describe('LiteratureReviewPanel Component', () => {
  const sampleProject: ResearchProject = {
    id: 'proj-123',
    title: 'Modern Deep Learning Architectures',
    document_category: 'RESEARCH_PAPER',
    document_subtype: 'Literature Review',
    academic_level: 'MASTERS',
    status: 'ACTIVE',
    discipline: 'cs-uuid',
    discipline_name: 'Computer Science',
    institution: 'MIT',
    country: 'United States',
    citation_style: 'APA',
    preferred_language: 'en',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('renders review matrix frameworks and handles table insertion', async () => {
    const handleInsert = vi.fn();

    render(
      <LiteratureReviewPanel
        project={sampleProject}
        onInsertContent={handleInsert}
      />
    );

    expect(screen.getByText('Literature Review Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Empirical Matrix')).toBeInTheDocument();
    expect(screen.getByText('Theoretical Framework')).toBeInTheDocument();
    expect(screen.getByText('Conceptual Review')).toBeInTheDocument();
    expect(screen.getByText('PRISMA Systematic')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
    });

    // Click insert table button
    const insertTableBtn = screen.getByRole('button', { name: /Insert EMPIRICAL Synthesis Table/i });
    expect(insertTableBtn).toBeInTheDocument();
    fireEvent.click(insertTableBtn);

    expect(handleInsert).toHaveBeenCalledTimes(1);
    expect(handleInsert.mock.calls[0][0]).toContain('class="border-collapse table-auto');
    expect(handleInsert.mock.calls[0][0]).toContain('Attention Is All You Need');
  });
});

