'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CorrectionTask,
  CorrectionCategory,
  CorrectionPriority,
  CorrectionTaskStatus,
  CollaboratorRole,
} from '@/types/project';
import { correctionTasksApi } from '@/lib/api';

interface CorrectionTrackerProps {
  projectId: string;
  documentId?: string;
  tasks?: CorrectionTask[];
  currentUserRole?: CollaboratorRole | null;
  onRefreshTasks?: () => void;
  onSelectTaskSection?: (sectionId?: string) => void;
}

export const CorrectionTracker: React.FC<CorrectionTrackerProps> = ({
  projectId,
  documentId,
  tasks: propTasks,
  currentUserRole,
  onRefreshTasks,
  onSelectTaskSection,
}) => {
  const [tasks, setTasks] = useState<CorrectionTask[]>(propTasks || []);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await correctionTasksApi.list(projectId);
      setTasks(data);
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    if (propTasks !== undefined) {
      setTasks(propTasks);
    } else {
      fetchTasks();
    }
  }, [propTasks, fetchTasks]);

  const isSupervisorOrOwner =
    currentUserRole === 'SUPERVISOR' ||
    currentUserRole === 'PROJECT_OWNER' ||
    !currentUserRole;

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  const handleApplyCorrection = async (task: CorrectionTask, force: boolean = false) => {
    setLoadingTaskId(task.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await correctionTasksApi.apply(task.id, { force_override: force });
      setSuccess(`Correction applied! Created new document snapshot version ${res.new_document_version}.`);
      if (onRefreshTasks) onRefreshTasks();
      fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to apply correction');
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleReviewTask = async (
    taskId: string,
    decision: 'APPROVE' | 'REJECT' | 'RESOLVE' | 'REOPEN'
  ) => {
    setLoadingTaskId(taskId);
    setError(null);
    setSuccess(null);
    try {
      await correctionTasksApi.review(taskId, { decision });
      setSuccess(`Task marked as ${decision.toLowerCase()}d.`);
      if (onRefreshTasks) onRefreshTasks();
      fetchTasks();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoadingTaskId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Revision & Correction Tracker</h2>
          <p className="text-sm text-slate-500">
            Track supervisor action items, apply evidence-grounded revisions, and verify approval lifecycles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="READY_FOR_REVIEW">Ready for Review</option>
            <option value="APPROVED">Approved</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
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

      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm italic">
          No revision tasks match the selected criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`border rounded-xl p-5 space-y-4 transition ${
                t.status === 'APPROVED' || t.status === 'RESOLVED'
                  ? 'bg-slate-50/60 border-slate-200'
                  : 'bg-white border-slate-200 hover:border-indigo-200 shadow-2xs'
              }`}
            >
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {t.title || `Task: ${t.category.replace(/_/g, ' ')}`}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                    {t.category.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      t.priority === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : t.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t.priority}
                  </span>
                  {t.section_title && (
                    <button
                      onClick={() => onSelectTaskSection && onSelectTaskSection(t.section)}
                      className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-medium"
                    >
                      {t.section_title}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                      t.status === 'APPROVED' || t.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'READY_FOR_REVIEW'
                        ? 'bg-blue-100 text-blue-800'
                        : t.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status.replace(/_/g, ' ')}
                  </span>
                  {t.expected_base_version && (
                    <span className="text-[10px] text-slate-400">
                      base v{t.expected_base_version}
                    </span>
                  )}
                </div>
              </div>

              {/* Stale Warning Banner */}
              {t.is_stale_after_subsequent_edit && (
                <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-900 text-xs rounded-r space-y-0.5">
                  <div className="font-bold">⚠️ Subsequent Edits Detected</div>
                  <p>
                    This section was modified after supervisor approval. Prior approval is flagged for re-review.
                  </p>
                </div>
              )}

              {/* Instruction */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Supervisor Instruction:
                </span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                  {t.instruction || t.supervisor_instruction}
                </p>
              </div>

              {/* Proposed Revision Preview */}
              {t.proposed_text && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Proposed Revision:
                  </span>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {t.proposed_text}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <div className="text-[11px] text-slate-400">
                  Created {new Date(t.created_at).toLocaleDateString()}
                </div>

                <div className="flex items-center gap-2">
                  {/* Researcher apply button */}
                  {t.status !== 'APPROVED' && t.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleApplyCorrection(t)}
                      disabled={loadingTaskId === t.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition shadow-xs disabled:opacity-50"
                    >
                      {loadingTaskId === t.id ? 'Applying...' : 'Apply Revision to Section'}
                    </button>
                  )}

                  {/* Supervisor review controls */}
                  {isSupervisorOrOwner && (
                    <>
                      {t.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleReviewTask(t.id, 'APPROVE')}
                          disabled={loadingTaskId === t.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition shadow-xs disabled:opacity-50"
                        >
                          ✓ Approve
                        </button>
                      )}
                      {t.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleReviewTask(t.id, 'REJECT')}
                          disabled={loadingTaskId === t.id}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
                        >
                          ✕ Reject
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CorrectionTracker;

