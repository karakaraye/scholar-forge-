'use client';

import React from 'react';
import { DocumentExport } from '@/types/export';

interface ExportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  exports: DocumentExport[];
  onSelectExport: (exportItem: DocumentExport) => void;
  onDownloadExport: (exportItem: DocumentExport) => void;
  onDeleteExport: (exportId: string) => void;
}

export const ExportHistoryDrawer: React.FC<ExportHistoryDrawerProps> = ({
  isOpen,
  onClose,
  exports,
  onSelectExport,
  onDownloadExport,
  onDeleteExport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Document Export History</h3>
            <p className="text-xs text-slate-500">Previously generated Word and PDF artifacts</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List of Exports */}
        <div className="flex-1 overflow-auto p-5 space-y-3">
          {exports.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <svg className="w-8 h-8 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium">No previous exports recorded.</p>
            </div>
          ) : (
            exports.map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 shadow-sm transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exp.export_format === 'DOCX'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {exp.export_format}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                      {exp.file_name}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(exp.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">File Size:</span>
                    <span className="font-mono">{(exp.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Pages:</span>
                    <span>{exp.page_count || 'Multi-page'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectExport(exp);
                      onClose();
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Inspect QA
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDownloadExport(exp)}
                      className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExport(exp.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 px-1 py-1"
                      title="Delete Export"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

