'use client';

import React, { useState, useEffect } from 'react';
import { ResearchProject, ResearchSource, LiteratureTaskType, LiteratureAnalyzeResponse } from '@/types/project';
import { literatureApi, projectSourcesApi } from '@/lib/api';
import {
  BookOpen,
  Sparkles,
  Layers,
  Table,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Copy,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface LiteratureReviewPanelProps {
  project: ResearchProject | null;
  onInsertContent: (html: string) => void;
}

export default function LiteratureReviewPanel({
  project,
  onInsertContent,
}: LiteratureReviewPanelProps) {
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<LiteratureTaskType>('CREATE_LITERATURE_SYNTHESIS');
  const [frameworkType, setFrameworkType] = useState<'EMPIRICAL' | 'THEORETICAL' | 'CONCEPTUAL' | 'PRISMA'>('EMPIRICAL');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LiteratureAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.id) {
      loadProjectSources();
    }
  }, [project?.id]);

  const loadProjectSources = async () => {
    if (!project?.id) return;
    setSourcesLoading(true);
    try {
      const data = await projectSourcesApi.list(project.id);
      const mapped = data.map((ps: any) => ps.source || ps);
      setSources(mapped);
      // Select up to 3 sources by default
      setSelectedSourceIds(mapped.slice(0, 3).map((s: ResearchSource) => s.id));
    } catch {
      // fallback
    } finally {
      setSourcesLoading(false);
    }
  };

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleRunAnalysis = async () => {
    if (!project?.id || selectedSourceIds.length === 0) return;
    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const resp = await literatureApi.analyze(project.id, {
        source_ids: selectedSourceIds,
        task_type: taskType,
        custom_instructions: customInstructions.trim() || undefined,
      });
      setAnalysisResult(resp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Literature intelligence analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsertMatrixTable = () => {
    const selected = sources.filter((s) => selectedSourceIds.includes(s.id));
    if (selected.length === 0) return;

    let tableHtml = `
      <table class="border-collapse table-auto w-full border border-slate-300 my-4 text-xs">
        <thead>
          <tr class="bg-slate-100 font-bold border border-slate-300">
            <th class="border border-slate-300 p-2 text-left">Authors & Year</th>
            <th class="border border-slate-300 p-2 text-left">Publication Title</th>
            <th class="border border-slate-300 p-2 text-left">Research Objectives</th>
            <th class="border border-slate-300 p-2 text-left">Methodology</th>
            <th class="border border-slate-300 p-2 text-left">Key Findings</th>
            <th class="border border-slate-300 p-2 text-left">Identified Gaps</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const src of selected) {
      const authorYear = `${src.authors?.[0] || 'Author'} et al. (${src.publication_year || 'n.d.'})`;
      tableHtml += `
        <tr>
          <td class="border border-slate-300 p-2 font-semibold">${authorYear}</td>
          <td class="border border-slate-300 p-2">${src.title}</td>
          <td class="border border-slate-300 p-2">Investigates core empirical relationships in ${project?.discipline || 'the discipline'}.</td>
          <td class="border border-slate-300 p-2">Empirical quantitative / qualitative inquiry.</td>
          <td class="border border-slate-300 p-2">${src.abstract ? src.abstract.slice(0, 120) + '...' : 'Empirical evidence documented.'}</td>
          <td class="border border-slate-300 p-2">Opportunity for contextual extension in current study.</td>
        </tr>
      `;
    }

    tableHtml += `
        </tbody>
      </table>
    `;

    onInsertContent(tableHtml);
  };

  const handleInsertAnalysisText = () => {
    if (!analysisResult) return;
    const formatted = `
      <h3>${analysisResult.task_type.replace(/_/g, ' ')}</h3>
      <p><em>Evidence Basis: ${analysisResult.evidence_basis}</em></p>
      <p>${analysisResult.content.replace(/\n\n/g, '</p><p>')}</p>
    `;
    onInsertContent(formatted);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 text-xs">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gold-600" />
          <h3 className="font-serif text-sm font-bold text-slate-900">
            Literature Review Intelligence
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-navy-50 text-navy-800">
          Stage 3 Engine
        </span>
      </div>

      {/* Review Type Selector */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-600">Review Matrix Framework</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: 'EMPIRICAL', label: 'Empirical Matrix' },
            { id: 'THEORETICAL', label: 'Theoretical Framework' },
            { id: 'CONCEPTUAL', label: 'Conceptual Review' },
            { id: 'PRISMA', label: 'PRISMA Systematic' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setFrameworkType(mode.id as any)}
              className={`p-2 rounded-lg text-left border text-xs font-semibold transition ${
                frameworkType === mode.id
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source Selection for Synthesis */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-600">
            Select Attached Publications ({selectedSourceIds.length}/{sources.length})
          </label>
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setSelectedSourceIds(
                  selectedSourceIds.length === sources.length ? [] : sources.map((s) => s.id)
                )
              }
              className="text-[10px] font-semibold text-navy-800 hover:underline"
            >
              {selectedSourceIds.length === sources.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {sourcesLoading ? (
          <div className="p-4 text-center text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
            <span>Loading attached references...</span>
          </div>
        ) : sources.length === 0 ? (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-center text-[11px]">
            No references attached to this project yet. Visit Library to discover and attach publications.
          </div>
        ) : (
          <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
            {sources.map((s) => {
              const checked = selectedSourceIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition ${
                    checked ? 'bg-navy-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSourceSelection(s.id)}
                    className="mt-0.5 rounded text-navy-900 focus:ring-navy-900"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 line-clamp-1 text-[11px]">{s.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {s.authors?.[0] || 'Unknown'} ({s.publication_year || 'n.d.'})
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Insert Matrix Table Directly */}
      <button
        type="button"
        onClick={handleInsertMatrixTable}
        disabled={selectedSourceIds.length === 0}
        className="w-full py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
      >
        <Table className="w-3.5 h-3.5 text-navy-900" />
        <span>Insert {frameworkType} Synthesis Table</span>
      </button>

      {/* Task Selector */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <label className="block text-[11px] font-bold text-slate-600">Grounded Literature Task</label>
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as LiteratureTaskType)}
          className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
        >
          <option value="CREATE_LITERATURE_SYNTHESIS">Thematic Literature Synthesis</option>
          <option value="SUGGEST_RESEARCH_GAPS">Identify Empirical Research Gaps</option>
          <option value="COMPARE_STUDIES">Comparative Cross-Study Synthesis</option>
          <option value="EXTRACT_OBJECTIVES">Extract Explicit Objectives</option>
          <option value="IDENTIFY_METHODOLOGY">Analyze Research Methodology</option>
          <option value="SUMMARIZE_FINDINGS">Extract Evidence-Based Findings</option>
          <option value="IDENTIFY_LIMITATIONS">Identify Author Limitations</option>
          <option value="EVIDENCE_ALIGNMENT">Evaluate Evidence Alignment</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">
          Custom Synthesis Directives
        </label>
        <textarea
          rows={2}
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g. Focus on developing country contexts and methodological rigor..."
          className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-900"
        />
      </div>

      {/* Run AI Synthesis */}
      <button
        type="button"
        onClick={handleRunAnalysis}
        disabled={loading || selectedSourceIds.length === 0}
        className="w-full py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-gold-400" />
        )}
        <span>Run Grounded Literature Synthesis</span>
      </button>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Analysis Result Box */}
      {analysisResult && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Grounded Output
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                analysisResult.evidence_basis === 'FULL_TEXT'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Basis: {analysisResult.evidence_basis}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 font-serif text-slate-800 leading-relaxed text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
            {analysisResult.content}
          </div>

          <button
            type="button"
            onClick={handleInsertAnalysisText}
            className="w-full py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insert Synthesis into Editor</span>
          </button>
        </div>
      )}
    </div>
  );
}
