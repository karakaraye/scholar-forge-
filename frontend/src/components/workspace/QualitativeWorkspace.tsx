'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ResearchProject,
  QualitativeTranscript,
  QualitativeCode,
  EvidenceExcerpt,
  QualitativeTheme,
} from '@/types/project';
import { qualitativeApi } from '@/lib/api';
import {
  FileText,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Layers,
  MessageSquare,
  Highlighter,
  ShieldCheck,
  Loader2,
  Quote
} from 'lucide-react';

interface QualitativeWorkspaceProps {
  project: ResearchProject;
  onInsertContent?: (html: string) => void;
  onRefreshConsistency?: () => void;
}

export default function QualitativeWorkspace({ project, onInsertContent, onRefreshConsistency }: QualitativeWorkspaceProps) {
  const [transcripts, setTranscripts] = useState<QualitativeTranscript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<QualitativeTranscript | null>(null);
  const [codes, setCodes] = useState<QualitativeCode[]>([]);
  const [themes, setThemes] = useState<QualitativeTheme[]>([]);

  const [loading, setLoading] = useState(false);
  const [creatingTranscript, setCreatingTranscript] = useState(false);
  const [creatingCode, setCreatingCode] = useState(false);
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [suggestingCodes, setSuggestingCodes] = useState(false);

  // New Transcript Form
  const [newTitle, setNewTitle] = useState('');
  const [newParticipant, setNewParticipant] = useState('');
  const [newType, setNewType] = useState('INTERVIEW');
  const [newContent, setNewContent] = useState('');

  // New Code Form
  const [newCodeName, setNewCodeName] = useState('');
  const [newCodeDesc, setNewCodeDesc] = useState('');
  const [newCodeColor, setNewCodeColor] = useState('#0f172a');

  // New Theme Form
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeNarrative, setNewThemeNarrative] = useState('');
  const [selectedThemeCodes, setSelectedThemeCodes] = useState<string[]>([]);

  // Text selection state for tagging excerpts
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [selectedQuote, setSelectedQuote] = useState('');
  const [startChar, setStartChar] = useState<number | null>(null);
  const [endChar, setEndChar] = useState<number | null>(null);
  const [selectedCodeId, setSelectedCodeId] = useState('');
  const [memo, setMemo] = useState('');
  const [tagging, setTagging] = useState(false);

  // Candidate AI Code Suggestions
  const [candidateCodes, setCandidateCodes] = useState<Array<Record<string, unknown>>>([]);

  // Load qualitative workspace data
  const loadData = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const [tList, cList, thList] = await Promise.all([
        qualitativeApi.listTranscripts(project.id),
        qualitativeApi.listCodes(project.id),
        qualitativeApi.listThemes(project.id),
      ]);
      setTranscripts(tList);
      if (tList.length > 0) {
        setSelectedTranscript(prev => prev ? tList.find(t => t.id === prev.id) || tList[0] : tList[0]);
      } else {
        setSelectedTranscript(null);
      }
      setCodes(cList);
      if (cList.length > 0 && !selectedCodeId) {
        setSelectedCodeId(cList[0].id);
      }
      setThemes(thList);
    } catch (err) {
      console.error('Failed to load qualitative data:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id, selectedCodeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create Transcript
  const handleCreateTranscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !newTitle.trim() || !newContent.trim()) return;
    setCreatingTranscript(true);
    try {
      const created = await qualitativeApi.createTranscript(project.id, {
        title: newTitle.trim(),
        content: newContent.trim(),
        participant_identifier: newParticipant.trim() || undefined,
        transcript_type: newType,
      });
      setTranscripts(prev => [created, ...prev]);
      setSelectedTranscript(created);
      setNewTitle('');
      setNewParticipant('');
      setNewContent('');
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create transcript');
    } finally {
      setCreatingTranscript(false);
    }
  };

  // Create Code
  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !newCodeName.trim()) return;
    setCreatingCode(true);
    try {
      const created = await qualitativeApi.createCode(project.id, {
        name: newCodeName.trim(),
        description: newCodeDesc.trim() || undefined,
        color: newCodeColor,
      });
      setCodes(prev => [...prev, created]);
      setSelectedCodeId(created.id);
      setNewCodeName('');
      setNewCodeDesc('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create code');
    } finally {
      setCreatingCode(false);
    }
  };

  // Text Selection Listener
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !selectedTranscript) return;

    const text = sel.toString().trim();
    if (!text) return;

    const fullContent = selectedTranscript.content;
    const startIndex = fullContent.indexOf(text);
    if (startIndex !== -1) {
      setSelectedQuote(text);
      setStartChar(startIndex);
      setEndChar(startIndex + text.length);
    }
  };

  // Tag Excerpt
  const handleTagExcerpt = async () => {
    if (!selectedTranscript || !selectedCodeId || !selectedQuote || startChar === null || endChar === null) {
      alert('Please highlight transcript text and choose a qualitative code.');
      return;
    }
    setTagging(true);
    try {
      const excerpt = await qualitativeApi.tagExcerpt(selectedTranscript.id, {
        code_id: selectedCodeId,
        start_char: startChar,
        end_char: endChar,
        quote_text: selectedQuote,
        memo: memo.trim() || undefined,
      });

      // Update transcript excerpts locally
      setSelectedTranscript(prev => {
        if (!prev) return null;
        return {
          ...prev,
          excerpts: [...(prev.excerpts || []), excerpt],
        };
      });

      setSelectedQuote('');
      setStartChar(null);
      setEndChar(null);
      setMemo('');
      alert('Verbatim evidence excerpt successfully tagged and verified!');
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to tag excerpt');
    } finally {
      setTagging(false);
    }
  };

  // Suggest Candidate Codes
  const handleSuggestCandidateCodes = async () => {
    if (!selectedTranscript) return;
    setSuggestingCodes(true);
    try {
      const res = await qualitativeApi.suggestCandidateCodes(selectedTranscript.id);
      setCandidateCodes(res.candidate_codes || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suggest codes');
    } finally {
      setSuggestingCodes(false);
    }
  };

  // Accept Candidate Code
  const handleAcceptCandidateCode = async (c: Record<string, unknown>) => {
    try {
      const created = await qualitativeApi.createCode(project.id, {
        name: String(c.name || 'New Code'),
        description: String(c.description || ''),
        color: '#0f172a',
      });
      setCodes(prev => [...prev, created]);
      setCandidateCodes(prev => prev.filter(item => item.name !== c.name));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept code');
    }
  };

  // Create Theme
  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || !newThemeName.trim()) return;
    setCreatingTheme(true);
    try {
      const created = await qualitativeApi.createTheme(project.id, {
        name: newThemeName.trim(),
        narrative_summary: newThemeNarrative.trim() || undefined,
        code_ids: selectedThemeCodes,
      });
      setThemes(prev => [...prev, created]);
      setNewThemeName('');
      setNewThemeNarrative('');
      setSelectedThemeCodes([]);
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create theme');
    } finally {
      setCreatingTheme(false);
    }
  };

  // Insert Themes into Manuscript
  const handleInsertThemes = () => {
    if (!onInsertContent || themes.length === 0) return;
    const items = themes.map(th => `
      <div class="qualitative-theme mb-4">
        <h3 class="font-serif text-base font-bold text-slate-900">${th.name}</h3>
        <p class="text-xs leading-relaxed text-slate-700 italic my-1">${th.narrative_summary || ''}</p>
      </div>
    `).join('\n');

    const html = `
      <div class="qualitative-findings my-6 pt-4 border-t border-slate-300">
        <h2 class="font-serif text-lg font-bold text-slate-900 mb-3">Qualitative Thematic Findings</h2>
        ${items}
      </div>
    `;
    onInsertContent(html);
    alert('Qualitative themes inserted into active manuscript section!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">Qualitative Research Analysis & Excerpts</h2>
              <p className="text-xs text-slate-500 mt-1">
                Transcript ingestion, rigorous open/thematic coding, and verbatim character excerpt verification.
                Strictly zero quote hallucination.
              </p>
            </div>
          </div>

          {themes.length > 0 && onInsertContent && (
            <button
              type="button"
              onClick={handleInsertThemes}
              className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-gold-400" />
              <span>Insert Themes into Manuscript</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Col 1: Transcripts List & Form (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Transcripts</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {transcripts.length}
              </span>
            </h3>

            {/* List */}
            {transcripts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No transcripts uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {transcripts.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTranscript(t)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      selectedTranscript?.id === t.id
                        ? 'border-navy-900 bg-navy-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <h4 className="text-xs font-bold text-slate-900 truncate">{t.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        {t.participant_identifier || 'Participant'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.word_count} words
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ingest Form */}
            <form onSubmit={handleCreateTranscript} className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">Add Transcript / Notes</h4>
              <input
                type="text"
                placeholder="Title (e.g. Interview with Principal P1)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-navy-900"
                required
              />
              <input
                type="text"
                placeholder="Participant Pseudonym (e.g. Participant A)"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-navy-900"
              />
              <textarea
                placeholder="Paste verbatim qualitative transcript or field observation notes..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-navy-900 resize-none"
                required
              />
              <button
                type="submit"
                disabled={creatingTranscript || !newTitle.trim() || !newContent.trim()}
                className="w-full py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>{creatingTranscript ? 'Ingesting...' : 'Ingest Transcript'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Col 2: Transcript Viewer & Verbatim Excerpt Tagger (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedTranscript ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-serif text-sm font-bold text-slate-900">{selectedTranscript.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedTranscript.participant_identifier || 'Participant'} | {selectedTranscript.word_count} words
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSuggestCandidateCodes}
                  disabled={suggestingCodes}
                  className="px-2.5 py-1 rounded-lg bg-navy-50 text-navy-900 hover:bg-navy-100 border border-navy-200 text-[11px] font-bold transition flex items-center gap-1"
                >
                  {suggestingCodes ? <Loader2 className="w-3 h-3 animate-spin text-gold-600" /> : <Sparkles className="w-3 h-3 text-gold-600" />}
                  <span>Suggest Codes</span>
                </button>
              </div>

              {/* Candidate AI Code Suggestions Banner */}
              {candidateCodes.length > 0 && (
                <div className="bg-navy-50/70 border border-navy-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-navy-950 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                      Candidate Codes (Researcher Approval Required)
                    </span>
                    <button
                      type="button"
                      onClick={() => setCandidateCodes([])}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {candidateCodes.map((cand, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-navy-100 text-xs">
                        <div>
                          <p className="font-bold text-navy-900">{String(cand.name)}</p>
                          <p className="text-[10px] text-slate-500">{String(cand.description || '')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptCandidateCode(cand)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition"
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript Text Reader */}
              <div>
                <p className="text-[10px] text-slate-400 font-semibold mb-1">
                  Highlight any passage below to tag it with an authentic code:
                </p>
                <div
                  ref={transcriptRef}
                  onMouseUp={handleTextSelection}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 max-h-80 overflow-y-auto text-xs leading-relaxed text-slate-800 font-serif select-text whitespace-pre-wrap"
                >
                  {selectedTranscript.content}
                </div>
              </div>

              {/* Highlight Action Panel */}
              {selectedQuote && (
                <div className="p-3.5 rounded-xl border border-gold-300 bg-gold-50/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Highlighter className="w-4 h-4 text-gold-600" />
                    <span className="text-xs font-bold text-slate-900">Tag Selected Excerpt:</span>
                  </div>
                  <p className="text-xs font-serif italic text-slate-700 bg-white p-2 rounded border border-gold-200">
                    &ldquo;{selectedQuote}&rdquo;
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={selectedCodeId}
                      onChange={(e) => setSelectedCodeId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Code...</option>
                      {codes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Analytic memo / comment (optional)..."
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setSelectedQuote(''); setStartChar(null); setEndChar(null); }}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTagExcerpt}
                      disabled={tagging || !selectedCodeId}
                      className="px-3 py-1 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      {tagging ? <Loader2 className="w-3 h-3 animate-spin text-gold-400" /> : <Tag className="w-3 h-3 text-gold-400" />}
                      <span>Save Excerpt</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Excerpts in this Transcript */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase">
                  Verified Excerpts ({selectedTranscript.excerpts?.length || 0})
                </h4>
                {(!selectedTranscript.excerpts || selectedTranscript.excerpts.length === 0) ? (
                  <p className="text-[11px] text-slate-400 italic">No excerpts tagged in this transcript yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTranscript.excerpts.map(ex => (
                      <div key={ex.id} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {ex.code_name || 'Code'}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Verbatim
                          </span>
                        </div>
                        <p className="font-serif italic text-slate-800 leading-snug">
                          &ldquo;{ex.quote_text}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
              Select or ingest a transcript to read and code text.
            </div>
          )}
        </div>

        {/* Col 3: Codebook & Thematic Synthesis (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Codebook Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Codebook</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {codes.length}
              </span>
            </h3>

            {codes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No codes defined yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {codes.map(c => (
                  <div key={c.id} className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <span className="font-bold text-navy-950">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{c.excerpt_count || 0} excerpts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Create Code Form */}
            <form onSubmit={handleCreateCode} className="pt-2 border-t border-slate-100 space-y-2">
              <input
                type="text"
                placeholder="New Code Name (e.g. Cognitive Overload)"
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-navy-900"
                required
              />
              <button
                type="submit"
                disabled={creatingCode || !newCodeName.trim()}
                className="w-full py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>Add Code to Codebook</span>
              </button>
            </form>
          </div>

          {/* Thematic Synthesis Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Thematic Synthesis</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {themes.length}
              </span>
            </h3>

            {themes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No qualitative themes formed yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {themes.map(th => (
                  <div key={th.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs">
                    <h5 className="font-bold text-slate-900">{th.name}</h5>
                    {th.narrative_summary && (
                      <p className="text-[11px] text-slate-600 italic leading-snug">{th.narrative_summary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Create Theme Form */}
            <form onSubmit={handleCreateTheme} className="pt-2 border-t border-slate-100 space-y-2">
              <input
                type="text"
                placeholder="Theme Title (e.g. Systemic Institutional Barriers)"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-navy-900"
                required
              />
              <textarea
                placeholder="Narrative summary synthesizing grouped codes..."
                value={newThemeNarrative}
                onChange={(e) => setNewThemeNarrative(e.target.value)}
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-navy-900 resize-none"
              />
              <button
                type="submit"
                disabled={creatingTheme || !newThemeName.trim()}
                className="w-full py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>Form Theme</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

