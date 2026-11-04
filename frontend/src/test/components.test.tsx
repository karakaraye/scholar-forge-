import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatCard from '@/components/StatCard';
import ProjectCard from '@/components/ProjectCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import { FolderKanban } from 'lucide-react';
import { DOCUMENT_CATEGORIES, CITATION_STYLES, CATEGORY_SUBTYPES } from '@/lib/constants';
import { ResearchProject } from '@/types/project';

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
