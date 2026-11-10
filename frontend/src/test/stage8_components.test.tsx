import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportConfigurationPanel } from '@/components/export/ExportConfigurationPanel';
import { RenderedDocumentPreview } from '@/components/export/RenderedDocumentPreview';
import { ExportQAPanel } from '@/components/export/ExportQAPanel';
import { ExportHistoryDrawer } from '@/components/export/ExportHistoryDrawer';
import { DocumentExportWorkspace } from '@/components/export/DocumentExportWorkspace';
import { DocumentExport, ExportPreview } from '@/types/export';
import { FormattingTemplate } from '@/types/formatting';

// Mock clipboard safely in jsdom
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
  configurable: true,
});

// Mock export & template APIs
vi.mock('@/lib/api', () => ({
  exportApi: {
    getPreview: vi.fn().mockResolvedValue({
      project_id: 'proj-123',
      title: 'Neural Architecture Search in Edge Computing',
      author: 'A. Researcher',
      institution: 'University of Oxford',
      degree: 'Doctor of Philosophy',
      citation_style: 'apa-7th',
      template_name: 'University of Oxford — DPhil Thesis Standard',
      layout: {
        paper_size: 'A4',
        primary_font: 'Times New Roman',
        base_font_size_pt: 12,
        line_spacing: 2.0,
        binding_gutter_inches: 0.5,
        prelim_page_num_format: 'lowerRoman',
        main_page_num_format: 'decimal',
      },
      preliminary_pages: [
        { page_key: 'TITLE_PAGE', title: 'Title Page', suppress_page_number: true, paragraphs_count: 4 },
        { page_key: 'ABSTRACT', title: 'Abstract', suppress_page_number: false, paragraphs_count: 2 },
        { page_key: 'DEDICATION', title: 'Dedication', suppress_page_number: false, paragraphs_count: 1 },
      ],
      chapters: [
        { id: 'sec-1', title: 'Introduction', order_index: 1, word_count: 1200, blocks_count: 6 },
        { id: 'sec-2', title: 'Methodology', order_index: 2, word_count: 2400, blocks_count: 9 },
      ],
      bibliography_count: 15,
      estimated_pages: 14,
      total_words: 3600,
      total_tables: 3,
      total_figures: 1,
      total_equations: 4,
    }),
    getProjectExports: vi.fn().mockResolvedValue([
      {
        id: 'exp-1',
        project: 'proj-123',
        document_version: 'ver-1',
        export_format: 'DOCX',
        citation_style: 'apa-7th',
        file_name: 'Neural_Architecture_Search.docx',
        file_size_bytes: 524288,
        file_checksum: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        page_count: 14,
        created_at: '2026-11-05T08:00:00Z',
        validation_report: {
          id: 'val-1',
          document_export: 'exp-1',
          structure_valid: true,
          layout_valid: true,
          citations_valid: true,
          total_issues: 0,
          overall_rating: 'EXCELLENT',
          summary_notes: 'Layout perfectly conforms to academic standard.',
          cross_check_diffs: {},
          metrics: {
            headings: { ir_count: 5, target_count: 5 },
            tables: { ir_count: 3, target_count: 3 },
            figures: { ir_count: 1, target_count: 1 },
            equations: { ir_count: 4, target_count: 4 },
            references: { ir_count: 15, target_count: 15 },
          },
          issues: [],
          created_at: '2026-11-05T08:01:00Z',
        },
      },
    ]),
    initiateExport: vi.fn().mockResolvedValue({
      id: 'job-1',
      project: 'proj-123',
      export_format: 'DOCX',
      status: 'PENDING',
      progress: 0,
      current_step: 'Queued for rendering',
      created_at: '2026-11-05T08:02:00Z',
    }),
    getJobStatus: vi.fn().mockResolvedValue({
      id: 'job-1',
      project: 'proj-123',
      export_format: 'DOCX',
      status: 'COMPLETED',
      progress: 100,
      current_step: 'Completed successfully',
      result_export_id: 'exp-1',
      created_at: '2026-11-05T08:02:00Z',
    }),
    getExportDetail: vi.fn().mockResolvedValue({
      id: 'exp-1',
      project: 'proj-123',
      document_version: 'ver-1',
      export_format: 'DOCX',
      citation_style: 'apa-7th',
      file_name: 'Neural_Architecture_Search.docx',
      file_size_bytes: 524288,
      file_checksum: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      page_count: 14,
      created_at: '2026-11-05T08:00:00Z',
    }),
    downloadExport: vi.fn().mockResolvedValue({}),
    validateExport: vi.fn().mockResolvedValue({
      id: 'val-1',
      document_export: 'exp-1',
      structure_valid: true,
      layout_valid: true,
      citations_valid: true,
      total_issues: 0,
      overall_rating: 'EXCELLENT',
      summary_notes: 'All checks passed.',
      cross_check_diffs: {},
      metrics: {},
      issues: [],
      created_at: '2026-11-05T08:01:00Z',
    }),
    deleteExport: vi.fn().mockResolvedValue({ success: true }),
  },
  institutionalTemplateApi: {
    getTemplates: vi.fn().mockResolvedValue([
      {
        id: 'tpl-oxford',
        name: 'University of Oxford — DPhil Thesis Standard',
        institution_name: 'University of Oxford',
        citation_style: 'oxford',
      },
      {
        id: 'tpl-harvard',
        name: 'Harvard University — GSAS Dissertation Standard',
        institution_name: 'Harvard University',
        citation_style: 'harvard',
      },
    ]),
  },
}));

