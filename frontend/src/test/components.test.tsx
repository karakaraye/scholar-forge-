import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatCard from '@/components/StatCard';
import ProjectCard from '@/components/ProjectCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import OutlineManager from '@/components/workspace/OutlineManager';
import VersionHistoryModal from '@/components/workspace/VersionHistoryModal';
import AIAssistantPanel from '@/components/workspace/AIAssistantPanel';
import { FolderKanban } from 'lucide-react';
import { DOCUMENT_CATEGORIES, CITATION_STYLES, CATEGORY_SUBTYPES } from '@/lib/constants';
import { ResearchProject, DocumentSection, DocumentVersion } from '@/types/project';

describe('Constants and Configurations', () => {
  it('defines 3 primary document categories', () => {
    expect(DOCUMENT_CATEGORIES).toHaveLength(3);
    const keys = DOCUMENT_CATEGORIES.map((c) => c.value);
    expect(keys).toContain('ACADEMIC_PROJECT');
    expect(keys).toContain('RESEARCH_PAPER');
    expect(keys).toContain('JOURNAL_ARTICLE');
  });

  it('defines 6 universal citation styles', () => {
    expect(CITATION_STYLES).toHaveLength(6);
    const styles = CITATION_STYLES.map((c) => c.value);
    expect(styles).toEqual(['APA', 'MLA', 'CHICAGO', 'HARVARD', 'IEEE', 'VANCOUVER']);
  });

  it('provides configured subtypes for all categories', () => {
    expect(CATEGORY_SUBTYPES.ACADEMIC_PROJECT.length).toBeGreaterThan(3);
    expect(CATEGORY_SUBTYPES.RESEARCH_PAPER.length).toBeGreaterThan(4);
    expect(CATEGORY_SUBTYPES.JOURNAL_ARTICLE.length).toBeGreaterThan(2);
  });
});

describe('StatCard Component', () => {
  it('renders title and numeric value properly', () => {
    render(
      <StatCard
        title="Active Projects"
        value={12}
        icon={FolderKanban}
        subtitle="Currently being drafted"
        color="emerald"
      />
    );
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Currently being drafted')).toBeInTheDocument();
  });
});

describe('ConfirmationModal Component', () => {
  it('renders modal when open and handles confirm/cancel events', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    const { rerender } = render(
      <ConfirmationModal
        isOpen={false}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();

    rerender(
      <ConfirmationModal
        isOpen={true}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirm'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ProjectCard Component', () => {
  const sampleProject: ResearchProject = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Distributed Consensus Under Asymmetric Network Partitions',
    document_category: 'RESEARCH_PAPER',
    document_subtype: 'Empirical Research Paper',
    academic_level: 'PHD',
    status: 'ACTIVE',
    discipline: 'cs-uuid',
    discipline_name: 'Computer Science',
    institution: 'MIT',
    country: 'United States',
    preferred_language: 'English',
    citation_style: 'IEEE',
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-02T12:00:00Z',
  };

  it('renders project metadata, status pill, and actions', () => {
    render(
      <ProjectCard
        project={sampleProject}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Distributed Consensus Under Asymmetric Network Partitions')).toBeInTheDocument();
    expect(screen.getByText('Empirical Research Paper')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('IEEE')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });
});

describe('Stage 2: OutlineManager Component', () => {
  const sampleSections: DocumentSection[] = [
    {
      id: 'sec-1',
      title: 'Chapter One: Introduction',
      section_type: 'CHAPTER',
      order_index: 0,
      content: '<p>Introduction content</p>',
      word_count: 24,
      created_at: '2026-11-01T12:00:00Z',
      updated_at: '2026-11-01T12:00:00Z',
    },
    {
      id: 'sec-2',
      title: 'Chapter Two: Literature Review',
      section_type: 'CHAPTER',
      order_index: 1,
      content: '<p>Literature review content</p>',
      word_count: 50,
      created_at: '2026-11-01T12:00:00Z',
      updated_at: '2026-11-01T12:00:00Z',
    },
  ];

  it('renders outline sections with titles and word counts', () => {
    const handleSelect = vi.fn();
    render(
      <OutlineManager
        sections={sampleSections}
        selectedSectionId="sec-1"
        onSelectSection={handleSelect}
        onAddSection={vi.fn()}
        onRenameSection={vi.fn()}
        onDeleteSection={vi.fn()}
        onReorder={vi.fn()}
      />
    );

    expect(screen.getByText('Chapter One: Introduction')).toBeInTheDocument();
    expect(screen.getByText('Chapter Two: Literature Review')).toBeInTheDocument();
    expect(screen.getByText(/24 words/)).toBeInTheDocument();
    expect(screen.getByText(/50 words/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Chapter Two: Literature Review'));
    expect(handleSelect).toHaveBeenCalledWith(sampleSections[1]);
  });
});

describe('Stage 2: VersionHistoryModal Component', () => {
  const sampleVersions: DocumentVersion[] = [
    {
      id: 'ver-1',
      document_id: 'doc-1',
      version_number: 1,
      snapshot_data: { sections: [] },
      created_by_name: 'Dr. Turing',
      change_summary: 'Initial outline scaffolding',
      created_at: '2026-11-01T10:00:00Z',
    },
    {
      id: 'ver-2',
      document_id: 'doc-1',
      version_number: 2,
      snapshot_data: { sections: [] },
      created_by_name: 'Dr. Turing',
      change_summary: 'Added Chapter 3 Methodology',
      created_at: '2026-11-02T15:00:00Z',
    },
  ];

  it('renders versions with summaries and handles restore triggers', () => {
    const handleRestore = vi.fn();
    render(
      <VersionHistoryModal
        isOpen={true}
        onClose={vi.fn()}
        versions={sampleVersions}
        currentVersionNumber={2}
        onCreateSnapshot={vi.fn()}
        onRestoreVersion={handleRestore}
        loading={false}
      />
    );

    expect(screen.getByText('Manuscript Revision History')).toBeInTheDocument();
    expect(screen.getByText('Initial outline scaffolding')).toBeInTheDocument();
    expect(screen.getByText('Added Chapter 3 Methodology')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getAllByText('v2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Current Active')).toBeInTheDocument();

    // Click Restore button on v1
    const restoreBtn = screen.getByText('Restore');
    fireEvent.click(restoreBtn);

    expect(screen.getByText(/Restore Manuscript to Version 1/)).toBeInTheDocument();
  });
});

describe('Stage 2: AIAssistantPanel Component', () => {
  const sampleProject: ResearchProject = {
    id: 'proj-123',
    title: 'Machine Learning Optimization for Edge Nodes',
    document_category: 'RESEARCH_PAPER',
    document_subtype: 'Original Research Article',
    academic_level: 'PHD',
    status: 'ACTIVE',
    discipline: 'cs-uuid',
    discipline_name: 'Computer Science',
    country: 'United States',
    preferred_language: 'English',
    citation_style: 'IEEE',
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-02T12:00:00Z',
  };

  it('renders AI task selectors and tab options', () => {
    render(
      <AIAssistantPanel
        project={sampleProject}
        activeSectionTitle="Chapter 1: Introduction"
        onApplySuggestion={vi.fn()}
        onRequestAI={vi.fn()}
        onFeedbackAI={vi.fn()}
        consistencyReport={null}
        onRunConsistencyCheck={vi.fn()}
        consistencyLoading={false}
      />
    );

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Consistency')).toBeInTheDocument();
    expect(screen.getByText('Context')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1: Introduction')).toBeInTheDocument();
    expect(screen.getByText('Request AI Assistance')).toBeInTheDocument();
  });
});
