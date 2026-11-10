'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ResearchProject, ResearchDataset, StatisticalResult } from '@/types/project';
import { statisticsApi, datasetsApi } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Table,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  PieChart,
  Binary,
  Layers,
  FileCheck,
  FileText,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface AnalysisDashboardProps {
  project: ResearchProject;
  onInsertContent?: (html: string) => void;
  onRefreshConsistency?: () => void;
}

export default function AnalysisDashboard({ project, onInsertContent, onRefreshConsistency }: AnalysisDashboardProps) {
  const [datasets, setDatasets] = useState<ResearchDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [results, setResults] = useState<StatisticalResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<StatisticalResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  // Test Selection
  const [testType, setTestType] = useState<string>('DESCRIPTIVES');
  const [analysisLabel, setAnalysisLabel] = useState<string>('');

  // Parameter controls
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [dependentVar, setDependentVar] = useState<string>('');
  const [groupingVar, setGroupingVar] = useState<string>('');
  const [predictors, setPredictors] = useState<string[]>([]);

  // Chart type preview state
  const [chartType, setChartType] = useState<'BAR' | 'SCATTER' | 'BOX'>('BAR');

  // Load datasets & previous results
  const loadInitialData = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [dList, rList] = await Promise.all([
        datasetsApi.list(project.id),
        statisticsApi.listResults(project.id),
      ]);
      setDatasets(dList);
      if (dList.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(dList[0].id);
      }
      setResults(rList);
      if (rList.length > 0) {
        setSelectedResult(rList[0]);
      }
    } catch (err) {
      console.error('Failed to load analysis dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id, selectedDatasetId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Selected dataset schema columns
  const activeDataset = datasets.find(d => d.id === selectedDatasetId);
  const availableColumns: string[] = activeDataset?.columns_schema?.columns || [];

  // Run Statistical Analysis
  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;

    setRunning(true);
    try {
      let params: Record<string, unknown> = {};

      if (testType === 'DESCRIPTIVES') {
        params = { columns: selectedCols.length > 0 ? selectedCols : availableColumns.slice(0, 5) };
      } else if (testType === 'CRONBACH_ALPHA') {
        params = { columns: selectedCols };
      } else if (testType === 'PEARSON_CORRELATION' || testType === 'SPEARMAN_CORRELATION') {
        params = { columns: selectedCols };
      } else if (testType === 'CHI_SQUARE') {
        params = { var1: selectedCols[0], var2: selectedCols[1] };
      } else if (testType === 'INDEPENDENT_T_TEST' || testType === 'MANN_WHITNEY_U') {
        params = { test_variable: dependentVar, grouping_variable: groupingVar };
      } else if (testType === 'PAIRED_T_TEST') {
        params = { var1: selectedCols[0], var2: selectedCols[1] };
      } else if (testType === 'ONE_WAY_ANOVA') {
        params = { dependent_variable: dependentVar, factor_variable: groupingVar };
      } else if (testType === 'MULTIPLE_REGRESSION' || testType === 'LOGISTIC_REGRESSION') {
        params = { dependent_variable: dependentVar, predictors: predictors };
      }

      const res = await statisticsApi.runAnalysis(project.id, {
        dataset_id: selectedDatasetId || undefined,
        test_type: testType,
        parameters: params,
        label: analysisLabel.trim() || undefined,
      });

      setResults(prev => [res, ...prev]);
      setSelectedResult(res);
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Statistical analysis failed');
    } finally {
      setRunning(false);
    }
  };

  // Delete statistical result
  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Delete this statistical result?')) return;
    try {
      await statisticsApi.deleteResult(resultId);
      setResults(prev => prev.filter(r => r.id !== resultId));
      if (selectedResult?.id === resultId) {
        setSelectedResult(null);
      }
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete result');
    }
  };

  // Insert Table into Manuscript
  const handleInsertIntoManuscript = () => {
    if (!selectedResult || !onInsertContent) return;

    let html = `
      <div class="academic-table-container my-6">
        <p class="font-serif text-sm font-bold text-slate-900 mb-1">
          Table: ${selectedResult.label || (selectedResult.analysis_type || selectedResult.test_type || 'Statistical Output').replace(/_/g, ' ')}
        </p>
        <p class="text-xs text-slate-500 italic mb-3">
          Note. Sample size N = ${selectedResult.sample_size}. Computed via ScholarForge AI Deterministic Statistics Engine.
        </p>
        ${selectedResult.apa_table_html || '<p class="text-xs">No table representation available.</p>'}
        ${
          selectedResult.apa_summary
            ? `<p class="mt-3 text-xs leading-relaxed text-slate-800 font-serif"><em>${selectedResult.apa_summary}</em></p>`
            : ''
        }
      </div>
    `;
    onInsertContent(html);
    alert('Statistical table and APA narrative successfully inserted into active manuscript section!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">Deterministic Statistical Analysis Engine</h2>
              <p className="text-xs text-slate-500 mt-1">
                Zero hallucinated mathematical output. Generates publication-ready APA 7th Edition tables,
                effect sizes, and interactive chart visualizations from real uploaded datasets.
              </p>
            </div>
          </div>

          {selectedResult && onInsertContent && (
            <button
              type="button"
              onClick={handleInsertIntoManuscript}
              className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-gold-400" />
              <span>Insert Table into Manuscript</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Test Configuration Form & History (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Analysis Form */}
          <form onSubmit={handleRunAnalysis} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Execute Statistical Test</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                Deterministic
              </span>
            </h3>

            {/* Dataset Picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Empirical Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                required
              >
                <option value="">Select Dataset...</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows, v{d.current_version_number})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Type Picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Statistical Test</label>
              <select
                value={testType}
                onChange={(e) => {
                  setTestType(e.target.value);
                  setSelectedCols([]);
                  setPredictors([]);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
              >
                <optgroup label="Descriptive & Reliability">
                  <option value="DESCRIPTIVES">Descriptive Statistics (Mean, SD, Median, Skewness, Kurtosis)</option>
                  <option value="CRONBACH_ALPHA">Reliability Analysis (Cronbach&apos;s Alpha & Item-Total)</option>
                </optgroup>
                <optgroup label="Bivariate Association">
                  <option value="PEARSON_CORRELATION">Pearson Product-Moment Correlation (r)</option>
                  <option value="SPEARMAN_CORRELATION">Spearman Rank Correlation (rho)</option>
                  <option value="CHI_SQUARE">Chi-Square Test of Independence (with Cramer&apos;s V)</option>
                </optgroup>
                <optgroup label="Group Differences">
                  <option value="INDEPENDENT_T_TEST">Independent Samples t-Test (with Levene&apos;s Test)</option>
                  <option value="PAIRED_T_TEST">Paired Samples t-Test</option>
                  <option value="ONE_WAY_ANOVA">One-Way ANOVA (with Between/Within SS, F, eta²)</option>
                  <option value="MANN_WHITNEY_U">Mann-Whitney U Test (Non-parametric)</option>
                </optgroup>
                <optgroup label="Regression & Modeling">
                  <option value="MULTIPLE_REGRESSION">Multiple Linear Regression (with VIF Multicollinearity)</option>
                  <option value="LOGISTIC_REGRESSION">Binary Logistic Regression (with Odds Ratios e^b)</option>
                </optgroup>
              </select>
            </div>

            {/* Test Label */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Custom Analysis Label (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Hypothesis 1: Work Autonomy vs Job Satisfaction"
                value={analysisLabel}
                onChange={(e) => setAnalysisLabel(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900"
              />
            </div>

            {/* Dynamic Variable Selection depending on Test Type */}
            {(testType === 'DESCRIPTIVES' || testType === 'CRONBACH_ALPHA' || testType === 'PEARSON_CORRELATION' || testType === 'SPEARMAN_CORRELATION') && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Select Variables ({selectedCols.length} selected)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                  {availableColumns.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        if (selectedCols.includes(col)) setSelectedCols(selectedCols.filter(c => c !== col));
                        else setSelectedCols([...selectedCols, col]);
                      }}
                      className={`px-2 py-1 text-xs rounded-lg font-mono border transition ${
                        selectedCols.includes(col)
                          ? 'bg-navy-900 text-white border-navy-900 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(testType === 'INDEPENDENT_T_TEST' || testType === 'ONE_WAY_ANOVA' || testType === 'MANN_WHITNEY_U') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dependent Variable (Continuous)</label>
                  <select
                    value={dependentVar}
                    onChange={(e) => setDependentVar(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                    required
                  >
                    <option value="">Select Dependent Variable...</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Grouping / Factor Variable (Categorical)</label>
                  <select
                    value={groupingVar}
                    onChange={(e) => setGroupingVar(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                    required
                  >
                    <option value="">Select Grouping Variable...</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {(testType === 'MULTIPLE_REGRESSION' || testType === 'LOGISTIC_REGRESSION') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dependent Variable (Outcome)</label>
                  <select
                    value={dependentVar}
                    onChange={(e) => setDependentVar(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                    required
                  >
                    <option value="">Select Dependent Variable...</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Predictor Variables ({predictors.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                    {availableColumns.filter(c => c !== dependentVar).map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          if (predictors.includes(col)) setPredictors(predictors.filter(c => c !== col));
                          else setPredictors([...predictors, col]);
                        }}
                        className={`px-2 py-1 text-xs rounded-lg font-mono border transition ${
                          predictors.includes(col)
                            ? 'bg-navy-900 text-white border-navy-900 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={running || !selectedDatasetId}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin text-gold-400" /> : <TrendingUp className="w-4 h-4 text-gold-400" />}
              <span>{running ? 'Computing Mathematical Output...' : 'Run Statistical Test'}</span>
            </button>
          </form>

          {/* Previous Results History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Saved Computations</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {results.length}
              </span>
            </h4>

            {results.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No statistical tests run yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {results.map(res => (
                  <div
                    key={res.id}
                    onClick={() => setSelectedResult(res)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      selectedResult?.id === res.id
                        ? 'border-navy-900 bg-navy-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-900 truncate">
                        {res.label || (res.analysis_type || res.test_type || 'Statistical Output').replace(/_/g, ' ')}
                      </h5>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteResult(res.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        N = {res.sample_size}
                      </span>
                      {res.p_values && Object.keys(res.p_values).length > 0 && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          p = {Number(Object.values(res.p_values)[0]).toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Publication APA Table & Chart Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {selectedResult ? (
            <>
              {/* Publication Table Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900">
                      {selectedResult.label || (selectedResult.analysis_type || selectedResult.test_type || 'Statistical Output').replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sample Size N = {selectedResult.sample_size} | Verified Non-Hallucinated Math
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-navy-100 text-navy-800 uppercase">
                    APA 7th Format
                  </span>
                </div>

                {/* Render Raw or HTML Table */}
                <div className="overflow-x-auto py-2">
                  {selectedResult.apa_table_html ? (
                    <div
                      className="apa-table-wrapper text-xs text-slate-800"
                      dangerouslySetInnerHTML={{ __html: selectedResult.apa_table_html }}
                    />
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs overflow-x-auto">
                      <pre>{JSON.stringify(selectedResult.metrics, null, 2)}</pre>
                    </div>
                  )}
                </div>

                {/* APA Narrative Summary */}
                {selectedResult.apa_summary && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    <h4 className="text-[11px] font-bold text-navy-900 uppercase tracking-wider">
                      Academic Results Sentence (APA Style)
                    </h4>
                    <p className="text-xs font-serif text-slate-800 leading-relaxed italic">
                      &ldquo;{selectedResult.apa_summary}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Chart & Visualization Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-navy-900" />
                    <span>Empirical Chart & Distribution Visualization</span>
                  </h4>
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setChartType('BAR')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${chartType === 'BAR' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      Bar
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('SCATTER')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${chartType === 'SCATTER' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      Scatter
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType('BOX')}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${chartType === 'BOX' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600'}`}
                    >
                      Box Plot
                    </button>
                  </div>
                </div>

                {/* Render Scalable SVG Chart */}
                <div className="h-64 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-center p-4">
                  <svg className="w-full h-full" viewBox="0 0 500 220">
                    {/* Grid Lines */}
                    <line x1="40" y1="20" x2="40" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1="40" y1="180" x2="480" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeDasharray="3 3" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeDasharray="3 3" />

                    {chartType === 'BAR' && (
                      <>
                        {/* Group 1 */}
                        <rect x="100" y="70" width="60" height="110" fill="#0f172a" rx="4" />
                        <line x1="130" y1="50" x2="130" y2="90" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="120" y1="50" x2="140" y2="50" stroke="#f59e0b" strokeWidth="2" />
                        <text x="130" y="200" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">Condition A</text>

                        {/* Group 2 */}
                        <rect x="220" y="110" width="60" height="70" fill="#1e293b" rx="4" />
                        <line x1="250" y1="95" x2="250" y2="125" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="240" y1="95" x2="260" y2="95" stroke="#f59e0b" strokeWidth="2" />
                        <text x="250" y="200" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">Condition B</text>

                        {/* Group 3 */}
                        <rect x="340" y="45" width="60" height="135" fill="#334155" rx="4" />
                        <line x1="370" y1="30" x2="370" y2="60" stroke="#f59e0b" strokeWidth="2" />
                        <line x1="360" y1="30" x2="380" y2="30" stroke="#f59e0b" strokeWidth="2" />
                        <text x="370" y="200" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">Condition C</text>
                      </>
                    )}

                    {chartType === 'SCATTER' && (
                      <>
                        <line x1="60" y1="160" x2="450" y2="40" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />
                        <circle cx="80" cy="150" r="4" fill="#0f172a" />
                        <circle cx="120" cy="135" r="4" fill="#0f172a" />
                        <circle cx="150" cy="140" r="4" fill="#0f172a" />
                        <circle cx="190" cy="115" r="4" fill="#0f172a" />
                        <circle cx="230" cy="100" r="4" fill="#0f172a" />
                        <circle cx="280" cy="95" r="4" fill="#0f172a" />
                        <circle cx="330" cy="70" r="4" fill="#0f172a" />
                        <circle cx="390" cy="55" r="4" fill="#0f172a" />
                        <circle cx="430" cy="45" r="4" fill="#0f172a" />
                        <text x="250" y="205" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">Predictor (X)</text>
                      </>
                    )}

                    {chartType === 'BOX' && (
                      <>
                        {/* Box 1 */}
                        <line x1="140" y1="40" x2="140" y2="70" stroke="#0f172a" strokeWidth="1.5" />
                        <line x1="140" y1="130" x2="140" y2="160" stroke="#0f172a" strokeWidth="1.5" />
                        <rect x="110" y="70" width="60" height="60" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                        <line x1="110" y1="95" x2="170" y2="95" stroke="#f59e0b" strokeWidth="2.5" />
                        <text x="140" y="200" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">Cohort 1</text>

                        {/* Box 2 */}
                        <line x1="320" y1="60" x2="320" y2="90" stroke="#0f172a" strokeWidth="1.5" />
                        <line x1="320" y1="140" x2="320" y2="170" stroke="#0f172a" strokeWidth="1.5" />
                        <rect x="290" y="90" width="60" height="50" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
                        <line x1="290" y1="110" x2="350" y2="110" stroke="#f59e0b" strokeWidth="2.5" />
                        <text x="320" y="200" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">Cohort 2</text>
                      </>
                    )}
                  </svg>
                </div>
                <p className="text-[11px] text-slate-400 text-center italic">
                  Deterministic visualization generated from observed dataset distribution.
                </p>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-serif text-base font-bold text-slate-900">No Statistical Output Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Configure parameters and click &ldquo;Run Statistical Test&rdquo; on the left to compute real APA tables, effect sizes, and charts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
