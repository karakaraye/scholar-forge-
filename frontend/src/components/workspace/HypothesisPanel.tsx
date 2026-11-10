'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ResearchProject, HypothesisTest, StatisticalResult } from '@/types/project';
import { statisticsApi } from '@/lib/api';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Loader2,
  Plus
} from 'lucide-react';

interface HypothesisPanelProps {
  project: ResearchProject;
  onInsertContent?: (html: string) => void;
  onRefreshConsistency?: () => void;
}

export default function HypothesisPanel({ project, onInsertContent, onRefreshConsistency }: HypothesisPanelProps) {
  const [tests, setTests] = useState<HypothesisTest[]>([]);
  const [results, setResults] = useState<StatisticalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // New Evaluation Form
  const [statement, setStatement] = useState('');
  const [selectedResultId, setSelectedResultId] = useState('');
  const [hypoType, setHypoType] = useState('DIRECTIONAL');

  // Load project hypotheses tests and available statistical results
  const loadHypothesisData = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [hList, rList] = await Promise.all([
        statisticsApi.listHypothesisTests(project.id),
        statisticsApi.listResults(project.id),
      ]);
      setTests(hList);
      setResults(rList);
      if (rList.length > 0 && !selectedResultId) {
        setSelectedResultId(rList[0].id);
      }
    } catch (err) {
      console.error('Failed to load hypothesis tests:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id, selectedResultId]);

  useEffect(() => {
    loadHypothesisData();
  }, [loadHypothesisData]);

  // Evaluate Hypothesis
  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !statement.trim() || !selectedResultId) return;

    setEvaluating(true);
    try {
      const evaluated = await statisticsApi.evaluateHypothesis(project.id, {
        hypothesis_statement: statement.trim(),
        statistical_result_id: selectedResultId,
        hypothesis_type: hypoType,
      });

      setTests(prev => [evaluated, ...prev]);
      setStatement('');
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hypothesis evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  // Insert Hypothesis Finding into Manuscript
  const handleInsertFinding = (test: HypothesisTest) => {
    if (!onInsertContent) return;

    const badgeColor = test.decision === 'REJECT_NULL' ? '#047857' : '#b45309';
    const badgeText = test.decision === 'REJECT_NULL' ? 'Hypothesis Supported (Reject H₀)' : 'Hypothesis Not Supported (Fail to Reject H₀)';

    const html = `
      <div class="hypothesis-finding my-5 p-4 border border-slate-200 rounded-xl bg-slate-50">
        <div class="flex items-center gap-2 mb-2">
          <strong class="text-xs uppercase font-mono tracking-wider" style="color: ${badgeColor};">
            ${badgeText}
          </strong>
        </div>
        <p class="font-serif text-sm font-bold text-slate-900 mb-2">
          ${test.hypothesis_statement}
        </p>
        <p class="text-xs font-mono text-slate-700 mb-2">
          <strong>Statistical Test:</strong> ${test.apa_format_string || `Statistic = ${test.test_statistic_value}, p = ${test.p_value}`}
        </p>
        <p class="text-xs font-serif text-slate-800 leading-relaxed italic">
          ${test.substantive_interpretation || ''}
        </p>
      </div>
    `;

    onInsertContent(html);
    alert('Hypothesis testing evaluation inserted into manuscript!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">Hypothesis Testing & Empirical Decisions</h2>
              <p className="text-xs text-slate-500 mt-1">
                Formal mapping of research hypotheses to computed statistical tests. Strictly applies alpha criteria
                (α = .05) with decision rules (Reject H₀ vs Fail to Reject H₀) and non-causal substantive interpretations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Evaluation Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleEvaluate} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Evaluate Research Hypothesis</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-50 text-navy-800 font-bold">
                Alpha = .05
              </span>
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Hypothesis Statement (H₁ or H₀)
              </label>
              <textarea
                placeholder="e.g. There is a significant positive relationship between teacher digital literacy and classroom student engagement."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Mapped Empirical Statistical Result
              </label>
              <select
                value={selectedResultId}
                onChange={(e) => setSelectedResultId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                required
              >
                <option value="">Select Computed Statistical Test...</option>
                {results.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.label || (r.analysis_type || r.test_type || 'Statistical Output').replace(/_/g, ' ')} (N = {r.sample_size})
                  </option>
                ))}
              </select>
              {results.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  No statistical calculations available. Run a test in &ldquo;Statistical Analysis&rdquo; first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Hypothesis Direction
              </label>
              <select
                value={hypoType}
                onChange={(e) => setHypoType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
              >
                <option value="DIRECTIONAL">Directional (One-tailed expectation)</option>
                <option value="NON_DIRECTIONAL">Non-Directional (Two-tailed difference/association)</option>
                <option value="NULL">Null Hypothesis (No effect / No difference)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={evaluating || !statement.trim() || !selectedResultId}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {evaluating ? <Loader2 className="w-4 h-4 animate-spin text-gold-400" /> : <Sparkles className="w-4 h-4 text-gold-400" />}
              <span>{evaluating ? 'Evaluating Formal Decision...' : 'Evaluate Hypothesis'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Evaluated Decisions & Findings (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Evaluated Hypotheses & Decisions</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {tests.length} Total
              </span>
            </h3>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading hypothesis evaluations...</div>
            ) : tests.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No hypotheses evaluated yet.</p>
                <p className="text-[11px] text-slate-400">
                  Select a hypothesis and map it to an empirical statistical result on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tests.map((t, idx) => {
                  const isSupported = t.decision === 'REJECT_NULL';
                  return (
                    <div
                      key={t.id || idx}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isSupported
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-amber-200 bg-amber-50/40'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                            isSupported
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {isSupported ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {isSupported ? 'Supported (Reject H₀)' : 'Not Supported (Fail to Reject H₀)'}
                        </span>

                        <span className="text-[10px] font-mono text-slate-500 font-bold">
                          {t.test_type}
                        </span>
                      </div>

                      {/* Statement */}
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {t.hypothesis_statement}
                        </p>
                      </div>

                      {/* Statistical Metric Line */}
                      <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 font-mono text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {t.apa_format_string || `Statistic = ${t.test_statistic_value}, p = ${t.p_value}`}
                        </span>
                        {t.effect_size_value !== undefined && (
                          <span className="text-[10px] font-bold text-navy-900">
                            Effect Size = {Number(t.effect_size_value).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Substantive Interpretation */}
                      {t.substantive_interpretation && (
                        <div className="text-xs text-slate-600 italic leading-relaxed pt-1">
                          &ldquo;{t.substantive_interpretation}&rdquo;
                        </div>
                      )}

                      {/* Insert Button */}
                      {onInsertContent && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleInsertFinding(t)}
                            className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5 text-navy-900" />
                            <span>Insert Finding into Manuscript</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
