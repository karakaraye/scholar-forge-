'use client';

import React, { useState, useEffect } from 'react';
import { ManuscriptValidation, ValidationIssue } from '@/types/project';
import { qaApi } from '@/lib/api';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Award,
  BookOpen,
  Scale,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface QualityAssuranceDashboardProps {
  projectId: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  STRUCTURAL_QUALITY: { label: 'Structural Quality', icon: BookOpen },
  RESEARCH_CONSISTENCY: { label: 'Research Consistency', icon: Scale },
  CITATION_INTEGRITY: { label: 'Citation Integrity', icon: ShieldCheck },
  EVIDENCE_VALIDITY: { label: 'Evidence Validity', icon: FileCheck },
  WRITING_QUALITY: { label: 'Writing Quality', icon: Sparkles },
  MANUSCRIPT_COMPLETENESS: { label: 'Manuscript Completeness', icon: Award },
};

export default function QualityAssuranceDashboard({ projectId }: QualityAssuranceDashboardProps) {
  const [validation, setValidation] = useState<ManuscriptValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');

  const fetchValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await qaApi.get(projectId);
      setValidation(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quality assurance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidation();
  }, [projectId]);

  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const freshData = await qaApi.audit(projectId);
      setValidation(freshData);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setAuditing(false);
    }
  };

  const getReadinessBadge = (rating: string) => {
    switch (rating) {
      case 'EXEMPLARY':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            Exemplary Manuscript
          </span>
        );
      case 'SUBMISSION_READY':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
            Submission Ready
          </span>
        );
      case 'NEEDS_REVISION':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            Revisions Required
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
            Not Ready for Submission
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Critical Issue
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800">
            <Info className="w-3 h-3 text-blue-600" />
            Formative Info
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-800 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Running Academic Quality Assurance Audit...</p>
      </div>
    );
  }

  const issuesList = validation?.issues || [];
  const filteredIssues = issuesList.filter((iss) =>
    selectedSeverity === 'ALL' ? true : iss.severity === selectedSeverity
  );

  return (
    <div className="space-y-6">
      {/* QA Header & Readiness Score */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-navy-50 text-navy-900 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-gold-500" />
            </span>
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900">
                Academic Quality Assurance & Readiness Index
              </h2>
              <p className="text-xs text-slate-500">
                Automated multi-category audit of structural integrity, citations, and empirical rigor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={auditing}
              onClick={handleRunAudit}
              className="px-3.5 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition flex items-center gap-1.5 shadow-sm"
            >
              {auditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Run Quality Audit</span>
            </button>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Readiness Score
              </span>
              <span
                className={`text-2xl font-black font-mono ${(validation?.overall_score ?? 0) >= 80
                    ? 'text-emerald-700'
                    : (validation?.overall_score ?? 0) >= 60
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
              >
                {validation?.overall_score ?? 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Readiness Pill & Summary Stats */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {validation && getReadinessBadge(validation.readiness_rating)}
            <span className="text-xs text-slate-500">
              Audited {validation?.created_at ? formatDate(validation.created_at) : 'Recently'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
              {validation?.error_count ?? 0} Critical
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200">
              {validation?.warning_count ?? 0} Warnings
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
              {validation?.info_count ?? 0} Info
            </span>
          </div>
        </div>

        {/* 6-Category Scores Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => {
            const Icon = info.icon;
            const score =
              validation?.category_scores?.[catKey] ??
              validation?.category_scores?.[catKey.toLowerCase()] ??
              100;

            return (
              <div key={catKey} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-navy-800" />
                    {info.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-navy-950">{score}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Academic Non-Guarantee Disclaimer */}
        <div className="mt-5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Academic Disclaimer:</strong>{' '}
            {validation?.disclaimer ||
              'ScholarForge AI provides formative evaluation and does not guarantee journal publication or institutional grading acceptance.'}
          </p>
        </div>
      </div>

      {/* Filterable Issues List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-navy-800" />
            Audit Findings & Revision Advice ({filteredIssues.length})
          </h3>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['ALL', 'ERROR', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${selectedSeverity === sev
                    ? 'bg-white text-navy-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {sev === 'ALL' ? 'All Findings' : sev}
              </button>
            ))}
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Issues Detected</p>
            <p className="text-xs text-slate-500 mt-1">
              Your manuscript conforms to the evaluated quality criteria for this filter.
            </p>
          </div>
        ) : (
          filteredIssues.map((iss) => (
            <div
              key={iss.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(iss.severity)}
                    <span className="text-xs font-mono font-semibold text-slate-500 uppercase">
                      {(iss.category || 'STRUCTURAL_QUALITY').replace(/_/g, ' ')}
                    </span>
                  </div>
                  {iss.section_name && (
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {iss.section_name}
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  {iss.message}
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <strong className="text-navy-900 block mb-0.5">Academic Revision Advice:</strong>
                  {iss.academic_suggestion}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
