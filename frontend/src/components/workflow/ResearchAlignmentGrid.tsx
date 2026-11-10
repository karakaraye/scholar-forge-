'use client';

import React, { useState, useEffect } from 'react';
import { ResearchAlignmentMatrix, AlignmentIssue } from '@/types/project';
import { alignmentApi } from '@/lib/api';
import {
  Network,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  GitCommit,
  ShieldAlert,
} from 'lucide-react';

interface ResearchAlignmentGridProps {
  projectId: string;
}

const NODES_ORDER = [
  'Problem Statement',
  'Research Aim',
  'Objectives',
  'Research Questions',
  'Hypotheses',
  'Variables',
  'Theoretical Framework',
  'Methodology',
  'Instruments',
  'Datasets',
  'Statistical Tests',
  'Results',
  'Conclusions',
];

export default function ResearchAlignmentGrid({ projectId }: ResearchAlignmentGridProps) {
  const [matrix, setMatrix] = useState<ResearchAlignmentMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatrix = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alignmentApi.get(projectId);
      setMatrix(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alignment matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [projectId]);

  const getSeverityBadge = (severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION') => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Critical Misalignment
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            Suggestion
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-800 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Calculating 13-Node Research Alignment Matrix...</p>
      </div>
    );
  }

  if (error || !matrix) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-900">{error || 'Alignment matrix unavailable.'}</p>
        <button
          onClick={fetchMatrix}
          className="mt-4 px-4 py-2 bg-navy-900 text-white text-xs font-bold rounded-lg hover:bg-navy-800 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alignment Header & Score Gauge */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-navy-50 text-navy-900 rounded-xl">
              <Network className="w-5 h-5 text-gold-500" />
            </span>
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900">
                13-Node Research Alignment Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Verifies methodological congruence from Problem Statement to Empirical Conclusions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchMatrix}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recalculate
            </button>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Congruence Index
              </span>
              <span
                className={`text-2xl font-black font-mono ${
                  matrix.alignment_score >= 80
                    ? 'text-emerald-700'
                    : matrix.alignment_score >= 60
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {matrix.alignment_score}%
              </span>
            </div>
          </div>
        </div>

        {/* 13-Node Visual Pipeline */}
        <div className="mt-6 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {NODES_ORDER.map((nodeName, idx) => (
              <React.Fragment key={nodeName}>
                <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-center shadow-xs">
                  <span className="block text-[9px] font-mono text-slate-400 font-bold uppercase">
                    Node {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-navy-950 whitespace-nowrap">
                    {nodeName}
                  </span>
                </div>
                {idx < NODES_ORDER.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Alignment Issues & Remediation List */}
      <div className="space-y-4">
        {(() => {
          const issuesList = Array.isArray(matrix?.issues) ? matrix.issues : [];
          return (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-navy-800" />
                  Detected Methodological Issues ({issuesList.length})
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {matrix?.unresolved_count ?? issuesList.length} unresolved items
                </span>
              </div>

              {issuesList.length === 0 ? (
                <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-900">Full Methodological Congruence Achieved</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    All objectives, research questions, variables, and empirical tests are aligned without orphans or untested constructs.
                  </p>
                </div>
              ) : (
                issuesList.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                          {getSeverityBadge(issue.severity)}
                          <span className="text-xs font-mono font-semibold text-slate-500">
                            [{issue.node_source}] <ArrowRight className="inline w-3 h-3 text-slate-400" /> [{issue.node_target}]
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-relaxed">
                          {issue.description}
                        </p>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                          <span className="font-bold text-navy-900 block mb-0.5">Academic Remediation:</span>
                          {issue.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
