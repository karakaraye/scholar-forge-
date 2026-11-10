'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  JournalReviewerResponse,
  RevisionCategory,
  JournalResponseMatrixDoc,
} from '@/types/project';
import { journalReviewApi } from '@/lib/api';

interface JournalReviewMatrixProps {
  projectId: string;
  initialItems?: JournalReviewerResponse[];
  onRefreshItems?: () => void;
}

export const JournalReviewMatrix: React.FC<JournalReviewMatrixProps> = ({
  projectId,
  initialItems,
  onRefreshItems,
}) => {
  const [items, setItems] = useState<JournalReviewerResponse[]>(initialItems || []);
  const [isAdding, setIsAdding] = useState(false);
  const [reviewerLabel, setReviewerLabel] = useState('Reviewer 1');
  const [commentNumber, setCommentNumber] = useState<number>((initialItems?.length || 0) + 1);
  const [originalComment, setOriginalComment] = useState('');
  const [revisionCategory, setRevisionCategory] = useState<RevisionCategory>('MINOR');
  const [authorResponse, setAuthorResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResponseText, setEditResponseText] = useState('');
  const [matrixDoc, setMatrixDoc] = useState<JournalResponseMatrixDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await journalReviewApi.list(projectId);
      setItems(data);
      setCommentNumber(data.length + 1);
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    if (initialItems !== undefined) {
      setItems(initialItems);
      setCommentNumber(initialItems.length + 1);
    } else {
      fetchItems();
    }
  }, [initialItems, fetchItems]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalComment.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newItem = await journalReviewApi.create(projectId, {
        reviewer_label: reviewerLabel,
        comment_number: Number(commentNumber),
        original_comment: originalComment.trim(),
        revision_category: revisionCategory,
        author_response: authorResponse.trim(),
      });
      setItems((prev) => [...prev, newItem]);
      setSuccess('Reviewer comment added to matrix.');
      setOriginalComment('');
      setAuthorResponse('');
      setIsAdding(false);
      setCommentNumber(items.length + 2);
      if (onRefreshItems) onRefreshItems();
    } catch (err: any) {
      setError(err.message || 'Failed to create reviewer comment');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResponse = async (id: string) => {
    try {
      const updated = await journalReviewApi.update(id, {
        author_response: editResponseText,
      });
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
      setSuccess('Author response updated.');
      if (onRefreshItems) onRefreshItems();
    } catch (err: any) {
      setError(err.message || 'Failed to update response');
    }
  };

  const handleExportDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const doc = await journalReviewApi.getMatrixDocument(projectId);
      setMatrixDoc(doc);
    } catch (err: any) {
      setError(err.message || 'Failed to generate matrix document');
    } finally {
      setLoading(false);
    }
  };

  const appliedCount = items.filter((i) => i.is_verified_applied).length;
  const compliancePercent = items.length > 0 ? Math.round((appliedCount / items.length) * 100) : 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Journal Reviewer Point-by-Point Response Matrix
          </h2>
          <p className="text-sm text-slate-500">
            Systematic peer-review response matrix with verified applied tracking and rebuttal synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDocument}
            disabled={loading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            Export Response Document
          </button>
          <button
            onClick={() => setIsAdding((prev) => !prev)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition shadow-xs"
          >
            {isAdding ? 'Cancel' : '+ Add Reviewer Point'}
          </button>
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

      {/* Progress Metric */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs">
        <div>
          <span className="font-semibold text-slate-700">Verified Applied Compliance: </span>
          <span className="font-bold text-indigo-700">
            {appliedCount} of {items.length} points applied ({compliancePercent}%)
          </span>
        </div>
        <div className="w-36 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${compliancePercent}%` }}
          />
        </div>
      </div>

      {/* Matrix Document Preview Modal/Banner */}
      {matrixDoc && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <span className="font-bold uppercase tracking-wider text-indigo-300">
              Formatted Response to Reviewers Document
            </span>
            <button
              onClick={() => setMatrixDoc(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
            {matrixDoc.formatted_markdown}
          </div>
        </div>
      )}

      {/* Add Reviewer Point Form */}
      {isAdding && (
        <form onSubmit={handleCreateItem} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Add Reviewer Critique Point
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Label</label>
              <input
                type="text"
                value={reviewerLabel}
                onChange={(e) => setReviewerLabel(e.target.value)}
                placeholder="e.g. Reviewer 1, Reviewer 2, Editor"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Comment #</label>
              <input
                type="number"
                value={commentNumber}
                onChange={(e) => setCommentNumber(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Revision Category</label>
              <select
                value={revisionCategory}
                onChange={(e) => setRevisionCategory(e.target.value as RevisionCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="MAJOR">Major Revision</option>
                <option value="MINOR">Minor Revision</option>
                <option value="CLARIFICATION">Clarification</option>
                <option value="REJECT_REQUEST">Rebuttal / Declined Revision</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Original Reviewer Comment (Verbatim):
            </label>
            <textarea
              rows={3}
              value={originalComment}
              onChange={(e) => setOriginalComment(e.target.value)}
              placeholder="Quote the exact reviewer critique..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Author Response / Plan:
            </label>
            <textarea
              rows={2}
              value={authorResponse}
              onChange={(e) => setAuthorResponse(e.target.value)}
              placeholder="Explain how this comment was addressed or outline rebuttal rationale..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50"
            >
              Save Point
            </button>
          </div>
        </form>
      )}

      {/* Point-by-point Table */}
      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm italic">
          No reviewer response points added yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-xl p-5 space-y-3 bg-white hover:border-indigo-100 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">
                    {item.reviewer_label} — Point {item.comment_number}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full">
                    {item.revision_category}
                  </span>
                </div>
                <div>
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                      item.is_verified_applied
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.is_verified_applied ? '✓ Verified Applied' : '⏳ Pending Application'}
                  </span>
                </div>
              </div>

              {/* Reviewer Comment Quote */}
              <div className="bg-slate-50 border-l-3 border-indigo-400 p-3 rounded-r text-xs text-slate-800 italic">
                &ldquo;{item.original_comment}&rdquo;
              </div>

              {/* Author Response */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 uppercase">
                  Author Response:
                </span>
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editResponseText}
                      onChange={(e) => setEditResponseText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveResponse(item.id)}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {item.author_response || (
                        <span className="text-slate-400 italic">No response formulated yet.</span>
                      )}
                    </p>
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditResponseText(item.author_response || '');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
                    >
                      Edit Response
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalReviewMatrix;

