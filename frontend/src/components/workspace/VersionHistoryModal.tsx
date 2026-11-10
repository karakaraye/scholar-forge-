'use client';

import React, { useState } from 'react';
import { DocumentVersion } from '@/types/project';
import { formatDate } from '@/lib/utils';
import {
  History,
  RotateCcw,
  CheckCircle,
  Plus,
  X,
  Loader2,
  Calendar,
  User,
  ShieldAlert,
} from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: DocumentVersion[];
  currentVersionNumber: number;
  onCreateSnapshot: (summary: string) => Promise<void>;
  onRestoreVersion: (versionId: string) => Promise<void>;
  loading: boolean;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  currentVersionNumber,
  onCreateSnapshot,
  onRestoreVersion,
  loading,
}: VersionHistoryModalProps) {
  const [newSummary, setNewSummary] = useState('');
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [selectedToRestore, setSelectedToRestore] = useState<DocumentVersion | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!isOpen) return null;

  const handleTakeSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await onCreateSnapshot(newSummary.trim() || 'Manual revision checkpoint');
      setNewSummary('');
      setIsTakingSnapshot(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedToRestore) return;
    setActionLoading(true);
    try {
      await onRestoreVersion(selectedToRestore.id);
      setSelectedToRestore(null);
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-navy-900" />
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900">
                Manuscript Revision History
              </h3>
              <p className="text-xs text-slate-500">
                Current Active: <strong className="text-navy-900">v{currentVersionNumber}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshot creator trigger */}
        <div className="pt-4 pb-2">
          {isTakingSnapshot ? (
            <form
              onSubmit={handleTakeSnapshot}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
            >
              <label className="text-xs font-bold text-slate-700 block">
                Create Version Checkpoint
              </label>
              <input
                type="text"
                placeholder="Summary of changes (e.g., Completed Chapter 3 Methodology drafting)..."
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-navy-900"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsTakingSnapshot(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-semibold hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-lg hover:bg-navy-800 transition disabled:opacity-50"
                >
                  Save Checkpoint
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsTakingSnapshot(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-navy-900 text-navy-900 text-xs font-bold transition flex items-center justify-center gap-1.5 bg-slate-50/50 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 text-gold-500" />
              <span>Create Manual Revision Snapshot</span>
            </button>
          )}
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 py-2 pr-1">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-navy-900 mx-auto mb-2" />
              <span className="text-xs text-slate-500">Loading version snapshots...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No previous version snapshots found.
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.version_number === currentVersionNumber;
              const sectionCount = ver.snapshot_data?.sections?.length || 0;

              return (
                <div
                  key={ver.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isCurrent
                      ? 'bg-navy-950 text-white border-navy-900 shadow-sm'
                      : 'bg-white hover:border-slate-300 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isCurrent
                            ? 'bg-navy-800 text-gold-400 border border-navy-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        v{ver.version_number}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Current Active
                        </span>
                      )}
                      <span
                        className={`text-xs font-semibold truncate ${
                          isCurrent ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {ver.change_summary || 'Manual snapshot'}
                      </span>
                    </div>

                    <div
                      className={`flex flex-wrap items-center gap-3 text-[11px] ${
                        isCurrent ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(ver.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {ver.created_by_name || 'Scholar'}
                      </span>
                      <span>{sectionCount} sections archived</span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => setSelectedToRestore(ver)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-navy-900 text-navy-900 bg-white hover:bg-slate-50 text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gold-500" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Restore Confirmation Alert */}
        {selectedToRestore && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h5 className="font-bold text-amber-950">
                  Restore Manuscript to Version {selectedToRestore.version_number}?
                </h5>
                <p className="mt-1 leading-relaxed">
                  ScholarForge AI creates a safe automatic checkpoint of your current manuscript before
                  restoring. Past revisions are never erased.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setSelectedToRestore(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-700 hover:bg-amber-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-navy-950 text-gold-400 font-bold text-xs hover:bg-navy-900 transition flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Restore</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
