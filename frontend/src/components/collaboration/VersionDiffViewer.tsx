'use client';

import React, { useState, useEffect } from 'react';
import { VersionDiffComparison } from '@/types/project';
import { documentDiffApi } from '@/lib/api';

interface VersionDiffViewerProps {
  documentId: string;
  currentVersionNumber?: number;
  availableVersions?: number[];
  onVersionRestored?: () => void;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  documentId,
  currentVersionNumber = 1,
  availableVersions = [],
  onVersionRestored,
}) => {
  const [baseVersion, setBaseVersion] = useState<number>(Math.max(1, currentVersionNumber - 1));
  const [targetVersion, setTargetVersion] = useState<number>(currentVersionNumber);
  const [diffData, setDiffData] = useState<VersionDiffComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate list of version numbers if not supplied
  const versionList =
    availableVersions.length > 0
      ? availableVersions
      : Array.from({ length: Math.max(1, currentVersionNumber) }, (_, i) => i + 1);

  const fetchDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentDiffApi.getDiff(documentId, baseVersion, targetVersion);
      setDiffData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate diff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchDiff();
    }
  }, [documentId, baseVersion, targetVersion]);

  const handleSafeRestore = async () => {
    if (!window.confirm(`Safely restore document to state of Version ${baseVersion}? (This creates a new version checkpoint, preserving history.)`)) {
      return;
    }
    setRestoring(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await documentDiffApi.restoreVersion(documentId, baseVersion);
      setSuccess(`Restored successfully to new version ${res.new_version}!`);
      if (onVersionRestored) onVersionRestored();
    } catch (err: any) {
      setError(err.message || 'Failed to restore version');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manuscript Version Comparison & Diff</h2>
          <p className="text-sm text-slate-500">
            High-precision word and paragraph revision analysis with non-destructive safe restoration.
          </p>
        </div>

        {/* Version selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Base:</span>
            <select
              value={baseVersion}
              onChange={(e) => setBaseVersion(Number(e.target.value))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
            >
              {versionList.map((v) => (
                <option key={v} value={v}>
                  v{v}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-400 text-xs">➔</span>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Target:</span>
            <select
              value={targetVersion}
              onChange={(e) => setTargetVersion(Number(e.target.value))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
            >
              {versionList.map((v) => (
                <option key={v} value={v}>
                  v{v}
                </option>
              ))}
            </select>
          </div>
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

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Computing high-precision manuscript diff...
        </div>
      ) : diffData ? (
        <div className="space-y-6">
          {/* Summary Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Words Added</div>
              <div className="text-lg font-bold text-emerald-600">
                +{diffData.word_diff.words_added}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Words Deleted</div>
              <div className="text-lg font-bold text-rose-600">
                -{diffData.word_diff.words_deleted}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Net Delta</div>
              <div
                className={`text-lg font-bold ${
                  diffData.word_diff.net_word_change >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                }`}
              >
                {diffData.word_diff.net_word_change >= 0 ? '+' : ''}
                {diffData.word_diff.net_word_change}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Unchanged Words</div>
              <div className="text-lg font-bold text-slate-700">
                {diffData.word_diff.words_unchanged}
              </div>
            </div>
          </div>

          {/* Unified Word Diff Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Word-by-Word Diff View (v{baseVersion} ➔ v{targetVersion})
              </h3>
              <button
                onClick={handleSafeRestore}
                disabled={restoring}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : `Safely Revert to v${baseVersion}`}
              </button>
            </div>

            <div className="p-5 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs leading-relaxed max-h-[450px] overflow-y-auto whitespace-pre-wrap select-text">
              {(Array.isArray(diffData.word_diff)
                ? diffData.word_diff
                : diffData.word_diff?.chunks || []
              ).map((chunk: any, idx: number) => {
                if (chunk.type === 'added') {
                  return (
                    <span
                      key={idx}
                      className="bg-emerald-900/80 text-emerald-300 px-1 py-0.5 rounded mx-0.5 font-semibold"
                    >
                      {chunk.text}{' '}
                    </span>
                  );
                }
                if (chunk.type === 'deleted') {
                  return (
                    <span
                      key={idx}
                      className="bg-rose-950 text-rose-400 line-through px-1 py-0.5 rounded mx-0.5 opacity-75"
                    >
                      {chunk.text}{' '}
                    </span>
                  );
                }
                return <span key={idx}>{chunk.text} </span>;
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VersionDiffViewer;

