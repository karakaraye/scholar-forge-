'use client';

import React, { useState, useEffect } from 'react';
import {
  FormattingValidation,
  FormattingIssue,
  AutoformatPreviewResult,
  AutoformatApplyResult,
  IssueSeverity,
  RuleCategory,
} from '@/types/formatting';
import { complianceApi, autoformatApi } from '@/lib/api';

interface ComplianceAuditPanelProps {
  projectId: string;
  onAutoformatApplied?: () => void;
}

export const ComplianceAuditPanel: React.FC<ComplianceAuditPanelProps> = ({
  projectId,
  onAutoformatApplied,
}) => {
  const [validation, setValidation] = useState<FormattingValidation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [auditing, setAuditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Autoformat preview modal state
  const [previewData, setPreviewData] = useState<AutoformatPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [applyingAutoformat, setApplyingAutoformat] = useState<boolean>(false);
  const [applyResult, setApplyResult] = useState<AutoformatApplyResult | null>(null);
  const [rollingBack, setRollingBack] = useState<boolean>(false);
  const [rollbackSuccess, setRollbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCompliance();
  }, [projectId]);

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const res = await complianceApi.getCompliance(projectId);
      setValidation(res);
    } catch (err: any) {
      // May not have run audit yet
      setValidation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setAuditing(true);
    setError(null);
    try {
      const res = await complianceApi.runComplianceAudit(projectId);
      setValidation(res);
    } catch (err: any) {
      setError(err.message || 'Audit execution failed');
    } finally {
      setAuditing(false);
    }
  };

  const handleOpenAutoformatPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const res = await autoformatApi.previewAutoformat(projectId);
      setPreviewData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load auto-formatting preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApplyAutoformat = async () => {
    setApplyingAutoformat(true);
    try {
      const res = await autoformatApi.applyAutoformat(projectId);
      setApplyResult(res);
      setPreviewData(null);
      // Re-run compliance audit after formatting
      await handleRunAudit();
      if (onAutoformatApplied) onAutoformatApplied();
    } catch (err: any) {
      setError(err.message || 'Failed to apply auto-formatting');
    } finally {
      setApplyingAutoformat(false);
    }
  };

  const handleRollback = async (snapshotId: string) => {
    setRollingBack(true);
    try {
      const res = await autoformatApi.rollbackAutoformat(projectId, snapshotId);
      setRollbackSuccess(res.message);
      setApplyResult(null);
      await handleRunAudit();
      if (onAutoformatApplied) onAutoformatApplied();
    } catch (err: any) {
      setError(err.message || 'Rollback failed');
    } finally {
      setRollingBack(false);
    }
  };

  const issues = validation?.issues || [];
  const filteredIssues = issues.filter((issue) => {
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && issue.rule_category !== categoryFilter) return false;
    return true;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'NEEDS_CORRECTION':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'NON_COMPLIANT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getSeverityBadge = (sev: IssueSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MAJOR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MINOR':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INFORMATIONAL':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>🛡️</span> Manuscript Compliance Intelligence
          </h3>
          <p className="text-xs text-slate-500">
            Deterministic audit against university guidelines and journal publication criteria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAudit}
            disabled={auditing}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {auditing ? 'Auditing Rules...' : '🔍 Run Compliance Check'}
          </button>
          <button
            onClick={handleOpenAutoformatPreview}
            disabled={loadingPreview}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {loadingPreview ? 'Analyzing...' : '✨ Safe Auto-Format'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {applyResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div>
            <strong>Formatting Applied:</strong> {applyResult.message} (Version #{applyResult.snapshot_version_number})
          </div>
          <button
            onClick={() => handleRollback(String(applyResult.snapshot_version_number))}
            disabled={rollingBack}
            className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-medium rounded shadow-2xs"
          >
            {rollingBack ? 'Reverting...' : '↩️ Rollback Formatting'}
          </button>
        </div>
      )}

      {rollbackSuccess && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          {rollbackSuccess}
        </div>
      )}

      {/* Compliance Overview Cards */}
      {validation && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className={`p-3 rounded-lg border flex flex-col justify-center items-center text-center ${getStatusColor(validation.overall_status)}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
            <span className="text-sm font-extrabold mt-0.5">{validation.overall_status.replace('_', ' ')}</span>
          </div>

          <div className="p-3 rounded-lg border border-red-200 bg-red-50 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Critical</span>
            <span className="text-lg font-bold text-red-700">{validation.critical_count}</span>
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Major</span>
            <span className="text-lg font-bold text-amber-700">{validation.major_count}</span>
          </div>

          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Minor</span>
            <span className="text-lg font-bold text-blue-700">{validation.minor_count}</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notice</span>
            <span className="text-lg font-bold text-slate-700">{validation.info_count}</span>
          </div>
        </div>
      )}

      {/* Layout Transparency Banner */}
      <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span>ℹ️</span> Web preview layout is <strong className="text-slate-800">NOT_VERIFIED</strong> for exact physical page breaks.
        </span>
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
          Physical Layout: Measured on PDF/DOCX Export
        </span>
      </div>

      {/* Issues Filter & Table */}
      {validation && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-700">
              Audit Findings ({filteredIssues.length} of {validation.total_issues})
            </h4>

            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
                <option value="INFORMATIONAL">Informational</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="PAGE_SETTINGS">Page Settings</option>
                <option value="TYPOGRAPHY">Typography</option>
                <option value="CHAPTER_STRUCTURE">Chapter Structure</option>
                <option value="TABLES_FIGURES">Tables & Figures</option>
                <option value="CITATIONS_REFERENCES">Citations</option>
                <option value="WORD_LIMITS">Word Limits</option>
                <option value="METADATA">Metadata</option>
              </select>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-lg">
              No issues match the selected filter criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {issue.rule_key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        [{issue.rule_category}]
                      </span>
                    </div>
                    {issue.fix_available && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                        ✨ Auto-fixable
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">{issue.suggested_fix}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-500 bg-slate-50 p-2 rounded">
                    <div>
                      <strong className="text-slate-700">Location:</strong> {issue.location}
                    </div>
                    <div>
                      <strong className="text-slate-700">Current:</strong> {issue.current_value}
                    </div>
                    <div>
                      <strong className="text-slate-700">Expected:</strong> {issue.expected_value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Autoformat Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>✨</span> Safe Auto-Format Preview
                </h4>
                <p className="text-xs text-slate-500">
                  {previewData.total_proposed_changes} formatting adjustments across{' '}
                  {previewData.sections_needing_formatting} sections.
                </p>
              </div>
              <button
                onClick={() => setPreviewData(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-900 flex items-center gap-2">
              <span>🛡️</span>
              <div>
                ScholarForge will create an immutable <strong className="font-semibold">DocumentVersion snapshot</strong> before applying changes. You can roll back anytime with one click.
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {previewData.proposed_changes.map((prop) => (
                <div key={prop.section_id} className="p-3 border rounded-lg bg-slate-50 space-y-2">
                  <h5 className="font-semibold text-xs text-slate-800">
                    {prop.section_title} (Order: {prop.order_index})
                  </h5>
                  <div className="space-y-1.5">
                    {prop.changes.map((ch, idx) => (
                      <div key={idx} className="text-xs bg-white p-2 rounded border border-slate-200">
                        <div className="font-medium text-slate-700">{ch.description}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-[11px]">
                          <div className="text-red-700 bg-red-50 p-1 rounded font-mono truncate">
                            - {ch.before}
                          </div>
                          <div className="text-emerald-700 bg-emerald-50 p-1 rounded font-mono truncate">
                            + {ch.after}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setPreviewData(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAutoformat}
                disabled={applyingAutoformat}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
              >
                {applyingAutoformat ? 'Applying Changes...' : 'Accept & Apply Format'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

