'use client';

import React, { useState, useEffect } from 'react';
import { ManuscriptAssembly, CitationStyle } from '@/types/project';
import { assemblyApi } from '@/lib/api';
import {
  BookOpen,
  Printer,
  Download,
  Settings2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileCheck2,
  Layers,
  FileText,
  Bookmark,
  Calendar,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ManuscriptAssemblyViewerProps {
  projectId: string;
}

const CITATION_STYLES: CitationStyle[] = [
  'APA',
  'MLA',
  'CHICAGO',
  'HARVARD',
  'IEEE',
  'VANCOUVER',
];

export default function ManuscriptAssemblyViewer({ projectId }: ManuscriptAssemblyViewerProps) {
  const [assemblies, setAssemblies] = useState<ManuscriptAssembly[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<ManuscriptAssembly | null>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compilation options
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA');
  const [includePreliminary, setIncludePreliminary] = useState(true);
  const [includeToc, setIncludeToc] = useState(true);
  const [includeLot, setIncludeLot] = useState(true);
  const [includeLof, setIncludeLof] = useState(true);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeAppendices, setIncludeAppendices] = useState(true);

  const fetchAssemblies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assemblyApi.list(projectId);
      const list = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && 'id' in data
          ? [data as ManuscriptAssembly]
          : [];
      setAssemblies(list);
      if (list.length > 0) {
        setSelectedAssembly(list[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load manuscript assemblies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssemblies();
  }, [projectId]);

  const handleCompile = async () => {
    setCompiling(true);
    try {
      const compiled = await assemblyApi.compile(projectId, {
        citation_style: citationStyle,
        options: {
          include_preliminary_pages: includePreliminary,
          include_table_of_contents: includeToc,
          include_list_of_tables: includeLot,
          include_list_of_figures: includeLof,
          include_references: includeReferences,
          include_appendices: includeAppendices,
        },
      });
      setAssemblies((prev) => [compiled, ...prev]);
      setSelectedAssembly(compiled);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  const handlePrint = () => {
    if (!selectedAssembly?.compiled_html) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Manuscript Assembly</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2.0; color: #111; margin: 1in; }
            h1, h2, h3 { font-family: 'Times New Roman', Times, serif; line-height: 1.2; }
            .chapter-heading { page-break-before: always; font-size: 16pt; font-weight: bold; text-align: center; margin-top: 2rem; margin-bottom: 1.5rem; }
            .section-heading { font-size: 13pt; font-weight: bold; margin-top: 1.5rem; }
            .table-of-contents { page-break-after: always; }
            .toc-item { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
            .apa-table { width: 100%; border-top: 1.5pt solid black; border-bottom: 1.5pt solid black; border-collapse: collapse; margin: 1.5rem 0; }
            .apa-table th { border-bottom: 1pt solid black; padding: 6px; text-align: left; }
            .apa-table td { padding: 6px; }
            .references-list { list-style: none; padding-left: 0; }
            .reference-entry { padding-left: 0.5in; text-indent: -0.5in; margin-bottom: 0.75rem; }
          </style>
        </head>
        <body>
          ${selectedAssembly.compiled_html}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-800 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Manuscript Assembly Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assembly Control Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-navy-50 text-navy-900 rounded-xl">
              <BookOpen className="w-5 h-5 text-gold-500" />
            </span>
            <div>
              <h2 className="text-lg font-bold font-serif text-slate-900">
                End-to-End Manuscript Assembly Engine
              </h2>
              <p className="text-xs text-slate-500">
                Compiles preliminary pages, dynamic TOC, styled citations, tables, figures, and appendices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedAssembly && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 border border-slate-200 bg-white text-xs font-semibold text-slate-700 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-navy-800" />
                <span>Print / PDF Export</span>
              </button>
            )}
            <button
              type="button"
              disabled={compiling}
              onClick={handleCompile}
              className="px-4 py-2 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition flex items-center gap-1.5 shadow-sm"
            >
              {compiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
              <span>Compile Full Manuscript</span>
            </button>
          </div>
        </div>

        {/* Options Toggles */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includePreliminary}
              onChange={(e) => setIncludePreliminary(e.target.checked)}
              className="rounded text-navy-900 focus:ring-navy-900"
            />
            Preliminary Pages
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeToc}
              onChange={(e) => setIncludeToc(e.target.checked)}
              className="rounded text-navy-900 focus:ring-navy-900"
            />
            Table of Contents
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLot}
              onChange={(e) => setIncludeLot(e.target.checked)}
              className="rounded text-navy-900 focus:ring-navy-900"
            />
            List of Tables
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLof}
              onChange={(e) => setIncludeLof(e.target.checked)}
              className="rounded text-navy-900 focus:ring-navy-900"
            />
            List of Figures
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeReferences}
              onChange={(e) => setIncludeReferences(e.target.checked)}
              className="rounded text-navy-900 focus:ring-navy-900"
            />
            References / Bib
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAppendices}
              onChange={(e) => setIncludeAppendices(e.target.checked)}
              className="rounded text-navy-900 focus:ring-navy-900"
            />
            Appendices
          </label>
        </div>

        {/* Citation Style Bar */}
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-600">Citation Style:</span>
          <div className="flex flex-wrap gap-1">
            {CITATION_STYLES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setCitationStyle(st)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${citationStyle === st
                    ? 'bg-navy-950 text-gold-400 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assembly Preview & Metadata */}
      {selectedAssembly ? (
        <div className="space-y-4">
          {/* Metadata Badges Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="px-3 py-1 rounded-lg bg-navy-50 text-navy-900 text-xs font-bold">
                Assembly v{selectedAssembly.version_number || 1}
              </span>
              <span className="text-xs text-slate-600">
                Total Words:{' '}
                <strong className="text-navy-950 font-mono">
                  {(selectedAssembly.total_words ?? 0).toLocaleString()}
                </strong>
              </span>
              <span className="text-xs text-slate-600">
                Citations:{' '}
                <strong className="text-navy-950 font-mono">
                  {selectedAssembly.reference_count || 0}
                </strong>
              </span>
              <span className="text-xs text-slate-600">
                Tables:{' '}
                <strong className="text-navy-950 font-mono">
                  {selectedAssembly.table_count || 0}
                </strong>
              </span>
              <span className="text-xs text-slate-600">
                Figures:{' '}
                <strong className="text-navy-950 font-mono">
                  {selectedAssembly.figure_count || 0}
                </strong>
              </span>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Compiled {formatDate(selectedAssembly.created_at)}
            </div>
          </div>

          {/* Rendered HTML Manuscript Preview */}
          <div className="bg-white border border-slate-300 rounded-2xl p-8 sm:p-12 shadow-md max-w-4xl mx-auto font-serif">
            <div
              className="prose prose-slate max-w-none text-slate-900 leading-loose"
              dangerouslySetInnerHTML={{ __html: selectedAssembly.compiled_html }}
            />
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white border border-slate-200 rounded-2xl text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No Compiled Assembly Yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Click &quot;Compile Full Manuscript&quot; above to assemble all manuscript chapters, preliminary pages, and bibliography into an integrated document.
          </p>
        </div>
      )}
    </div>
  );
}
