import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstitutionalTemplateSelector } from '@/components/formatting/InstitutionalTemplateSelector';
import { FormattingRuleConfigurator } from '@/components/formatting/FormattingRuleConfigurator';
import { PreliminaryPagesWorkspace } from '@/components/formatting/PreliminaryPagesWorkspace';
import { ComplianceAuditPanel } from '@/components/formatting/ComplianceAuditPanel';
import { JournalPublicationWorkspace } from '@/components/formatting/JournalPublicationWorkspace';
import { GuidelineIngestionModal } from '@/components/formatting/GuidelineIngestionModal';
import { FormattingTemplate, RulesConfig } from '@/types/formatting';

// Mock Stage 7 APIs
vi.mock('@/lib/api', () => ({
  formattingApi: {
    listInstitutions: vi.fn().mockResolvedValue([
      { id: 'inst-1', name: 'University of Oxford', country: 'United Kingdom', is_verified: true },
      { id: 'inst-2', name: 'University of Ibadan', country: 'Nigeria', is_verified: true },
    ]),
    listTemplates: vi.fn().mockResolvedValue([
      {
        id: 'tpl-1',
        name: 'Oxford DPhil Dissertation Standard',
        description: 'Official University of Oxford DPhil thesis guidelines.',
        template_type: 'INSTITUTIONAL',
        institution_name: 'University of Oxford',
        degree_level: 'PHD',
        document_type: 'DISSERTATION',
        citation_style: 'oxford',
        verification_status: 'OFFICIALLY_VERIFIED',
        verification_source_url: 'https://www.ox.ac.uk/students/academic/guidance/skills/formatting',
        active_version: {
          id: 'v-1',
          version_number: 1,
          rules_config: {
            page_settings: {
              paper_size: 'A4',
              margins_inches: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.0, gutter: 0.5 },
            },
            typography: {
              primary_font: 'Times New Roman',
              base_font_size_pt: 12,
              line_spacing: 2.0,
              first_line_indent_inches: 0.5,
            },
            chapter_structure: {
              chapter_numbering_style: 'ARABIC',
              section_numbering_depth: 3,
              heading_case: 'UPPERCASE',
            },
            pagination: {
              preliminary_format: 'ROMAN_LOWER',
              main_format: 'ARABIC',
              prelim_position: 'BOTTOM_CENTER',
              main_position: 'TOP_RIGHT',
            },
            tables_figures: {
              table_caption_placement: 'ABOVE',
              figure_caption_placement: 'BELOW',
              numbering_format: 'CHAPTER_BASED',
            },
            citations: {
              style: 'oxford',
              hanging_indent_inches: 0.5,
              doi_required: true,
            },
          },
        },
      },
    ]),
    assignProjectTemplate: vi.fn().mockResolvedValue({ id: 'assign-1', project: 'p-1', template: 'tpl-1' }),
    cloneTemplate: vi.fn().mockImplementation((id, customName) =>
      Promise.resolve({
        id: 'tpl-cloned',
        name: customName || 'Custom Clone',
        verification_status: 'USER_CUSTOMIZED',
      })
    ),
  },
  preliminaryPagesApi: {
    getPreliminaryPages: vi.fn().mockResolvedValue({
      project_id: 'p-1',
      generated_at: new Date().toISOString(),
      pagination_style: 'ROMAN_LOWER',
      preliminary_pages: {
        title_page: {
          title: 'Title Page',
          html: '<h1>TEST DISSERTATION TITLE</h1>',
          is_required: true,
          roman_page: 'i',
        },
        certification: {
          title: 'Certification',
          html: '<p>Certified by supervisor</p>',
          is_required: true,
          roman_page: 'ii',
        },
        declaration: {
          title: 'Declaration',
          html: '<p>Candidate declaration</p>',
          is_required: true,
          roman_page: 'iii',
        },
      },
    }),
    generatePreliminaryPages: vi.fn().mockResolvedValue({
      project_id: 'p-1',
      generated_at: new Date().toISOString(),
      pagination_style: 'ROMAN_LOWER',
      preliminary_pages: {
        title_page: {
          title: 'Title Page',
          html: '<h1>UPDATED DISSERTATION TITLE</h1>',
          is_required: true,
          roman_page: 'i',
        },
      },
    }),
  },
  complianceApi: {
    getCompliance: vi.fn().mockResolvedValue({
      id: 'val-1',
      project: 'p-1',
      overall_status: 'NEEDS_CORRECTION',
      total_issues: 2,
      critical_count: 1,
      major_count: 1,
      minor_count: 0,
      info_count: 0,
      layout_verified: false,
      issues: [
        {
          id: 'iss-1',
          rule_key: 'METADATA_ETHICS_STATEMENT_MISSING',
          rule_category: 'METADATA',
          severity: 'CRITICAL',
          current_value: 'Empty',
          expected_value: 'IRB Approval statement',
          location: 'Publication Metadata',
          suggested_fix: 'Add ethics statement in metadata tab',
          fix_available: false,
        },
        {
          id: 'iss-2',
          rule_key: 'TABLE_MISSING_CAPTION',
          rule_category: 'TABLES_FIGURES',
          severity: 'MAJOR',
          current_value: 'Uncaptioned table',
          expected_value: 'Table 1: Title',
          location: 'Section 2',
          suggested_fix: 'Add caption',
          fix_available: true,
        },
      ],
    }),
    runComplianceAudit: vi.fn().mockResolvedValue({
      id: 'val-2',
      project: 'p-1',
      overall_status: 'COMPLIANT',
      total_issues: 0,
      critical_count: 0,
      major_count: 0,
      minor_count: 0,
      info_count: 0,
      layout_verified: false,
      issues: [],
    }),
  },
  autoformatApi: {
    previewAutoformat: vi.fn().mockResolvedValue({
      project_id: 'p-1',
      total_sections_analyzed: 2,
      sections_needing_formatting: 1,
      total_proposed_changes: 1,
      proposed_changes: [
        {
          section_id: 'sec-1',
          section_title: 'Chapter 2',
          order_index: 1,
          changes: [
            {
              rule_key: 'TABLE_CAPTION',
              field: 'content',
              description: 'Standardize table caption to Table 1',
              before: '<table>',
              after: '<p><strong>Table 1</strong></p><table>',
            },
          ],
        },
      ],
    }),
    applyAutoformat: vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      sections_formatted: 1,
      changes_applied: 1,
      snapshot_version_number: 2,
      message: 'Formatting applied successfully',
    }),
    rollbackAutoformat: vi.fn().mockResolvedValue({
      status: 'SUCCESS',
      restored_version_number: 1,
      new_current_version_number: 3,
      message: 'Document successfully restored to pre-autoformat state #1.',
    }),
  },
  journalsApi: {
    listJournals: vi.fn().mockResolvedValue([
      {
        id: 'j-1',
        journal_name: 'Nature',
        publisher: 'Springer Nature',
        article_type: 'ORIGINAL_RESEARCH',
        word_limit: 4500,
        double_blind_review: true,
      },
    ]),
    getSubmissionReadiness: vi.fn().mockResolvedValue({
      project_id: 'p-1',
      journal_name: 'Nature',
      publisher: 'Springer Nature',
      article_type: 'ORIGINAL_RESEARCH',
      readiness_score: 85,
      is_ready: false,
      checks: [
        {
          name: 'Ethics Approval Statement',
          passed: true,
          severity: 'CRITICAL',
          message: 'Provided',
          fix_route: '/metadata',
        },
        {
          name: 'Data Availability Statement',
          passed: false,
          severity: 'MAJOR',
          message: 'Missing repository link',
          fix_route: '/metadata',
        },
      ],
    }),
  },
  publicationMetadataApi: {
    getMetadata: vi.fn().mockResolvedValue({
      id: 'm-1',
      project: 'p-1',
      corresponding_author_name: 'Eleanor Vance',
      corresponding_author_email: 'eleanor@university.edu',
      affiliations: [],
      orcid_identifiers: [{ name: 'Eleanor Vance', orcid: '0000-0002-1825-0097' }],
      submission_readiness_score: 85,
    }),
    updateMetadata: vi.fn().mockImplementation((pId, payload) =>
      Promise.resolve({ id: 'm-1', project: pId, ...payload })
    ),
  },
  guidelineIngestionApi: {
    uploadAndIngest: vi.fn().mockResolvedValue({
      source_id: 'src-1',
      institution_detected: 'University of Cambridge',
      confidence_score: 0.95,
      candidate_rules: [
        {
          category: 'TYPOGRAPHY',
          rule_key: 'FONT_FAMILY',
          parameter: 'primary_font',
          extracted_value: 'Times New Roman',
          confidence: 0.98,
          source_excerpt: 'Thesis must be set in 12pt Times New Roman.',
        },
      ],
      status: 'PENDING_REVIEW',
    }),
    approveGuidelines: vi.fn().mockResolvedValue({
      id: 'tpl-new',
      name: 'Cambridge Standard',
      verification_status: 'USER_CUSTOMIZED',
    }),
  },
}));

