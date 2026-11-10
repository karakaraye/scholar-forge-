'use client';

import React, { useState, useEffect } from 'react';
import { PreliminaryPagesResult, PrelimPageDetail } from '@/types/formatting';
import { preliminaryPagesApi } from '@/lib/api';

interface PreliminaryPagesWorkspaceProps {
  projectId: string;
}

export const PreliminaryPagesWorkspace: React.FC<PreliminaryPagesWorkspaceProps> = ({
  projectId,
}) => {
  const [data, setData] = useState<PreliminaryPagesResult | null>(null);
  const [selectedPageKey, setSelectedPageKey] = useState<string>('title_page');
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata form state
  const [authorName, setAuthorName] = useState<string>('');
  const [matricNo, setMatricNo] = useState<string>('');
  const [degree, setDegree] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [institution, setInstitution] = useState<string>('');
  const [supervisor, setSupervisor] = useState<string>('');
  const [month, setMonth] = useState<string>('June');
  const [year, setYear] = useState<string>('2026');
  const [showMetadataModal, setShowMetadataModal] = useState<boolean>(false);

  useEffect(() => {
    loadPreliminaryPages();
  }, [projectId]);

  const loadPreliminaryPages = async () => {
    setLoading(true);
    try {
      const res = await preliminaryPagesApi.getPreliminaryPages(projectId);
      setData(res);
      if (res.preliminary_pages && !res.preliminary_pages[selectedPageKey]) {
        const firstKey = Object.keys(res.preliminary_pages)[0];
        if (firstKey) setSelectedPageKey(firstKey);
      }
    } catch (err: any) {
      setError('Failed to load preliminary pages');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (authorName) payload.author_name = authorName;
      if (matricNo) payload.matric_no = matricNo;
      if (degree) payload.degree = degree;
      if (department) payload.department = department;
      if (institution) payload.institution = institution;
      if (supervisor) payload.supervisor = supervisor;
      if (month) payload.month = month;
      if (year) payload.year = year;

      const res = await preliminaryPagesApi.generatePreliminaryPages(projectId, payload);
      setData(res);
      setShowMetadataModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate preliminary pages');
    } finally {
      setGenerating(false);
    }
  };

  const pagesMap = data?.preliminary_pages || {};
  const pageEntries = Object.entries(pagesMap);
  const activePage: PrelimPageDetail | undefined = pagesMap[selectedPageKey];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📜</span> Preliminary Pages & Front Matter Engine
          </h3>
          <p className="text-xs text-slate-500">
            Compliant academic front matter with transparent metadata placeholders and automatic TOC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMetadataModal(true)}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            ✏️ Edit Thesis Metadata
          </button>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {generating ? 'Regenerating...' : '🔄 Re-assemble Pages'}
          </button>
        </div>
      </div>

      {/* Physical Layout Verification Transparency Notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
        <span className="text-base leading-none">⚠️</span>
        <div>
          <strong>Verification Notice:</strong> Physical page layout and exact Roman pagination boundaries are
          designated <span className="font-semibold text-amber-950 underline decoration-amber-500">NOT_VERIFIED</span> in
          HTML web preview. Authoritative physical layout is strictly measured and compiled during PDF and DOCX export.
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Generating academic preliminary pages...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
          {/* Left: Page List */}
          <div className="md:col-span-1 space-y-1">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
              Front Matter Pages
            </h4>
            {pageEntries.map(([key, page]) => {
              const isSelected = selectedPageKey === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPageKey(key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{page.title}</span>
                  <span
                    className={`font-mono text-[10px] ml-2 ${
                      isSelected ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {page.roman_page}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Preview Pane */}
          <div className="md:col-span-3 border border-slate-200 rounded-xl bg-slate-50 p-6 flex flex-col min-h-[500px]">
            {activePage ? (
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg p-8 flex-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{activePage.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      Page Number: <strong className="font-mono text-slate-600">{activePage.roman_page}</strong> (Preliminary Format)
                    </span>
                  </div>
                  {activePage.is_required && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                      Mandatory Page
                    </span>
                  )}
                </div>

                {/* Rendered HTML */}
                <div
                  className="prose prose-sm max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: activePage.html }}
                />
              </div>
            ) : (
              <div className="m-auto text-slate-400 text-xs">Select a page to preview</div>
            )}
          </div>
        </div>
      )}

      {/* Metadata Input Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-900">Thesis & Institutional Metadata</h4>
            <p className="text-xs text-slate-500">
              Provide authentic degree parameters. Unprovided fields will retain explicit transparent placeholders.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Author Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Matric / Student No</label>
                <input
                  type="text"
                  placeholder="e.g. 2024/MPH/892"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Degree Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master of Science (M.Sc)"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Department of Epidemiology"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution</label>
                <input
                  type="text"
                  placeholder="e.g. University of Ibadan"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Lead Supervisor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Eleanor Hawthorne"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Submission Month</label>
                <input
                  type="text"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Submission Year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded"
              >
                Apply & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

