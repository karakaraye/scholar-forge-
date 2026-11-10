'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentExport,
  DocumentExportFormat,
  ExportPreview,
  ExportJob,
} from '@/types/export';
import { FormattingTemplate } from '@/types/formatting';
import { exportApi, institutionalTemplateApi } from '@/lib/api';
import { ExportConfigurationPanel } from './ExportConfigurationPanel';
import { RenderedDocumentPreview } from './RenderedDocumentPreview';
import { ExportQAPanel } from './ExportQAPanel';
import { ExportHistoryDrawer } from './ExportHistoryDrawer';

interface DocumentExportWorkspaceProps {
  projectId: string;
}

export const DocumentExportWorkspace: React.FC<DocumentExportWorkspaceProps> = ({
  projectId,
}) => {
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [templates, setTemplates] = useState<FormattingTemplate[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<DocumentExportFormat>('DOCX');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [citationStyle, setCitationStyle] = useState<string>('apa-7th');

  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusMessage, setExportStatusMessage] = useState<string>('');

  const [currentExport, setCurrentExport] = useState<DocumentExport | null>(null);
  const [exportsHistory, setExportsHistory] = useState<DocumentExport[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Load preview data and template options
  const loadWorkspaceData = useCallback(async () => {
    setIsLoadingPreview(true);
    try {
      const [prevData, tpls, history] = await Promise.all([
        exportApi.getPreview(projectId, selectedTemplateId || undefined),
        institutionalTemplateApi.getTemplates().catch(() => []),
        exportApi.getProjectExports(projectId).catch(() => []),
      ]);

      setPreview(prevData);
      setTemplates(tpls);
      setExportsHistory(history);

      if (history.length > 0 && !currentExport) {
        setCurrentExport(history[0]);
      }
    } catch (err) {
      console.error('Failed to load document export preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [projectId, selectedTemplateId, currentExport]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Initiate asynchronous export
  const handleInitiateExport = async () => {
    setIsExporting(true);
    setExportProgress(10);
    setExportStatusMessage('Initializing export job...');

    try {
      const job: ExportJob = await exportApi.initiateExport(projectId, {
        export_format: selectedFormat,
        template_id: selectedTemplateId || undefined,
        citation_style: citationStyle,
        idempotency_key: `export-${Date.now()}`,
      });

      // Poll job progress
      let currentJob = job;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await exportApi.getJobStatus(currentJob.id);
          currentJob = statusRes;
          setExportProgress(statusRes.progress_pct);
          setExportStatusMessage(statusRes.status_message);

          if (statusRes.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setIsExporting(false);
            if (statusRes.document_export_details) {
              setCurrentExport(statusRes.document_export_details);
            }
            // Refresh history
            exportApi.getProjectExports(projectId).then(setExportsHistory);
          } else if (statusRes.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsExporting(false);
            alert(`Export failed: ${statusRes.error_message || 'Internal generation error'}`);
          }
        } catch {
          clearInterval(pollInterval);
          setIsExporting(false);
        }
      }, 1000);
    } catch (err: any) {
      setIsExporting(false);
      alert(err.message || 'Failed to start export');
    }
  };

  // Download exported artifact
  const handleDownload = (expItem?: DocumentExport) => {
    const item = expItem || currentExport;
    if (!item) return;
    const downloadUrl = exportApi.getDownloadUrl(item.id);
    window.open(downloadUrl, '_blank');
  };

  // Trigger on-demand QA validation
  const handleRevalidate = async () => {
    if (!currentExport) return;
    setIsValidating(true);
    try {
      const valReport = await exportApi.triggerValidation(currentExport.id);
      setCurrentExport((prev) =>
        prev ? { ...prev, validation_report: valReport } : null
      );
    } catch (err) {
      console.error('Failed to revalidate export QA:', err);
    } finally {
      setIsValidating(false);
    }
  };

  // Delete export
  const handleDeleteExport = async (exportId: string) => {
    if (!confirm('Are you sure you want to delete this export artifact?')) return;
    try {
      await exportApi.deleteExport(exportId);
      setExportsHistory((prev) => prev.filter((e) => e.id !== exportId));
      if (currentExport?.id === exportId) {
        setCurrentExport(null);
      }
    } catch (err) {
      console.error('Failed to delete export:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* 3-Panel Main Layout */}
      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
        {/* Left Column: Configuration (3 cols) */}
        <div className="col-span-12 lg:col-span-3 h-full">
          <ExportConfigurationPanel
            preview={preview}
            templates={templates}
            selectedFormat={selectedFormat}
            onFormatChange={setSelectedFormat}
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={setSelectedTemplateId}
            citationStyle={citationStyle}
            onCitationStyleChange={setCitationStyle}
            isExporting={isExporting}
            exportProgress={exportProgress}
            exportStatusMessage={exportStatusMessage}
            onInitiateExport={handleInitiateExport}
            onOpenHistory={() => setIsHistoryOpen(true)}
          />
        </div>

        {/* Center Column: Rendered Document Preview (6 cols) */}
        <div className="col-span-12 lg:col-span-6 h-full">
          <RenderedDocumentPreview
            preview={preview}
            selectedFormat={selectedFormat}
            isLoading={isLoadingPreview}
          />
        </div>

        {/* Right Column: QA Audit & Download (3 cols) */}
        <div className="col-span-12 lg:col-span-3 h-full">
          <ExportQAPanel
            currentExport={currentExport}
            onDownload={() => handleDownload()}
            onRevalidate={handleRevalidate}
            isValidating={isValidating}
          />
        </div>
      </div>

      {/* Export History Drawer */}
      <ExportHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        exports={exportsHistory}
        onSelectExport={(exp) => setCurrentExport(exp)}
        onDownloadExport={handleDownload}
        onDeleteExport={handleDeleteExport}
      />
    </div>
  );
};

