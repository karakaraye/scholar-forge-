'use client';

import React, { useState, useEffect } from 'react';
import { ReviewRecord, ReviewTaskType } from '@/types/project';
import { reviewAssistantApi, reviewsApi } from '@/lib/api';
import {
  MessageSquare,
  Sparkles,
  CheckSquare,
  Square,
  ShieldCheck,
  AlertTriangle,
  Send,
  Loader2,
  UserCheck,
  Calendar,
  FileCheck2,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ReviewPreparationPanelProps {
  projectId: string;
}

const REVIEW_TASKS: { type: ReviewTaskType; label: string; desc: string }[] = [
  { type: 'REVIEW_FULL_MANUSCRIPT', label: 'Full Manuscript Comprehensive Review', desc: 'Holistic assessment of coherence, structure, and contribution.' },
  { type: 'REVIEW_CHAPTER', label: 'Chapter-Specific Audit', desc: 'Focus review on a selected manuscript chapter.' },
  { type: 'CHECK_RESEARCH_ALIGNMENT', label: 'Research Alignment Audit', desc: 'Verify objectives-to-results correspondence.' },
  { type: 'IDENTIFY_MISSING_SECTIONS', label: 'Detect Missing Canonical Sections', desc: 'Flag institutional or discipline-required missing elements.' },
  { type: 'REVIEW_ARGUMENT_COHERENCE', label: 'Argument Flow & Transition Audit', desc: 'Evaluate argumentative logic between chapters.' },
  { type: 'REVIEW_LITERATURE_INTEGRATION', label: 'Literature Integration & Synthesis Audit', desc: 'Verify how citations ground the analytical discourse.' },
  { type: 'REVIEW_RESULTS_DISCUSSION', label: 'Results & Chapter 4 Discussion Review', desc: 'Verify evidence grounding without fabricated findings.' },
  { type: 'SUGGEST_ABSTRACT', label: 'Generate Grounded Structured Abstract', desc: 'Synthesize background, method, results, and conclusion from text.' },
  { type: 'SUGGEST_CONCLUSION', label: 'Formulate Evidence-Based Conclusion', desc: 'Tie final remarks strictly to statistical and qualitative decisions.' },
  { type: 'PREPARE_REVIEW_CHECKLIST', label: 'Generate Pre-Defense Academic Checklist', desc: 'Customized verification checklist for formal submission.' },
];

const DEFENSE_CHECKLIST_ITEMS = [
  { key: 'problem_justified', label: 'Problem statement clearly identifies an empirical or theoretical gap.' },
  { key: 'methodology_sound', label: 'Methodology and research instruments match research design.' },
  { key: 'instruments_validated', label: 'Instruments and sampling thresholds documented and justified.' },
  { key: 'data_provenance', label: 'All statistical findings are traceable to real uploaded datasets.' },
  { key: 'citations_verified', label: 'Zero unverified or phantom citations present in reference list.' },
  { key: 'conclusions_grounded', label: 'Conclusions do not exceed the empirical boundaries of the data.' },
];

export default function ReviewPreparationPanel({ projectId }: ReviewPreparationPanelProps) {
  // Review Records State
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Review Submission State
  const [reviewerName, setReviewerName] = useState('');
  const [reviewStage, setReviewStage] = useState<'DRAFT' | 'READY_FOR_INTERNAL_REVIEW' | 'REVISIONS_REQUIRED' | 'APPROVED_DRAFT'>('READY_FOR_INTERNAL_REVIEW');
  const [feedback, setFeedback] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    problem_justified: true,
    methodology_sound: true,
    instruments_validated: true,
    data_provenance: true,
    citations_verified: true,
    conclusions_grounded: false,
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // AI Review Assistant State
  const [selectedTask, setSelectedTask] = useState<ReviewTaskType>('SUGGEST_ABSTRACT');
  const [userPrompt, setUserPrompt] = useState('');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<{
    success: boolean;
    refusal?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  } | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reviewsApi.list(projectId);
      const list = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && 'id' in data
        ? [data as ReviewRecord]
        : [];
      setReviews(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load review records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [projectId]);

  const handleToggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateReviewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !feedback.trim()) return;

    setSubmittingReview(true);
    try {
      const newRec = await reviewsApi.create(projectId, {
        reviewer_name: reviewerName.trim(),
        review_stage: reviewStage,
        feedback: feedback.trim(),
        checklist_results: checklist,
        is_approved: reviewStage === 'APPROVED_DRAFT',
      });
      setReviews((prev) => [newRec, ...prev]);
      setFeedback('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to record review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleExecuteAITask = async () => {
    setAiRunning(true);
    setAiResult(null);
    try {
      const res = await reviewAssistantApi.execute(projectId, {
        task_type: selectedTask,
        user_prompt: userPrompt.trim(),
      });
      setAiResult(res);
    } catch (err: unknown) {
      setAiResult({
        success: false,
        message: err instanceof Error ? err.message : 'Review task execution failed.',
      });
    } finally {
      setAiRunning(false);
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'APPROVED_DRAFT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Approved Draft
          </span>
        );
      case 'READY_FOR_INTERNAL_REVIEW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Ready for Internal Review
          </span>
        );
      case 'REVISIONS_REQUIRED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Revisions Required
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-800 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Review & Defense Workflows...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: AI Academic Review Assistant (10 Bounded Tasks) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <span className="p-2.5 bg-navy-50 text-navy-900 rounded-xl">
            <Sparkles className="w-5 h-5 text-gold-500" />
          </span>
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-900">
              AI Academic Review Assistant
            </h2>
            <p className="text-xs text-slate-500">
              Rigorous, section-bounded academic review tasks with anti-hallucination refusal guards.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Review Task
              </label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value as ReviewTaskType)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
              >
                {REVIEW_TASKS.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Review Focus / Special Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Focus on theoretical integration in Chapter 2..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={aiRunning}
              onClick={handleExecuteAITask}
              className="px-4 py-2 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition flex items-center gap-1.5 shadow-sm"
            >
              {aiRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Execute AI Academic Review</span>
            </button>
          </div>

          {/* AI Result or Refusal Notice */}
          {aiResult && (
            <div
              className={`p-5 rounded-xl border mt-4 text-xs leading-relaxed ${
                aiResult.refusal
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-2">
                {aiResult.refusal ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Anti-Hallucination Refusal Guard Triggered</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>AI Academic Review Completed</span>
                  </>
                )}
              </div>
              <p className="whitespace-pre-wrap font-sans">
                {aiResult.message || JSON.stringify(aiResult.data, null, 2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Defense Readiness Checklist & Approval Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Checklist & Formal Status (6 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CheckSquare className="w-4 h-4 text-navy-800" />
            <h3 className="text-sm font-bold text-slate-900">Pre-Defense Readiness Checklist</h3>
          </div>

          <div className="space-y-3 pt-1">
            {DEFENSE_CHECKLIST_ITEMS.map((item) => {
              const isChecked = !!checklist[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => handleToggleChecklist(item.key)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition"
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${isChecked ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Record Review & Feedback (6 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquare className="w-4 h-4 text-navy-800" />
            <h3 className="text-sm font-bold text-slate-900">Record Reviewer Feedback & Approval</h3>
          </div>

          <form onSubmit={handleCreateReviewRecord} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reviewer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vance or Internal Committee"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Review Stage</label>
                <select
                  value={reviewStage}
                  onChange={(e) => setReviewStage(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
                >
                  <option value="READY_FOR_INTERNAL_REVIEW">Ready for Review</option>
                  <option value="REVISIONS_REQUIRED">Revisions Required</option>
                  <option value="APPROVED_DRAFT">Approved Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Formal Feedback</label>
              <textarea
                rows={4}
                placeholder="Enter substantive review critique or approval notes..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-navy-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Save Formal Review Record</span>
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 3: Review Records History List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-navy-800" />
          Formal Review & Governance History ({reviews.length})
        </h3>

        {(() => {
          const safeReviews = Array.isArray(reviews) ? reviews : [];
          return safeReviews.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
              <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Review Records Saved</p>
              <p className="text-xs text-slate-500 mt-1">
                Submit your first formal review assessment above.
              </p>
            </div>
          ) : (
            safeReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{rev.reviewer_name}</span>
                    {getStageBadge(rev.review_stage)}
                  </div>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(rev.created_at)}
                  </span>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {rev.feedback}
                </p>
              </div>
            ))
          );
        })()}
      </div>
    </div>
  );
}
