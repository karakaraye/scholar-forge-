'use client';

import React, { useState, useEffect } from 'react';
import { CitationAuditReport, CitationAuditDiagnostic } from '@/types/project';
import { citationsApi } from '@/lib/api';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
  FileText,
  RefreshCw,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface CitationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSyncBibliography?: () => void;
}

export default function CitationAuditModal({
  isOpen,
  onClose,
  projectId,
  onSyncBibliography,
}: CitationAuditModalProps) {
  const [report, setReport] = useState<CitationAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await citationsApi.runAudit(projectId);
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to run citation audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      runAudit();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>CRITICAL</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>WARNING</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-blue-600" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gold-600" />
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Manuscript Citation Integrity Audit
              </h3>
              <p className="text-[11px] text-slate-500">
                Automated detection of unlinked citations, ghost references, and retracted studies.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-gold-500" />
              <p className="font-semibold text-slate-700">Auditing manuscript references...</p>
              <p className="text-[11px] text-slate-400">
                Cross-checking in-text citation spans against bibliography and retraction databases.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* Score Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${getScoreColor(
                  report.integrity_score
                )}`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono">{report.integrity_score}%</span>
                    <span className="font-bold text-xs uppercase tracking-wider">Citation Integrity Score</span>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {report.integrity_score >= 80
                      ? 'High integrity. Manuscript citations align with verified sources.'
                      : report.integrity_score >= 60
                      ? 'Moderate integrity. Some citations or bibliography items require reconciliation.'
                      : 'Attention needed. Missing bibliography entries or unlinked citations detected.'}
                  </p>
                </div>

                <button
                  onClick={runAudit}
                  className="p-2 rounded-lg bg-white/60 hover:bg-white text-slate-800 transition text-xs flex items-center gap-1 shadow-sm"
                  title="Re-run Integrity Audit"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Re-Audit</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-base font-bold text-slate-900 font-mono">
                    {report.total_citations ?? (report.total_in_text_citations + report.total_bibliography_entries)}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Citations</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-base font-bold text-slate-900 font-mono">
                    {report.in_text_count ?? report.total_in_text_citations}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">In-Text Spans</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-base font-bold text-slate-900 font-mono">
                    {report.bibliography_count ?? report.total_bibliography_entries}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Bibliography</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="block text-base font-bold text-rose-700 font-mono">
                    {report.discrepancies_count ?? (report.missing_bibliography_count + report.uncited_bibliography_count + report.retracted_count)}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Issues Found</span>
                </div>
              </div>

              {/* Diagnostics List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Diagnostic Findings ({report.diagnostics.length})
                </h4>

                {report.diagnostics.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800">
                    <CheckCircle className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                    <p className="font-bold">Zero Citation Discrepancies</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      All in-text citations correspond to active bibliography entries with verified metadata.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {report.diagnostics.map((diag: CitationAuditDiagnostic, idx: number) => {
                      const issueName = diag.issue_type || diag.issue || 'Issue';
                      const messageText = diag.message || diag.issue || '';
                      const suggestionText = diag.suggestion || diag.suggested_correction || '';

                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{issueName.replace(/_/g, ' ')}</span>
                            {getSeverityBadge(diag.severity)}
                          </div>
                          <p className="text-slate-600 text-[11px]">{messageText}</p>
                          {suggestionText && (
                            <p className="text-navy-800 font-medium text-[11px] bg-slate-50 p-1.5 rounded">
                              <span className="font-bold">Suggestion: </span>
                              {suggestionText}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="text-[11px] text-slate-400">
            Automated verification via Crossref & OpenAlex
          </div>

          <div className="flex items-center gap-2">
            {onSyncBibliography && (
              <button
                onClick={() => {
                  onSyncBibliography();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs transition shadow-sm"
              >
                Sync Bibliography
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
