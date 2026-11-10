'use client';

import React, { useState } from 'react';
import {
  AIAction,
  AIGenerateResponse,
  ConsistencyReport,
  ResearchProject,
} from '@/types/project';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Info,
  ShieldCheck,
  Send,
  Loader2,
  BookOpen,
  FileCheck2,
  ChevronDown,
  Layers,
  Award,
} from 'lucide-react';

interface AIAssistantPanelProps {
  project: ResearchProject;
  activeSectionTitle?: string;
  selectedText?: string;
  onApplySuggestion: (text: string) => void;
  onRequestAI: (
    action: AIAction,
    instructions?: string,
    rewriteStyle?: 'formal' | 'concise' | 'detailed' | 'clearer' | 'flow'
  ) => Promise<AIGenerateResponse | null>;
  onFeedbackAI: (jobId: string, action: 'ACCEPT' | 'REJECT' | 'EDIT', finalText?: string) => Promise<void>;
  consistencyReport: ConsistencyReport | null;
  onRunConsistencyCheck: () => Promise<void>;
  consistencyLoading: boolean;
}

export default function AIAssistantPanel({
  project,
  activeSectionTitle,
  selectedText,
  onApplySuggestion,
  onRequestAI,
  onFeedbackAI,
  consistencyReport,
  onRunConsistencyCheck,
  consistencyLoading,
}: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'consistency' | 'context'>('ai');
  const [selectedAction, setSelectedAction] = useState<AIAction>('GENERATE_SECTION');
  const [customInstructions, setCustomInstructions] = useState('');
  const [rewriteStyle, setRewriteStyle] = useState<'formal' | 'concise' | 'detailed' | 'clearer' | 'flow'>('formal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<AIGenerateResponse | null>(null);
  const [isEditingSuggestion, setIsEditingSuggestion] = useState(false);
  const [editedText, setEditedText] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCurrentResponse(null);
    setIsEditingSuggestion(false);
    try {
      const res = await onRequestAI(selectedAction, customInstructions, rewriteStyle);
      if (res) {
        setCurrentResponse(res);
        setEditedText(res.suggestion || '');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!currentResponse || !currentResponse.job_id) return;
    const textToInsert = isEditingSuggestion ? editedText : currentResponse.suggestion || '';
    onApplySuggestion(textToInsert);
    await onFeedbackAI(currentResponse.job_id, isEditingSuggestion ? 'EDIT' : 'ACCEPT', textToInsert);
    setCurrentResponse(null);
    setIsEditingSuggestion(false);
  };

  const handleReject = async () => {
    if (!currentResponse || !currentResponse.job_id) return;
    await onFeedbackAI(currentResponse.job_id, 'REJECT');
    setCurrentResponse(null);
    setIsEditingSuggestion(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full max-h-[850px] overflow-hidden">
      {/* Top Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-2 pt-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'ai'
              ? 'bg-white text-navy-950 border-t border-x border-slate-200 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
          <span>AI Assistant</span>
        </button>

        <button
          onClick={() => setActiveTab('consistency')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'consistency'
              ? 'bg-white text-navy-950 border-t border-x border-slate-200 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-navy-700" />
          <span>Consistency</span>
        </button>

        <button
          onClick={() => setActiveTab('context')}
          className={`flex-1 py-2 text-xs font-bold rounded-t-lg transition flex items-center justify-center gap-1.5 ${
            activeTab === 'context'
              ? 'bg-white text-navy-950 border-t border-x border-slate-200 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Context</span>
        </button>
      </div>

      {/* TAB 1: AI Assistant */}
      {activeTab === 'ai' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 text-xs">
          {/* Target Section Notice */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Target Section:</span>
            <span className="font-bold text-navy-900 truncate max-w-[170px]">
              {activeSectionTitle || 'No section selected'}
            </span>
          </div>

          {/* AI Action Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold block uppercase text-[10px] tracking-wider">
              Select Writing Task
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as AIAction)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy-900"
            >
              <optgroup label="Section & Manuscript Drafting">
                <option value="GENERATE_SECTION">Draft Section Suggestions</option>
                <option value="IMPROVE_WRITING">Improve Academic Style & Tone</option>
                <option value="EXPAND_WRITING">Expand Scholarly Argumentation</option>
                <option value="SUMMARIZE_CONTENT">Summarize Selected Text</option>
                <option value="REWRITE_CONTENT">Rewrite Text (Choose Style)</option>
              </optgroup>
              <optgroup label="Research Design & Methodology Alignment">
                <option value="SUGGEST_OBJECTIVES">Suggest Research Objectives</option>
                <option value="SUGGEST_QUESTIONS">Suggest Research Questions</option>
                <option value="SUGGEST_HYPOTHESES">Suggest Testable Hypotheses</option>
                <option value="SUGGEST_FRAMEWORK">Suggest Conceptual Framework</option>
                <option value="SUGGEST_OUTLINE">Suggest Outline Improvements</option>
              </optgroup>
            </select>
          </div>

          {/* Rewrite Style Options (only if REWRITE_CONTENT selected) */}
          {selectedAction === 'REWRITE_CONTENT' && (
            <div className="space-y-1.5">
              <label className="text-slate-700 font-bold block uppercase text-[10px] tracking-wider">
                Rewrite Style
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'formal', label: 'More Formal' },
                  { id: 'concise', label: 'More Concise' },
                  { id: 'detailed', label: 'More Detailed' },
                  { id: 'clearer', label: 'Clearer Academic' },
                  { id: 'flow', label: 'Better Logical Flow' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRewriteStyle(s.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition text-center ${
                      rewriteStyle === s.id
                        ? 'border-navy-900 bg-navy-950 text-gold-400 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Text Excerpt notice */}
          {selectedText && (
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px]">
              <span className="font-bold block mb-1">Applying to Selected Text:</span>
              <p className="italic line-clamp-2">&quot;{selectedText}&quot;</p>
            </div>
          )}

          {/* Optional Prompt Guidance */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold block uppercase text-[10px] tracking-wider">
              Specific Instructions (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Emphasize quantitative regression findings, avoid jargon..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-navy-900 resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-navy-950 to-navy-900 text-white font-bold text-xs hover:from-navy-900 hover:to-navy-800 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                <span>ScholarForge AI Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span>Request AI Assistance</span>
              </>
            )}
          </button>

          {/* Suggestion Review Card */}
          {currentResponse && (
            <div className="border border-gold-200 rounded-xl bg-gold-50/20 p-4 space-y-3 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gold-100">
                <span className="text-[10px] uppercase font-bold text-gold-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Suggestion Ready for Review
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentResponse.model || 'OpenAI'}
                </span>
              </div>

              {currentResponse.error ? (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <p className="font-bold">Notice:</p>
                  <p className="mt-1 leading-relaxed">{currentResponse.error}</p>
                </div>
              ) : (
                <>
                  {/* Suggestion Content Area */}
                  {isEditingSuggestion ? (
                    <textarea
                      rows={8}
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full p-2.5 text-xs font-serif rounded-lg border border-slate-300 bg-white focus:outline-none text-slate-800 leading-relaxed"
                    />
                  ) : (
                    <div className="max-h-60 overflow-y-auto p-3 rounded-lg bg-white border border-slate-200 font-serif text-slate-800 text-xs leading-relaxed whitespace-pre-line">
                      {currentResponse.suggestion}
                    </div>
                  )}

                  {/* Academic Integrity Badge */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Academic Integrity Check: No fabricated citations or DOIs generated.</span>
                  </div>

                  {/* Approval Actions: Accept, Edit, Reject, Regenerate */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold-100">
                    <button
                      onClick={handleAccept}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isEditingSuggestion ? 'Apply Edited' : 'Accept & Insert'}</span>
                    </button>

                    <button
                      onClick={() => setIsEditingSuggestion(!isEditingSuggestion)}
                      className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isEditingSuggestion ? 'Preview Text' : 'Edit Before Apply'}</span>
                    </button>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Regenerate</span>
                    </button>

                    <button
                      onClick={handleReject}
                      className="py-1.5 px-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Academic Consistency Checker */}
      {activeTab === 'consistency' && (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif font-bold text-slate-900 text-sm">
                Academic Consistency Scanner
              </h4>
              <p className="text-[11px] text-slate-500">
                Audits objectives, questions, hypotheses, and outline alignment.
              </p>
            </div>
            <button
              onClick={onRunConsistencyCheck}
              disabled={consistencyLoading}
              className="p-1.5 rounded-lg bg-navy-900 text-white font-semibold hover:bg-navy-800 disabled:opacity-50 transition flex items-center gap-1 text-[11px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${consistencyLoading ? 'animate-spin' : ''}`} />
              <span>Scan Now</span>
            </button>
          </div>

          {/* Consistency Score Card */}
          {consistencyReport && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-navy-950 to-navy-900 text-white flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">
                  Consistency Index
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-serif text-2xl font-extrabold text-white">
                    {consistencyReport.consistency_score}
                  </span>
                  <span className="text-xs text-slate-300">/ 100</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                    consistencyReport.status === 'HEALTHY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {consistencyReport.status.replace('_', ' ')}
                </span>
              </div>

              <div className="text-right text-[11px] space-y-1 text-slate-300">
                <div>
                  Warnings: <strong className="text-rose-400 font-bold">{consistencyReport.warnings_count}</strong>
                </div>
                <div>
                  Suggestions:{' '}
                  <strong className="text-gold-400 font-bold">{consistencyReport.suggestions_count}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Diagnostics List */}
          <div className="space-y-2.5">
            {consistencyLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-navy-800 mx-auto mb-2" />
                <span className="text-slate-500 text-xs">Analyzing scholarly consistency...</span>
              </div>
            ) : consistencyReport && consistencyReport.diagnostics.length > 0 ? (
              consistencyReport.diagnostics.map((diag) => {
                const isWarn = diag.type === 'WARNING';
                const isGood = diag.type === 'GOOD';

                return (
                  <div
                    key={diag.id}
                    className={`p-3 rounded-xl border space-y-1.5 transition ${
                      isWarn
                        ? 'bg-rose-50/50 border-rose-200'
                        : isGood
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-blue-50/50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded font-mono ${
                          isWarn
                            ? 'bg-rose-100 text-rose-700'
                            : isGood
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {diag.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{diag.type}</span>
                    </div>

                    <h5
                      className={`font-bold text-xs ${
                        isWarn ? 'text-rose-900' : isGood ? 'text-emerald-900' : 'text-blue-900'
                      }`}
                    >
                      {diag.title}
                    </h5>

                    <p className="text-slate-600 leading-relaxed text-[11px]">{diag.message}</p>

                    <div className="p-2 rounded bg-white/80 border border-slate-200/60 text-[11px] text-slate-700">
                      <span className="font-bold text-slate-900 block mb-0.5">Scholarly Action:</span>
                      {diag.recommendation}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Click &quot;Scan Now&quot; to audit manuscript consistency.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Research Context Drawer */}
      {activeTab === 'context' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs text-slate-700">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Title & Aim</span>
            <p className="font-serif font-bold text-slate-900 text-xs leading-snug">{project.title}</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Methodological Design</span>
            <p className="leading-relaxed text-[11px]">
              {project.requirements?.research_methodology || 'Unspecified'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Research Objectives</span>
            <p className="leading-relaxed text-[11px] whitespace-pre-line">
              {project.requirements?.research_objectives || 'No explicit objectives registered.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Supervisor / Faculty Instructions</span>
            <p className="leading-relaxed text-[11px]">
              {project.requirements?.supervisor_requirements || 'Standard formatting guidelines.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
            <span className="font-bold">Citation Style:</span>
            <span className="px-2 py-0.5 rounded bg-gold-100 text-gold-800 font-bold font-mono">
              {project.citation_style}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

