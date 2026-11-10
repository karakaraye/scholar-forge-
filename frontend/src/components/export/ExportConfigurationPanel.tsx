'use client';

import React from 'react';
import { DocumentExportFormat, ExportPreview } from '@/types/export';
import { FormattingTemplate } from '@/types/formatting';

interface ExportConfigurationPanelProps {
  preview: ExportPreview | null;
  templates: FormattingTemplate[];
  selectedFormat: DocumentExportFormat;
  onFormatChange: (format: DocumentExportFormat) => void;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  citationStyle: string;
  onCitationStyleChange: (style: string) => void;
  isExporting: boolean;
  exportProgress: number;
  exportStatusMessage: string;
  onInitiateExport: () => void;
  onOpenHistory: () => void;
}

export const ExportConfigurationPanel: React.FC<ExportConfigurationPanelProps> = ({
  preview,
  templates,
  selectedFormat,
  onFormatChange,
  selectedTemplateId,
  onTemplateChange,
  citationStyle,
  onCitationStyleChange,
  isExporting,
  exportProgress,
  exportStatusMessage,
  onInitiateExport,
  onOpenHistory,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Export Settings</h2>
          <p className="text-xs text-slate-500">Configure layout, typography, and format</p>
        </div>
        <button
          onClick={onOpenHistory}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition"
        >
          Export History
        </button>
      </div>

      {/* Format Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Export Document Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onFormatChange('DOCX')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition ${
              selectedFormat === 'DOCX'
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
            }`}
          >
            <span className="text-sm font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Microsoft Word
            </span>
            <span className="text-xs text-slate-500 mt-0.5">Editable .docx (OOXML)</span>
          </button>

          <button
            type="button"
            onClick={() => onFormatChange('PDF')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition ${
              selectedFormat === 'PDF'
                ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
            }`}
          >
            <span className="text-sm font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              PDF Document
            </span>
            <span className="text-xs text-slate-500 mt-0.5">Print-ready .pdf</span>
          </button>
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-1.5">
        <label htmlFor="template-select" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Formatting Template
        </label>
        <select
          id="template-select"
          value={selectedTemplateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Standard Academic (Default)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Citation Style */}
      <div className="space-y-1.5">
        <label htmlFor="citation-style-select" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Citation Standard
        </label>
        <select
          id="citation-style-select"
          value={citationStyle}
          onChange={(e) => onCitationStyleChange(e.target.value)}
          className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="apa-7th">APA 7th Edition (Author-Date)</option>
          <option value="ieee">IEEE Transactions (Numbered [1])</option>
          <option value="harvard">Harvard Cite Them Right</option>
          <option value="chicago-author-date">Chicago 17th (Author-Date)</option>
          <option value="vancouver">Vancouver / NLM (Numbered (1))</option>
          <option value="mla-9th">MLA 9th Edition (Author-Page)</option>
        </select>
      </div>

      {/* Layout & Typography Specs Summary */}
      {preview && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2 text-xs">
          <div className="font-semibold text-slate-800 flex items-center justify-between">
            <span>Physical Page Layout</span>
            <span className="font-mono text-[11px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
              {preview.layout.paper_size}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
            <div>
              <span className="text-slate-400 block">Primary Font:</span>
              <span className="font-medium text-slate-800">{preview.layout.primary_font} ({preview.layout.base_font_size_pt}pt)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Line Spacing:</span>
              <span className="font-medium text-slate-800">{preview.layout.line_spacing}x Double</span>
            </div>
            <div>
              <span className="text-slate-400 block">Binding Gutter:</span>
              <span className="font-medium text-slate-800">{preview.layout.binding_gutter_inches} in</span>
            </div>
            <div>
              <span className="text-slate-400 block">Pagination:</span>
              <span className="font-medium text-slate-800">Roman &rarr; Arabic</span>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Architecture Card */}
      <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-1.5 text-xs text-indigo-900">
        <div className="font-semibold flex items-center gap-1.5 text-indigo-950">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Dual Pagination Architecture
        </div>
        <p className="text-[11px] leading-relaxed text-indigo-800">
          <b>Front Matter:</b> Lowercase Roman (<span className="font-mono">i, ii, iii</span>) with Title page suppressed.<br/>
          <b>Main Body:</b> Arabic numerals (<span className="font-mono">1, 2, 3</span>) starting at Chapter 1.
        </p>
      </div>

      <div className="flex-1" />

      {/* Export Action Button & Progress */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        {isExporting && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-indigo-900">
              <span>{exportStatusMessage || 'Exporting document...'}</span>
              <span>{exportProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={isExporting}
          onClick={onInitiateExport}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition ${
            isExporting
              ? 'bg-indigo-300 text-white cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99]'
          }`}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating Artifact...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Document ({selectedFormat})
            </>
          )}
        </button>
      </div>
    </div>
  );
};