describe('Stage 7 Frontend Formatting & Compliance Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('InstitutionalTemplateSelector', () => {
    it('renders institution options and verified template badges', async () => {
      const onSelect = vi.fn();
      render(
        <InstitutionalTemplateSelector
          projectId="proj-123"
          onTemplateSelect={onSelect}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Oxford DPhil Dissertation Standard/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Official University of Oxford DPhil thesis guidelines/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Verified/i).length).toBeGreaterThan(0);

      // Click "Use This Template"
      const useBtn = screen.getByText('Use This Template');
      fireEvent.click(useBtn);

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalled();
      });
    });
  });

  describe('FormattingRuleConfigurator', () => {
    const mockTpl: any = {
      id: 'tpl-1',
      name: 'Oxford DPhil Dissertation Standard',
      citation_style: 'oxford',
      active_version: {
        version_number: 1,
        rules_config: {
          page_settings: {
            paper_size: 'A4',
            orientation: 'PORTRAIT',
            margins_inches: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.0, gutter: 0.5 },
          },
          typography: {
            primary_font: 'Times New Roman',
            fallback_fonts: ['serif'],
            base_font_size_pt: 12,
            line_spacing: 2.0,
            paragraph_spacing_pt: 0,
            first_line_indent_inches: 0.5,
            blockquote_indent_inches: 0.5,
            heading_1: { font_size_pt: 14, bold: true, italic: false, case: 'UPPERCASE', alignment: 'CENTER', space_before_pt: 12, space_after_pt: 6 },
            heading_2: { font_size_pt: 12, bold: true, italic: false, case: 'TITLE_CASE', alignment: 'LEFT', space_before_pt: 12, space_after_pt: 6 },
            heading_3: { font_size_pt: 12, bold: false, italic: true, case: 'TITLE_CASE', alignment: 'LEFT', space_before_pt: 6, space_after_pt: 6 },
          },
          chapter_structure: {
            chapter_numbering_style: 'ARABIC',
            section_numbering_depth: 3,
            heading_case: 'UPPERCASE',
            page_break_before_chapter: true,
          },
          pagination: {
            preliminary_format: 'ROMAN_LOWER',
            main_format: 'ARABIC',
            prelim_position: 'BOTTOM_CENTER',
            main_position: 'TOP_RIGHT',
            show_on_first_page: false,
          },
          preliminary_pages: {
            required_pages: ['title_page', 'certification'],
            order: ['title_page', 'certification'],
          },
          tables_figures: {
            table_caption_placement: 'ABOVE',
            figure_caption_placement: 'BELOW',
            numbering_format: 'CHAPTER_BASED',
            notes_placement: 'BELOW',
          },
          citations: {
            style: 'oxford',
            hanging_indent_inches: 0.5,
            doi_required: true,
            url_format: 'SHORT',
          },
          word_limits: {
            abstract_min_words: 150,
            abstract_max_words: 350,
          },
        },
      },
    };

    it('displays rule controls and allows switching sub-tabs', async () => {
      render(<FormattingRuleConfigurator template={mockTpl} />);
      expect(screen.getByText(/Binding Gutter \(in\)/i)).toBeInTheDocument();

      // Switch to typography tab
      const typoTab = screen.getByText(/Typography & Spacing/i);
      fireEvent.click(typoTab);
      expect(screen.getByText(/Primary Font/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Times New Roman')).toBeInTheDocument();
    });
  });

  describe('PreliminaryPagesWorkspace', () => {
    it('renders front matter pages and shows NOT_VERIFIED transparency notice', async () => {
      render(<PreliminaryPagesWorkspace projectId="p-1" />);

      await waitFor(() => {
        expect(screen.getAllByText('Title Page').length).toBeGreaterThan(0);
      });

      // Verification notice
      expect(screen.getByText(/NOT_VERIFIED/i)).toBeInTheDocument();
      expect(screen.getByText('Certification')).toBeInTheDocument();
      expect(screen.getByText('Declaration')).toBeInTheDocument();
    });
  });

  describe('ComplianceAuditPanel', () => {
    it('displays compliance audit status and categorized issues', async () => {
      render(<ComplianceAuditPanel projectId="p-1" />);

      await waitFor(() => {
        expect(screen.getByText('NEEDS CORRECTION')).toBeInTheDocument();
      });

      expect(screen.getAllByText(/CRITICAL/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/METADATA ETHICS STATEMENT MISSING/i)).toBeInTheDocument();
      expect(screen.getByText(/TABLE MISSING CAPTION/i)).toBeInTheDocument();
    });

    it('triggers safe auto-format preview and displays rollback option', async () => {
      render(<ComplianceAuditPanel projectId="p-1" />);

      await waitFor(() => {
        expect(screen.getByText('✨ Safe Auto-Format')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('✨ Safe Auto-Format'));

      await waitFor(() => {
        expect(screen.getByText(/Safe Auto-Format Preview/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/DocumentVersion snapshot/i)).toBeInTheDocument();

      // Click Accept & Apply Format
      fireEvent.click(screen.getByText('Accept & Apply Format'));

      await waitFor(() => {
        expect(screen.getByText(/Rollback Formatting/i)).toBeInTheDocument();
      });
    });
  });

  describe('JournalPublicationWorkspace', () => {
    it('displays 4 article architectures, journal catalog and ORCID validator', async () => {
      render(<JournalPublicationWorkspace projectId="p-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Original Research \(IMRaD\)/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Review Article/i)).toBeInTheDocument();
      expect(screen.getByText(/Systematic Review \(PRISMA\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Conceptual \/ Theoretical/i)).toBeInTheDocument();
      expect(screen.getByText('Nature')).toBeInTheDocument();

      // ORCID validator
      expect(screen.getByDisplayValue('0000-0002-1825-0097')).toBeInTheDocument();
    });
  });

  describe('GuidelineIngestionModal', () => {
    it('renders upload form with prompt injection security notice', () => {
      render(<GuidelineIngestionModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/Ingest Author Guidelines/i)).toBeInTheDocument();
      expect(screen.getByText(/Adversarial Sanitization/i)).toBeInTheDocument();
    });
  });
});
