'use client';

import React, { useState, useEffect } from 'react';
import { ResearchDecision, DecisionType } from '@/types/project';
import { planningApi } from '@/lib/api';
import {
  FileQuestion,
  CheckCircle,
  Plus,
  ShieldCheck,
  Calendar,
  UserCheck,
  AlertCircle,
  Loader2,
  BookmarkCheck,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ResearchPlanningWorkspaceProps {
  projectId: string;
}

const DECISION_CATEGORIES: { type: DecisionType; label: string; desc: string }[] = [
  { type: 'PROBLEM_STATEMENT', label: 'Problem Statement', desc: 'Core academic gap or empirical discrepancy.' },
  { type: 'RESEARCH_AIM', label: 'Research Aim', desc: 'Primary overarching purpose of the investigation.' },
  { type: 'RESEARCH_OBJECTIVE', label: 'Research Objective', desc: 'Specific operationalized goal.' },
  { type: 'RESEARCH_QUESTION', label: 'Research Question', desc: 'Inquiry formulated to address objectives.' },
  { type: 'HYPOTHESIS', label: 'Statistical Hypothesis', desc: 'Testable null / alternative proposition.' },
  { type: 'VARIABLE', label: 'Variable Definition', desc: 'Independent, dependent, or moderating construct.' },
  { type: 'SCOPE_BOUNDARY', label: 'Scope Boundary', desc: 'Delimitation of institutional, temporal, or geographic focus.' },
  { type: 'LIMITATION', label: 'Methodological Limitation', desc: 'Known boundary condition or constraint.' },
];

export default function ResearchPlanningWorkspace({ projectId }: ResearchPlanningWorkspaceProps) {
  const [decisions, setDecisions] = useState<ResearchDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Decision Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<DecisionType>('RESEARCH_OBJECTIVE');
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [rationalization, setRationalization] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await planningApi.list(projectId);
      let items: ResearchDecision[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && typeof data === 'object') {
        const rawDec = data as any;
        if (Array.isArray(rawDec.audit_trail) && rawDec.audit_trail.length > 0) {
          items = rawDec.audit_trail
            .filter((t: any) => t.action === 'DECISION_RECORDED' || t.title)
            .map((t: any, idx: number) => ({
              id: t.id || `${rawDec.id}-${idx}`,
              project: projectId,
              decision_type: t.category || t.decision_type || 'RESEARCH_OBJECTIVE',
              title: t.title || 'Research Decision',
              statement: t.impact || t.statement || '',
              rationalization: t.rationale || t.rationalization || '',
              is_approved: rawDec.is_approved || false,
              approved_by_name: rawDec.approved_by_email || 'Project Lead',
              approved_at: rawDec.approved_at,
              order_index: idx,
              created_at: t.timestamp || rawDec.created_at,
              updated_at: rawDec.updated_at,
            }));
        }
      }
      setDecisions(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load research decisions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, [projectId]);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !statement.trim()) return;

    setSubmitting(true);
    try {
      const newDec = await planningApi.create(projectId, {
        decision_type: selectedType,
        title: title.trim(),
        statement: statement.trim(),
        rationalization: rationalization.trim(),
      });
      setDecisions((prev) => [...(Array.isArray(prev) ? prev : []), newDec]);
      setTitle('');
      setStatement('');
      setRationalization('');
      setShowAddForm(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save research decision');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    setApprovingId(decisionId);
    try {
      const approvedDec = await planningApi.approve(projectId);
      setDecisions((prev) =>
        (Array.isArray(prev) ? prev : []).map((d) => ({
          ...d,
          is_approved: true,
          approved_by_name: (approvedDec as any)?.approved_by_email || 'Project Lead',
          approved_at: (approvedDec as any)?.approved_at || new Date().toISOString(),
        }))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve decision');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-800 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Structured Planning Assistant...</p>
      </div>
    );
  }

  const safeDecisions = Array.isArray(decisions) ? decisions : [];
  const approvedCount = safeDecisions.filter((d) => d?.is_approved).length;

  return (
    <div className="space-y-6">
      {/* Overview & Governance Gate Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-navy-50 text-navy-900 rounded-xl">
              <BookmarkCheck className="w-5 h-5 text-gold-500" />
            </span>
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900">
                Structured Research Planning & Governance Gate
              </h2>
              <p className="text-xs text-slate-500">
                Formal decision audit trail requiring explicit human approval prior to manuscript locking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              Approved:{' '}
              <span className="font-bold text-navy-950 font-mono">
                {approvedCount} / {decisions.length}
              </span>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3.5 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Decision</span>
            </button>
          </div>
        </div>

        {/* Add Decision Form */}
        {showAddForm && (
          <form onSubmit={handleCreateDecision} className="mt-5 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-navy-800" />
              Record New Formal Research Decision
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Decision Category
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as DecisionType)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
                >
                  {DECISION_CATEGORIES.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label} ({c.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Title / Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Objective 1 or Null Hypothesis H01"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Formal Statement / Formulation
              </label>
              <textarea
                rows={3}
                placeholder="State the rigorous academic proposition..."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Methodological Rationale / Theoretical Grounding
              </label>
              <input
                type="text"
                placeholder="Why is this formulation academically necessary? (e.g. Grounded in Solow Growth Model)"
                value={rationalization}
                onChange={(e) => setRationalization(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-lg hover:bg-navy-800 transition flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Decision
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {safeDecisions.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center">
            <FileQuestion className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No Research Decisions Recorded Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Start by formulating your problem statement, research aim, objectives, and testable hypotheses.
            </p>
          </div>
        ) : (
          safeDecisions.map((decision) => (
            <div
              key={decision.id}
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white shadow-sm ${
                decision.is_approved
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-navy-900 text-white font-mono">
                      {(decision.decision_type || 'RESEARCH_OBJECTIVE').replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{decision.title}</h3>
                    {decision.is_approved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Pending Approval Gate
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {decision.statement}
                  </p>

                  {decision.rationalization && (
                    <p className="text-xs text-slate-500 italic">
                      <span className="font-semibold text-slate-600 not-italic">Rationale:</span>{' '}
                      {decision.rationalization}
                    </p>
                  )}

                  {decision.is_approved && (
                    <div className="flex items-center gap-4 text-[11px] text-emerald-700 font-medium pt-1">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        Approved by {decision.approved_by_name || 'Project Lead'}
                      </span>
                      {decision.approved_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(decision.approved_at)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {!decision.is_approved && (
                  <button
                    type="button"
                    disabled={approvingId === decision.id}
                    onClick={() => handleApproveDecision(decision.id)}
                    className="px-3.5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition flex items-center gap-1.5 self-end md:self-start shadow-sm"
                  >
                    {approvingId === decision.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>Approve Decision</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