describe('Stage 8 Document Export Components', () => {
  const mockPreview: ExportPreview = {
    project_id: 'proj-123',
    title: 'Neural Architecture Search in Edge Computing',
    author: 'A. Researcher',
    institution: 'University of Oxford',
    degree: 'Doctor of Philosophy',
    citation_style: 'apa-7th',
    template_name: 'University of Oxford — DPhil Thesis Standard',
    layout: {
      paper_size: 'A4',
      primary_font: 'Times New Roman',
      base_font_size_pt: 12,
      line_spacing: 2.0,
      binding_gutter_inches: 0.5,
      prelim_page_num_format: 'lowerRoman',
      main_page_num_format: 'decimal',
    },
    preliminary_pages: [
      { page_key: 'TITLE_PAGE', title: 'Title Page', suppress_page_number: true, paragraphs_count: 4 },
      { page_key: 'ABSTRACT', title: 'Abstract', suppress_page_number: false, paragraphs_count: 2 },
    ],
    chapters: [
      {
        id: 'sec-1',
        title: 'Introduction',
        order_index: 1,
        word_count: 1200,
        blocks_count: 6,
      },
    ],
    bibliography_count: 15,
    estimated_pages: 10,
    total_words: 1200,
    total_tables: 1,
    total_figures: 0,
    total_equations: 1,
  };

  const mockTemplates: FormattingTemplate[] = [
    {
      id: 'tpl-oxford',
      name: 'University of Oxford — DPhil Thesis Standard',
      description: 'Official Oxford thesis format',
      template_type: 'INSTITUTIONAL',
      institution_name: 'University of Oxford',
      degree_level: 'PHD',
      document_type: 'DISSERTATION',
      citation_style: 'oxford',
      verification_status: 'OFFICIALLY_VERIFIED',
      is_default: false,
      is_shared: true,
      version_count: 1,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  const mockExport: DocumentExport = {
    id: 'exp-1',
    project: 'proj-123',
    document_version: 'ver-1',
    export_format: 'DOCX',
    citation_style: 'apa-7th',
    file_name: 'Neural_Architecture_Search.docx',
    file_size_bytes: 524288,
    file_checksum: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    page_count: 14,
    heading_count: 5,
    table_count: 3,
    figure_count: 1,
    reference_count: 15,
    word_count: 3600,
    metadata_snapshot: {},
    is_verified: true,
    created_at: '2026-11-05T08:00:00Z',
    updated_at: '2026-11-05T08:01:00Z',
    validation_report: {
      id: 'val-1',
      document_export: 'exp-1',
      structure_valid: true,
      layout_valid: true,
      citations_valid: true,
      total_issues: 1,
      overall_rating: 'ACCEPTABLE',
      summary_notes: 'Document structure verified with 1 minor warning.',
      cross_check_diffs: {},
      metrics: {
        headings: { ir_count: 5, target_count: 5 },
        tables: { ir_count: 3, target_count: 3 },
        figures: { ir_count: 1, target_count: 1 },
        equations: { ir_count: 4, target_count: 4 },
        references: { ir_count: 15, target_count: 15 },
      },
      issues: [
        {
          id: 'iss-1',
          category: 'LAYOUT',
          severity: 'MINOR',
          message: 'Table 2 overflows slightly on right margin in narrow viewport.',
          page_number: 6,
          location: 'Chapter 2: Table 2',
          suggested_action: 'Reduce font size to 10pt for wide tables.',
          created_at: '2026-11-05T08:01:00Z',
        },
      ],
      created_at: '2026-11-05T08:01:00Z',
    },
  };

  describe('ExportConfigurationPanel', () => {
    it('renders format selectors, template options, and triggers format change', () => {
      const handleFormatChange = vi.fn();
      const handleTemplateChange = vi.fn();
      const handleCitationStyleChange = vi.fn();
      const handleInitiateExport = vi.fn();
      const handleOpenHistory = vi.fn();

      render(
        <ExportConfigurationPanel
          preview={mockPreview}
          templates={mockTemplates}
          selectedFormat="DOCX"
          onFormatChange={handleFormatChange}
          selectedTemplateId=""
          onTemplateChange={handleTemplateChange}
          citationStyle="apa-7th"
          onCitationStyleChange={handleCitationStyleChange}
          isExporting={false}
          exportProgress={0}
          exportStatusMessage=""
          onInitiateExport={handleInitiateExport}
          onOpenHistory={handleOpenHistory}
        />
      );

      expect(screen.getByText('Export Settings')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Word')).toBeInTheDocument();
      expect(screen.getByText('PDF Document')).toBeInTheDocument();

      // Click PDF format
      fireEvent.click(screen.getByText('PDF Document'));
      expect(handleFormatChange).toHaveBeenCalledWith('PDF');

      // Select template
      const templateSelect = screen.getByLabelText(/Formatting Template/i);
      fireEvent.change(templateSelect, { target: { value: 'tpl-oxford' } });
      expect(handleTemplateChange).toHaveBeenCalledWith('tpl-oxford');

      // Check layout preview info
      expect(screen.getByText(/Physical Page Layout/i)).toBeInTheDocument();
      expect(screen.getByText(/Times New Roman/i)).toBeInTheDocument();

      // Trigger Export
      const exportButton = screen.getByRole('button', { name: /Export Document \(DOCX\)/i });
      fireEvent.click(exportButton);
      expect(handleInitiateExport).toHaveBeenCalledTimes(1);

      // Open History
      fireEvent.click(screen.getByText('Export History'));
      expect(handleOpenHistory).toHaveBeenCalledTimes(1);
    });

    it('displays progress bar when export is in progress', () => {
      render(
        <ExportConfigurationPanel
          preview={mockPreview}
          templates={mockTemplates}
          selectedFormat="PDF"
          onFormatChange={vi.fn()}
          selectedTemplateId=""
          onTemplateChange={vi.fn()}
          citationStyle="apa-7th"
          onCitationStyleChange={vi.fn()}
          isExporting={true}
          exportProgress={65}
          exportStatusMessage="Applying dual pagination and bookmarks..."
          onInitiateExport={vi.fn()}
          onOpenHistory={vi.fn()}
        />
      );

      expect(screen.getByText('Applying dual pagination and bookmarks...')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Generating Artifact...')).toBeInTheDocument();
    });
  });

  describe('RenderedDocumentPreview', () => {
    it('renders loading state when isLoading is true', () => {
      render(
        <RenderedDocumentPreview
          preview={null}
          selectedFormat="DOCX"
          isLoading={true}
        />
      );

      expect(screen.getByText(/Compiling Document Layout & Pagination Preview/i)).toBeInTheDocument();
    });

    it('renders document preview page and handles page navigation and zoom', () => {
      render(
        <RenderedDocumentPreview
          preview={mockPreview}
          selectedFormat="DOCX"
          isLoading={false}
        />
      );

      expect(screen.getByText('Document Layout Preview')).toBeInTheDocument();
      expect(screen.getByText(/Neural Architecture Search in Edge Computing/i)).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();

      // Navigate Next Page
      const nextButton = screen.getByTitle('Next Page');
      fireEvent.click(nextButton);
      expect(screen.getByText('Page 2 of 10')).toBeInTheDocument();

      // Zoom Controls
      const zoomInButton = screen.getByTitle('Zoom In');
      fireEvent.click(zoomInButton);
      expect(screen.getByText('110%')).toBeInTheDocument();

      const zoomResetButton = screen.getByTitle('Reset Zoom');
      fireEvent.click(zoomResetButton);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('ExportQAPanel', () => {
    it('renders QA validation rating, checksum, structural parity metrics, and issues', () => {
      const handleDownload = vi.fn();
      const handleRevalidate = vi.fn();

      render(
        <ExportQAPanel
          currentExport={mockExport}
          onDownload={handleDownload}
          onRevalidate={handleRevalidate}
          isValidating={false}
        />
      );

      expect(screen.getByText('Export QA & Audit')).toBeInTheDocument();
      expect(screen.getByText('ACCEPTABLE')).toBeInTheDocument();
      expect(screen.getByText('Neural_Architecture_Search.docx')).toBeInTheDocument();
      expect(screen.getByText('Structural Parity Cross-Check')).toBeInTheDocument();

      // Check parity metrics
      expect(screen.getByText('Headings')).toBeInTheDocument();
      expect(screen.getByText('Tables')).toBeInTheDocument();
      expect(screen.getByText('Figures')).toBeInTheDocument();

      // Check issue rendering
      expect(screen.getByText(/Table 2 overflows slightly/i)).toBeInTheDocument();
      expect(screen.getByText('MINOR')).toBeInTheDocument();

      // Copy checksum
      const copyButton = screen.getByTitle('Copy SHA-256 Checksum');
      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockExport.file_checksum);

      // Trigger download
      const downloadButton = screen.getByRole('button', { name: /Download DOCX/i });
      fireEvent.click(downloadButton);
      expect(handleDownload).toHaveBeenCalledTimes(1);
    });

    it('renders empty placeholder when no export artifact is selected', () => {
      render(
        <ExportQAPanel
          currentExport={null}
          onDownload={vi.fn()}
          onRevalidate={vi.fn()}
          isValidating={false}
        />
      );

      expect(screen.getByText('No Export Generated Yet')).toBeInTheDocument();
      expect(screen.getByText(/Configure settings on the left panel/i)).toBeInTheDocument();
    });
  });

  describe('ExportHistoryDrawer', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <ExportHistoryDrawer
          isOpen={false}
          onClose={vi.fn()}
          exports={[mockExport]}
          onSelectExport={vi.fn()}
          onDownloadExport={vi.fn()}
          onDeleteExport={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders historical exports list and handles actions', () => {
      const handleClose = vi.fn();
      const handleSelect = vi.fn();
      const handleDownload = vi.fn();
      const handleDelete = vi.fn();

      render(
        <ExportHistoryDrawer
          isOpen={true}
          onClose={handleClose}
          exports={[mockExport]}
          onSelectExport={handleSelect}
          onDownloadExport={handleDownload}
          onDeleteExport={handleDelete}
        />
      );

      expect(screen.getByText('Document Export History')).toBeInTheDocument();
      expect(screen.getByText('Neural_Architecture_Search.docx')).toBeInTheDocument();

      // Inspect export
      fireEvent.click(screen.getByText('Inspect QA'));
      expect(handleSelect).toHaveBeenCalledWith(mockExport);

      // Download
      fireEvent.click(screen.getByText('Download'));
      expect(handleDownload).toHaveBeenCalledWith(mockExport);

      // Close drawer
      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('DocumentExportWorkspace', () => {
    it('renders the complete 3-panel export workspace and loads preview data', async () => {
      render(<DocumentExportWorkspace projectId="proj-123" />);

      // Workspace loads data
      await waitFor(() => {
        expect(screen.getByText('Export Settings')).toBeInTheDocument();
        expect(screen.getByText('Document Layout Preview')).toBeInTheDocument();
        expect(screen.getByText('Export QA & Audit')).toBeInTheDocument();
      });

      // Verify template options loaded
      expect(screen.getByText(/University of Oxford — DPhil Thesis Standard/i)).toBeInTheDocument();
    });
  });
});
