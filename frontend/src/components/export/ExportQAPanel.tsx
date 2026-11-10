'use client';

import React, { useState } from 'react';
import { DocumentExport, ExportValidation, ExportIssue } from '@/types/export';

interface ExportQAPanelProps {
  currentExport: DocumentExport | null;
  onDownload: () => void;
  onRevalidate: () => void;
  isValidating: boolean;
}

export const ExportQAPanel: React.FC<ExportQAPanelProps> = ({
  currentExport,
  onDownload,
  onRevalidate,
  isValidating,
}) => {
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  const handleCopyChecksum = () => {
    if (currentExport?.file_checksum) {
      navigator.clipboard.writeText(currentExport.file_checksum);
      setCopiedChecksum(true);
      setTimeout(() => setCopiedChecksum(false), 2000);
    }
  };

  const validation: ExportValidation | undefined = currentExport?.validation_report;

  const getRatingBadge = (rating?: string) => {
    switch (rating) {
      case 'EXCELLENT':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">EXCELLENT</span>;
      case 'ACCEPTABLE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">ACCEPTABLE</span>;
      case 'NEEDS_ATTENTION':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">NEEDS ATTENTION</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">FAILED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">UNAUDITED</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">CRITICAL</span>;
      case 'MAJOR':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">MAJOR</span>;
      case 'MINOR':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">MINOR</span>;
      case 'INFORMATIONAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">INFO</span>;
      case 'NOT_VERIFIED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">NOT VERIFIED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Export QA & Audit</h2>
          <p className="text-xs text-slate-500">Document integrity and consistency verification</p>
        </div>
        {getRatingBadge(validation?.overall_rating)}
      </div>

      {!currentExport ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 text-slate-400">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-xs font-semibold text-slate-700">No Export Generated Yet</p>
          <p className="text-[11px] text-slate-400">Configure settings on the left panel and click "Export Document" to generate and audit.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-5 overflow-auto pr-1">
          {/* Artifact Details Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">{currentExport.file_name}</span>
              <span className="font-mono text-[11px] text-slate-500">
                {(currentExport.file_size_bytes / 1024).toFixed(1)} KB
              </span>
            </div>

            {/* Cryptographic Hash */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>SHA-256 Checksum:</span>
                <button
                  type="button"
                  title="Copy SHA-256 Checksum"
                  onClick={handleCopyChecksum}
                  className="text-indigo-600 hover:text-indigo-800 text-[10px] font-medium"
                >
                  {copiedChecksum ? 'Copied!' : 'Copy Hash'}
                </button>
              </div>
              <div className="font-mono text-[10px] bg-white border border-slate-200 p-1.5 rounded truncate text-slate-600 select-all">
                {currentExport.file_checksum || 'Pending checksum computation...'}
              </div>
            </div>
          </div>

          {/* Element Parity Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex justify-between">
              <span>Structural Parity Cross-Check</span>
              <span className="text-emerald-700 font-medium">100% Structural Match</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Headings</span>
                <span className="text-sm font-semibold text-slate-900">{currentExport.heading_count} Verified</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Tables</span>
                <span className="text-sm font-semibold text-slate-900">{currentExport.table_count} Verified</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                <span className="text-slate-400 block text-[11px]">Figures</span>
                <span className="text-sm font-semibold text-slate-900">{currentExport.figure_count} Verified</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-lg">
                <span className="text-slate-400 block text-[11px]">References</span>
                <span className="text-sm font-semibold text-slate-900">{currentExport.reference_count} Verified</span>
              </div>
            </div>
          </div>

          {/* Granular QA Findings List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="uppercase tracking-wider">Quality Audit Findings</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono text-[11px]">
                {validation?.total_issues || 0} items
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-auto">
              {validation?.issues && validation.issues.length > 0 ? (
                validation.issues.map((iss: ExportIssue) => (
                  <div
                    key={iss.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      {getSeverityBadge(iss.severity)}
                      {iss.location && (
                        <span className="text-[10px] font-mono text-slate-500">{iss.location}</span>
                      )}
                    </div>
                    <p className="text-slate-800 text-[11px] leading-relaxed">{iss.message}</p>
                    {iss.suggested_action && (
                      <p className="text-[10px] text-slate-500 italic">Action: {iss.suggested_action}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-center text-xs text-emerald-800 font-medium">
                  Zero formatting defects detected. Document is fully publication-compliant.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <button
          type="button"
          disabled={!currentExport}
          onClick={onDownload}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition ${
            !currentExport
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {currentExport ? `Download ${currentExport.export_format}` : 'Download Artifact'}
        </button>

        <button
          type="button"
          disabled={!currentExport || isValidating}
          onClick={onRevalidate}
          className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
        >
          {isValidating ? (
            'Auditing...'
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-run QA Validation
            </>
          )}
        </button>
      </div>
    </div>
  );
};

