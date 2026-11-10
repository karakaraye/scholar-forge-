'use client';

import React, { useState } from 'react';
import { ResearchProject } from '@/types/project';
import { interpretationApi } from '@/lib/api';
import {
  Sparkles,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Copy,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ChapterFourWorkspaceProps {
  project: ResearchProject;
  onInsertContent?: (html: string) => void;
  onRefreshConsistency?: () => void;
}

export default function ChapterFourWorkspace({ project, onInsertContent }: ChapterFourWorkspaceProps) {
  const [taskType, setTaskType] = useState<string>('GENERATE_RESULTS_SECTION');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Results & Refusal State
  const [interpretationTitle, setInterpretationTitle] = useState<string | null>(null);
  const [interpretationContent, setInterpretationContent] = useState<string | null>(null);
  const [refusalMessage, setRefusalMessage] = useState<string | null>(null);

  const handleRunTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) return;

    setLoading(true);
    setRefusalMessage(null);
    setInterpretationTitle(null);
    setInterpretationContent(null);

    try {
      const res = await interpretationApi.interpret(project.id, {
        task_type: taskType,
        prompt: customPrompt.trim() || undefined,
      });

      if (res.refusal) {
        setRefusalMessage(res.message || 'Empirical data or statistical calculations required before generating interpretation.');
      } else {
        const text = res.data?.content || String(res.data || '');
        setInterpretationTitle(res.data?.title || 'Academic Interpretation & Findings');
        setInterpretationContent(text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Interpretation failed';
      // Detect refusal keywords in error response
      if (
        msg.toLowerCase().includes('refusal') ||
        msg.toLowerCase().includes('cannot generate') ||
        msg.toLowerCase().includes('cannot interpret') ||
        msg.toLowerCase().includes('no statistical results') ||
        msg.toLowerCase().includes('no qualitative')
      ) {
        setRefusalMessage(msg);
      } else {
        setRefusalMessage(`ScholarForge AI Refusal Protocol: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInsertIntoManuscript = () => {
    if (!interpretationContent || !onInsertContent) return;

    const formattedHtml = `
      <div class="academic-interpretation-block my-6">
        <h2 class="font-serif text-lg font-bold text-slate-900 mb-2">
          ${interpretationTitle || 'Results and Discussion'}
        </h2>
        <div class="prose prose-slate text-sm leading-relaxed font-serif text-slate-800">
          ${interpretationContent
            .split('\n\n')
            .map((p) => `<p class="mb-3">${p.replace(/\n/g, '<br/>')}</p>`)
            .join('')}
        </div>
      </div>
    `;

    onInsertContent(formattedHtml);
    alert('Academic interpretation and findings successfully inserted into active manuscript section!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Chapter 4 & Results Interpretation Assistant
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Discipline-aware interpretation of authentic empirical findings, hypothesis outcomes, and qualitative themes.
                Strict refusal protocol prevents hallucination of fabricated statistics or literature.
              </p>
            </div>
          </div>

          {interpretationContent && onInsertContent && (
            <button
              type="button"
              onClick={handleInsertIntoManuscript}
              className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-gold-400" />
              <span>Insert into Manuscript Section</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Task Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleRunTask} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Interpretation Task</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-50 text-navy-800 font-bold">
                10 Core Tasks
              </span>
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Analytical Interpretation Task
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
              >
                <optgroup label="Empirical Results Drafting">
                  <option value="GENERATE_RESULTS_SECTION">Draft Chapter 4 (Results / Findings Section)</option>
                  <option value="GENERATE_DISCUSSION_SECTION">Draft Chapter 5 (Discussion of Findings)</option>
                  <option value="INTERPRET_DESCRIPTIVE_RESULTS">Interpret Descriptive Statistics & Distributions</option>
                  <option value="INTERPRET_CORRELATION_RESULTS">Interpret Bivariate Correlations (Non-Causal)</option>
                  <option value="INTERPRET_REGRESSION_RESULTS">Interpret Multiple/Logistic Regression Models</option>
                  <option value="INTERPRET_HYPOTHESIS_TESTS">Synthesize Formal Hypothesis Testing Outcomes</option>
                </optgroup>
                <optgroup label="Qualitative & Diagnostic">
                  <option value="SUMMARIZE_QUALITATIVE_THEMES">Synthesize Qualitative Themes with Quotes</option>
                  <option value="EXPLAIN_STATISTICAL_ASSUMPTIONS">Explain Statistical Assumptions & Diagnostics</option>
                </optgroup>
                <optgroup label="Literature Grounding & Critique">
                  <option value="COMPARE_FINDINGS_WITH_LITERATURE">Compare Findings with Verified Literature Sources</option>
                  <option value="SUGGEST_LIMITATIONS_FUTURE_RESEARCH">Recommend Limitations & Future Research Directions</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Specific Context or Focus (Optional)
              </label>
              <textarea
                placeholder="e.g. Focus on the moderation effect of institutional leadership, and highlight discrepancies with prior findings in African higher education..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Generating Discipline-Aware Findings...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  <span>Execute Results Interpretation</span>
                </>
              )}
            </button>
          </form>

          {/* Guidelines Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Scientific Rigor & Zero Hallucination</span>
            </h4>
            <p className="leading-relaxed">
              ScholarForge AI operates under strict academic verification protocols:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
              <li>Statistical values are never invented; they must derive from uploaded datasets or computed models.</li>
              <li>Qualitative quotes are restricted to authentic transcript excerpts.</li>
              <li>Literature comparisons reference only verified project publications.</li>
              <li>Bivariate correlations are strictly distinguished from causal relationships.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Output / Refusal Display (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Refusal Banner */}
          {refusalMessage && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-rose-950">
                    ScholarForge AI Refusal Protocol Triggered
                  </h4>
                  <p className="text-xs text-rose-700 font-medium mt-0.5">
                    Hallucination Safeguard Enforced
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-white/80 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed font-serif">
                {refusalMessage}
              </div>

              <div className="text-[11px] text-rose-800 leading-relaxed">
                <strong>Resolution:</strong> Please upload an authentic empirical dataset in the &ldquo;Datasets & Cleaning&rdquo; tab,
                execute a statistical test in &ldquo;Statistical Analysis&rdquo;, or ingest transcripts in &ldquo;Qualitative Analysis&rdquo;
                before generating this section.
              </div>
            </div>
          )}

          {/* Generated Academic Content */}
          {interpretationContent ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {interpretationTitle || 'Interpreted Findings'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Grounded in project empirical evidence & verified literature
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(interpretationContent);
                    alert('Copied interpretation text to clipboard!');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-navy-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>
              </div>

              <div className="prose prose-slate text-xs leading-relaxed font-serif text-slate-800 whitespace-pre-wrap max-h-[600px] overflow-y-auto pr-2">
                {interpretationContent}
              </div>
            </div>
          ) : !refusalMessage ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-serif text-base font-bold text-slate-900">
                Ready to Interpret Research Findings
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an interpretation task on the left and click &ldquo;Execute Results Interpretation&rdquo; to draft
                publication-grade narrative grounded in your project&apos;s real empirical data.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

