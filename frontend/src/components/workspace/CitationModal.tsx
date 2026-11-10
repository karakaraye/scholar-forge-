'use client';

import React, { useState, useEffect } from 'react';
import { ResearchSource, CitationStyle } from '@/types/project';
import { citationsApi, projectSourcesApi } from '@/lib/api';
import {
  Quote,
  Search,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  Copy,
  Check,
  Plus,
} from 'lucide-react';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onInsertCitation: (citationText: string, source: ResearchSource, format: 'PARENTHETICAL' | 'NARRATIVE') => void;
}

export default function CitationModal({
  isOpen,
  onClose,
  projectId,
  onInsertCitation,
}: CitationModalProps) {
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<ResearchSource | null>(null);
  const [style, setStyle] = useState<CitationStyle>('APA_7TH');
  const [citationType, setCitationType] = useState<'PARENTHETICAL' | 'NARRATIVE'>('PARENTHETICAL');
  const [previewText, setPreviewText] = useState('');
  const [previewBib, setPreviewBib] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectSources();
    }
  }, [isOpen, projectId]);

  const loadProjectSources = async () => {
    setLoading(true);
    try {
      const data = await projectSourcesApi.list(projectId);
      const mapped = data.map((ps: any) => ps.source || ps);
      setSources(mapped);
      if (mapped.length > 0) {
        setSelectedSource(mapped[0]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  // Re-generate preview whenever selectedSource, style, or citationType changes
  useEffect(() => {
    if (!selectedSource || !projectId) return;

    const fetchFormatPreview = async () => {
      setIsFormatting(true);
      try {
        const resp = await citationsApi.formatCitation(projectId, {
          source_ids: [selectedSource.id],
          style: style,
          format_type: citationType === 'NARRATIVE' ? 'narrative' : 'parenthetical',
        });
        setPreviewText(resp.in_text_citation);
        setPreviewBib(resp.bibliography_entry || '');
      } catch {
        // Fallback local preview
        const firstAuthor = selectedSource.authors[0] || 'Author';
        const year = selectedSource.publication_year || 'n.d.';
        if (citationType === 'NARRATIVE') {
          setPreviewText(`${firstAuthor} et al. (${year})`);
        } else {
          setPreviewText(`(${firstAuthor} et al., ${year})`);
        }
      } finally {
        setIsFormatting(false);
      }
    };

    fetchFormatPreview();
  }, [selectedSource, style, citationType, projectId]);

  if (!isOpen) return null;

  const filteredSources = sources.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.authors?.some((a) => a.toLowerCase().includes(q));
  });

  const handleInsert = () => {
    if (!selectedSource || !previewText) return;
    onInsertCitation(previewText, selectedSource, citationType);
    onClose();
  };

  const copyToClipboard = () => {
    if (!previewText) return;
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-gold-600" />
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">Insert Scholarly Citation</h3>
              <p className="text-[11px] text-slate-500">
                Cite authentic verified literature attached to this research project.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Style & Type Controls */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Citation Standard</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as CitationStyle)}
                className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="APA_7TH">APA 7th Edition</option>
                <option value="MLA_9TH">MLA 9th Edition</option>
                <option value="CHICAGO_17TH">Chicago 17th (Author-Date)</option>
                <option value="HARVARD">Harvard Referencing</option>
                <option value="IEEE">IEEE (Numbered)</option>
                <option value="VANCOUVER">Vancouver (Numbered)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Citation Format</label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setCitationType('PARENTHETICAL')}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    citationType === 'PARENTHETICAL'
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Parenthetical
                </button>
                <button
                  type="button"
                  onClick={() => setCitationType('NARRATIVE')}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    citationType === 'NARRATIVE'
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Narrative
                </button>
              </div>
            </div>
          </div>

          {/* Search Source */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attached sources by title or author..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-900"
            />
          </div>

          {/* Source List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-gold-500" />
                <span>Loading project sources...</span>
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <BookOpen className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p>No project sources found.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Attach references to this project from the Research Library first.
                </p>
              </div>
            ) : (
              filteredSources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={`p-3 text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                    selectedSource?.id === source.id ? 'bg-navy-50/70 border-l-4 border-navy-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 line-clamp-1">{source.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {source.authors.join(', ')} ({source.publication_year || 'n.d.'})
                    </p>
                  </div>

                  {source.verification_status === 'WITHDRAWN_OR_RETRACTED' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                      RETRACTED
                    </span>
                  )}
                  {source.verification_status === 'METADATA_VERIFIED' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      VERIFIED
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Live Preview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                In-Text Citation Preview
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="text-[11px] font-semibold text-navy-800 hover:text-gold-600 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="font-mono text-sm font-bold text-navy-950 p-2.5 bg-white rounded-lg border border-slate-200">
              {isFormatting ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Formatting according to {style}...</span>
                </div>
              ) : (
                previewText || 'Select a reference above'
              )}
            </div>

            {previewBib && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Bibliography Entry Format
                </span>
                <p className="text-[11px] text-slate-600 italic line-clamp-2">{previewBib}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!selectedSource || !previewText}
            className="px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
          >
            <Quote className="w-3.5 h-3.5 text-gold-400" />
            <span>Insert In-Text Citation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
