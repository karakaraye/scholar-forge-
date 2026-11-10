'use client';

import React, { useState } from 'react';
import { ExportPreview, DocumentExportFormat } from '@/types/export';

interface RenderedDocumentPreviewProps {
  preview: ExportPreview | null;
  selectedFormat: DocumentExportFormat;
  isLoading: boolean;
}

export const RenderedDocumentPreview: React.FC<RenderedDocumentPreviewProps> = ({
  preview,
  selectedFormat,
  isLoading,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (isLoading || !preview) {
    return (
      <div className="bg-slate-100/80 rounded-xl border border-slate-200/80 h-full flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Compiling Document Layout & Pagination Preview...</p>
      </div>
    );
  }

  // Combine preliminary pages + body chapters + bibliography into virtual pages list
  const totalPages = Math.max(1, preview.estimated_pages);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Determine what content to display on the virtual current page
  const isTitlePage = currentPage === 1;
  const isPrelimPage = currentPage > 1 && currentPage <= (preview.preliminary_pages?.length || 0);
  const prelimIndex = currentPage - 1;
  const activePrelim = isPrelimPage && preview.preliminary_pages ? preview.preliminary_pages[prelimIndex] : null;

  const docTitle = preview.title || (preview as any).manuscript_title || (preview as any).project_title || 'UNTITLED RESEARCH';
  const docAuthor = preview.author || (preview as any).author_name || 'AUTHOR';
  const docInstitution = preview.institution || (preview as any).institution_name || 'Institutional Affiliation';
  const docDegree = preview.degree || (preview as any).degree_level || 'DOCTOR OF PHILOSOPHY';

  return (
    <div className="bg-slate-100 rounded-xl border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Top Preview Controls Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700">
        {/* Left: Document details */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Document Layout Preview</span>
          <span className="text-slate-300">|</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
            {selectedFormat} • {preview.layout.paper_size}
          </span>
        </div>

        {/* Center: Pagination Navigator */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={handlePrevPage}
            className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="px-1 text-slate-700 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={handleNextPage}
            className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right: Zoom Level Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Zoom Out"
            onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-mono text-[11px]"
          >
            -
          </button>
          <button
            type="button"
            title="Reset Zoom"
            onClick={() => setZoomLevel(100)}
            className="font-mono text-[11px] w-12 text-center text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            {zoomLevel}%
          </button>
          <button
            type="button"
            title="Zoom In"
            onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded font-mono text-[11px]"
          >
            +
          </button>
        </div>
      </div>

      {/* Main Preview Sheet Workspace */}
      <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
        <div
          className="bg-white shadow-xl border border-slate-300 rounded-sm relative flex flex-col justify-between transition-transform duration-200"
          style={{
            width: `${(preview.layout.paper_size === 'LETTER' ? 8.5 : 8.27) * 72 * (zoomLevel / 100)}px`,
            minHeight: `${(preview.layout.paper_size === 'LETTER' ? 11.0 : 11.69) * 72 * (zoomLevel / 100)}px`,
            padding: `${1.0 * 72 * (zoomLevel / 100)}px`,
            paddingLeft: `${(1.0 + preview.layout.binding_gutter_inches) * 72 * (zoomLevel / 100)}px`,
            fontFamily: preview.layout.primary_font || 'Times New Roman',
          }}
        >
          {/* Top Running Header (Suppressed on Page 1) */}
          {!isTitlePage && (
            <div className="border-b border-slate-200 pb-2 mb-6 flex justify-between text-[10px] text-slate-500 font-serif">
              <span className="truncate max-w-[70%]">{docTitle}</span>
              <span className="font-mono font-medium text-slate-700">
                {isPrelimPage ? 'ii' : currentPage - (preview.preliminary_pages?.length || 0)}
              </span>
            </div>
          )}

          {/* Page Content Body */}
          <div className="flex-1 space-y-6">
            {isTitlePage ? (
              /* Title Page Simulation */
              <div className="flex flex-col items-center justify-center text-center h-full space-y-8 pt-10">
                <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 max-w-md">
                  {docTitle}
                </h1>
                <p className="text-xs uppercase text-slate-500 tracking-widest">
                  A DISSERTATION SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE DEGREE OF
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {docDegree.toUpperCase()}
                </p>
                <div className="pt-8">
                  <p className="text-xs text-slate-400 uppercase">By</p>
                  <p className="text-base font-bold text-slate-900 tracking-wide">{docAuthor.toUpperCase()}</p>
                </div>
                <div className="pt-8 text-xs text-slate-700 space-y-1">
                  <p className="font-semibold">{docInstitution}</p>
                  <p className="text-slate-500">Academic Year 2026</p>
                </div>
              </div>
            ) : isPrelimPage && activePrelim ? (
              /* Preliminary Page Simulation (Abstract, TOC, etc.) */
              <div className="space-y-4">
                <h2 className="text-base font-bold text-center uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
                  {activePrelim.title}
                </h2>
                <div className="text-xs leading-relaxed text-slate-800 space-y-3 text-justify">
                  <p>
                    This empirical research investigates the intersection of computational structures and institutional academic guidelines.
                    The methodology follows reproducible, verified data frameworks ensuring adherence to published standards.
                  </p>
                  <p>
                    All parameters, data points, and references are grounded in verified sources without synthetic or fabricated data.
                  </p>
                </div>
              </div>
            ) : (
              /* Main Chapter Simulation */
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {preview.chapters[0]?.title || 'CHAPTER 1: INTRODUCTION'}
                </h2>
                <h3 className="text-sm font-semibold text-slate-800">
                  1.1 Background and Problem Formulation
                </h3>
                <div className="text-xs leading-loose text-slate-800 space-y-3 text-justify indent-6">
                  <p>
                    Academic document preparation requires meticulous attention to structural hierarchy, typographic conventions,
                    mathematical fidelity, and verifiable bibliographic references. In modern scholarly publishing, formatting consistency
                    directly impacts the integrity and accessibility of empirical contributions.
                  </p>
                  <div className="indent-0 p-3 bg-slate-50 border border-slate-200 rounded my-3 text-center font-serif italic text-slate-900">
                    {'L_m = \\sum_{i=1}^{n} \\frac{\\theta_i}{\\omega_i} + \\delta_c \u00A0\u00A0\u00A0\u00A0 (1)'}
                  </div>
                  <p>
                    Experimental evaluations demonstrate that strict adherence to standardized binding gutters and page layout metrics
                    substantially reduces physical production defects and layout drift across document formats.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Footer Pagination */}
          <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>ScholarForge AI Layout Engine</span>
            <span>
              {isTitlePage
                ? '[Title Page — Page Number Suppressed]'
                : isPrelimPage
                ? `Roman: ${['i', 'ii', 'iii', 'iv', 'v', 'vi'][currentPage - 1] || 'ii'}`
                : `Arabic: Page ${currentPage - preview.preliminary_pages.length}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

