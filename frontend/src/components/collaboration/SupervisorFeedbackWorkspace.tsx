'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  SupervisorFeedback,
  FeedbackSourceType,
  CorrectionCategory,
} from '@/types/project';
import { supervisorFeedbackApi } from '@/lib/api';

interface SupervisorFeedbackWorkspaceProps {
  projectId: string;
  documentId?: string;
  feedbacks?: SupervisorFeedback[];
  onRefreshFeedbacks?: () => void;
  onAnalysisComplete?: () => void;
}

export const SupervisorFeedbackWorkspace: React.FC<SupervisorFeedbackWorkspaceProps> = ({
  projectId,
  documentId,
  feedbacks: propFeedbacks,
  onRefreshFeedbacks,
  onAnalysisComplete,
}) => {
  const [feedbacks, setFeedbacks] = useState<SupervisorFeedback[]>(propFeedbacks || []);
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'DOCX' | 'PDF' | 'INLINE'>('MANUAL');
  const [manualText, setManualText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<any | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await supervisorFeedbackApi.list(projectId);
      setFeedbacks(data);
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    if (propFeedbacks !== undefined) {
      setFeedbacks(propFeedbacks);
    } else {
      fetchFeedbacks();
    }
  }, [propFeedbacks, fetchFeedbacks]);

  const handleIngestManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await supervisorFeedbackApi.ingest(projectId, {
        source_type: 'MANUAL_ENTRY',
        raw_content: manualText.trim(),
        title: 'Manual Supervisor Review Notes',
      });
      setSuccess('Manual supervisor feedback ingested successfully.');
      setManualText('');
      if (onRefreshFeedbacks) onRefreshFeedbacks();
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    const st: FeedbackSourceType = activeTab === 'DOCX' ? 'DOCX_UPLOAD' : 'PDF_UPLOAD';
    formData.append('source_type', st);
    formData.append('title', selectedFile.name);
    formData.append('file_attachment', selectedFile);

    try {
      await supervisorFeedbackApi.ingest(projectId, formData);
      setSuccess(`${activeTab} feedback document ingested.`);
      setSelectedFile(null);
      if (onRefreshFeedbacks) onRefreshFeedbacks();
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest file');
    } finally {
      setLoading(false);
    }
  };

  const handleIngestInlineThreads = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await supervisorFeedbackApi.ingest(projectId, {
        source_type: 'INLINE_THREAD_IMPORT',
        raw_content: 'Aggregated from inline manuscript comments',
        title: 'Aggregated Inline Comments',
      });
      setSuccess('Open manuscript comments aggregated into feedback review.');
      if (onRefreshFeedbacks) onRefreshFeedbacks();
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message || 'Failed to aggregate comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFeedback = async (feedbackId: string) => {
    setAnalyzingId(feedbackId);
    setError(null);
    try {
      const res = await supervisorFeedbackApi.analyze(feedbackId, true);
      setAnalysisReport(res);
      setSuccess(`AI Analysis complete! Created ${res.tasks_count} revision tasks.`);
      if (onAnalysisComplete) onAnalysisComplete();
      fetchFeedbacks();
    } catch (err: any) {
      setError(err.message || 'Failed to analyze feedback');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Supervisor Feedback Assistant</h2>
          <p className="text-sm text-slate-500">
            Ingest manual notes, Word comments/tracked changes, or PDF markups, and run AI correction analysis.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Analysis Result Banner */}
      {analysisReport && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-indigo-950">
              AI Correction Analysis Summary ({analysisReport.tasks_count} Tasks Generated)
            </h3>
            <button
              onClick={() => setAnalysisReport(null)}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Dismiss
            </button>
          </div>

          {analysisReport.conflicts && analysisReport.conflicts.length > 0 && (
            <div className="bg-amber-100/70 border border-amber-300 rounded-lg p-3 text-xs text-amber-900 space-y-1">
              <span className="font-bold">Conflicting Instructions Detected:</span>
              {analysisReport.conflicts.map((c: any, i: number) => (
                <p key={i}>• {c.message}</p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(analysisReport.category_breakdown || {}).map(([cat, count]: [string, any]) =>
              count > 0 ? (
                <span
                  key={cat}
                  className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white border border-indigo-200 text-indigo-800"
                >
                  {cat.replace(/_/g, ' ')}: {count}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Ingestion Tabs */}
      <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/50">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          {(
            [
              { id: 'MANUAL', label: 'Manual Notes' },
              { id: 'DOCX', label: 'Word (DOCX)' },
              { id: 'PDF', label: 'PDF Document' },
              { id: 'INLINE', label: 'Import Inline Threads' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'MANUAL' && (
          <form onSubmit={handleIngestManual} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Paste Supervisor Notes, Email Feedback, or Committee Remarks:
            </label>
            <textarea
              rows={4}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="e.g. 1. Strengthen literature gap in Chapter 2&#10;2. Add confidence intervals to Table 4&#10;3. Clarify sample size limitations..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !manualText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Ingesting...' : 'Ingest Manual Comments'}
              </button>
            </div>
          </form>
        )}

        {(activeTab === 'DOCX' || activeTab === 'PDF') && (
          <form onSubmit={handleIngestFile} className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Upload Annotated {activeTab} File:
            </label>
            <input
              type="file"
              accept={activeTab === 'DOCX' ? '.docx' : '.pdf'}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {activeTab === 'PDF' && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs leading-relaxed">
                <strong>Notice:</strong> PDF text extraction automatically runs. Note: Handwritten margin notes, sticky notes, or graphical drawings in PDFs cannot be parsed automatically and require manual review.
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Uploading & Extracting...' : `Upload & Extract ${activeTab}`}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'INLINE' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Aggregate all open inline manuscript comments and replies into a unified supervisor review artifact for AI categorizing.
            </p>
            <button
              onClick={handleIngestInlineThreads}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Inline Threads as Feedback'}
            </button>
          </div>
        )}
      </div>

      {/* Existing Feedbacks List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Ingested Feedback Sources ({feedbacks.length})
        </h3>
        {feedbacks.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No supervisor feedback sources recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="border border-slate-200 rounded-xl p-4 bg-white hover:border-slate-300 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-xs text-slate-900">
                      {fb.title || `Feedback (${fb.source_type})`}
                    </span>
                    <span className="ml-2 text-[10px] text-slate-400">
                      by {fb.uploaded_by_name} • {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-md">
                      {fb.source_type.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => handleAnalyzeFeedback(fb.id)}
                      disabled={analyzingId === fb.id}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
                    >
                      {analyzingId === fb.id ? 'Analyzing...' : '⚡ AI Correction Analysis'}
                    </button>
                  </div>
                </div>

                {fb.has_unextracted_annotations && (
                  <div className="p-2 bg-amber-50 border-l-2 border-amber-400 text-amber-800 text-[11px] rounded-r">
                    PDF text extraction complete. Graphical margin annotations require manual verification.
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-700 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {fb.raw_content || 'No raw text stored.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorFeedbackWorkspace;

