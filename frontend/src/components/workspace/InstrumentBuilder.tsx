'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ResearchProject, ResearchInstrument, InstrumentItem } from '@/types/project';
import { instrumentsApi } from '@/lib/api';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ListOrdered,
  FileCheck,
  Loader2,
  Info
} from 'lucide-react';

interface InstrumentBuilderProps {
  project: ResearchProject;
  onRefreshConsistency?: () => void;
}

export default function InstrumentBuilder({ project, onRefreshConsistency }: InstrumentBuilderProps) {
  const [instruments, setInstruments] = useState<ResearchInstrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<ResearchInstrument | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // New Instrument Form
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'QUESTIONNAIRE' | 'INTERVIEW_GUIDE' | 'OBSERVATION_CHECKLIST' | 'TEST'>('QUESTIONNAIRE');
  const [newDescription, setNewDescription] = useState('');

  // Item Form
  const [newItemText, setNewItemText] = useState('');
  const [newConstruct, setNewConstruct] = useState('');
  const [newItemType, setNewItemType] = useState<string>('LIKERT_5');
  const [newIsReverse, setNewIsReverse] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // AI & Validation State
  const [generatingItems, setGeneratingItems] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<Record<string, unknown> | null>(null);

  // Fetch instruments
  const loadInstruments = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await instrumentsApi.list(project.id);
      setInstruments(data);
      if (data.length > 0) {
        // select first or keep current
        setSelectedInstrument(prev => prev ? data.find(i => i.id === prev.id) || data[0] : data[0]);
      } else {
        setSelectedInstrument(null);
      }
    } catch (err) {
      console.error('Failed to load instruments:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    loadInstruments();
  }, [loadInstruments]);

  // Create Instrument
  const handleCreateInstrument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const created = await instrumentsApi.create(project.id, {
        title: newTitle.trim(),
        instrument_type: newType,
        description: newDescription.trim(),
      });
      setInstruments(prev => [created, ...prev]);
      setSelectedInstrument(created);
      setNewTitle('');
      setNewDescription('');
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create instrument');
    } finally {
      setCreating(false);
    }
  };

  // Add Item to selected instrument
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrument || !newItemText.trim()) return;
    setAddingItem(true);
    try {
      const added = await instrumentsApi.addItem(selectedInstrument.id, {
        item_text: newItemText.trim(),
        construct_name: newConstruct.trim() || 'General',
        item_type: newItemType,
        is_reverse_coded: newIsReverse,
      });

      setSelectedInstrument(prev => {
        if (!prev) return null;
        const updatedItems = [...(prev.items || []), added];
        return { ...prev, items: updatedItems };
      });
      setNewItemText('');
      setNewIsReverse(false);
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAddingItem(false);
    }
  };

  // Remove Item
  const handleRemoveItem = async (itemId: string) => {
    if (!selectedInstrument) return;
    try {
      await instrumentsApi.removeItem(selectedInstrument.id, itemId);
      setSelectedInstrument(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: (prev.items || []).filter(item => item.id !== itemId),
        };
      });
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove item');
    }
  };

  // Delete Instrument
  const handleDeleteInstrument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this research instrument?')) return;
    try {
      await instrumentsApi.delete(id);
      setInstruments(prev => prev.filter(i => i.id !== id));
      if (selectedInstrument?.id === id) {
        setSelectedInstrument(null);
      }
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete instrument');
    }
  };

  // Generate Items from Variables
  const handleGenerateItems = async () => {
    if (!selectedInstrument) return;
    setGeneratingItems(true);
    try {
      const res = await instrumentsApi.generateItems(selectedInstrument.id);
      if (res && res.generated_items) {
        // Refresh instrument items
        await loadInstruments();
        alert(`Successfully generated ${res.generated_items.length} items from research variables!`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate items');
    } finally {
      setGeneratingItems(false);
    }
  };

  // Validate Instrument
  const handleValidate = async () => {
    if (!selectedInstrument) return;
    setValidating(true);
    try {
      const rep = await instrumentsApi.validate(selectedInstrument.id);
      setValidationReport(rep);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to validate instrument');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">Research Instrument Builder</h2>
              <p className="text-xs text-slate-500 mt-1">
                Design questionnaires, interview guides, and observation protocols aligned with project variables.
                Includes reverse scoring, double-barreled item detection, and genuine OpenXML DOCX export.
              </p>
            </div>
          </div>

          {selectedInstrument && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateItems}
                disabled={generatingItems}
                className="px-3.5 py-2 rounded-xl bg-navy-50 text-navy-900 hover:bg-navy-100 text-xs font-bold border border-navy-200 transition flex items-center gap-2"
              >
                {generatingItems ? <Loader2 className="w-4 h-4 animate-spin text-gold-600" /> : <Sparkles className="w-4 h-4 text-gold-600" />}
                <span>Generate Items from Variables</span>
              </button>

              <button
                type="button"
                onClick={handleValidate}
                disabled={validating}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <FileCheck className="w-4 h-4 text-emerald-600" />}
                <span>Validate Items</span>
              </button>

              <a
                href={instrumentsApi.getDocxDownloadUrl(selectedInstrument.id)}
                download
                className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4 text-gold-400" />
                <span>Export Word (.docx)</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Instruments List & Creation (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Project Instruments</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {instruments.length}
              </span>
            </h3>

            {/* List */}
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading instruments...</div>
            ) : instruments.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No instruments created yet.
              </div>
            ) : (
              <div className="space-y-2">
                {instruments.map(inst => (
                  <div
                    key={inst.id}
                    onClick={() => setSelectedInstrument(inst)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      selectedInstrument?.id === inst.id
                        ? 'border-navy-900 bg-navy-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{inst.title}</h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInstrument(inst.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {inst.instrument_type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(inst.items || []).length} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Instrument Form */}
            <form onSubmit={handleCreateInstrument} className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">New Research Instrument</h4>
              <div>
                <input
                  type="text"
                  placeholder="Instrument title (e.g. Employee Well-Being Survey)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900"
                  required
                />
              </div>
              <div>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                >
                  <option value="QUESTIONNAIRE">Questionnaire / Scale</option>
                  <option value="INTERVIEW_GUIDE">Semi-Structured Interview Guide</option>
                  <option value="OBSERVATION_CHECKLIST">Observation Protocol</option>
                  <option value="TEST">Diagnostic / Academic Test</option>
                </select>
              </div>
              <div>
                <textarea
                  placeholder="Target population instructions or administration notes..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="w-full py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>{creating ? 'Creating...' : 'Create Instrument'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Instrument Details, Items & Validation (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedInstrument ? (
            <>
              {/* Validation Alert Box if present */}
              {validationReport && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <h4 className="text-xs font-bold text-amber-900">
                      Instrument Item Validation: {((validationReport.flagged_items as any[]) || []).length === 0 ? 'All Items Passed' : 'Potential Phrasing Issues Detected'}
                    </h4>
                  </div>
                  {((validationReport.flagged_items as any[]) || []).length === 0 ? (
                    <p className="text-xs text-amber-800">
                      Zero double-barreled or overtly leading item formulations detected. All items pass initial psychometric sanity checks.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {((validationReport.flagged_items as any[]) || []).map((issue: any, idx: number) => (
                        <div key={idx} className="text-xs bg-white/70 p-2 rounded-lg border border-amber-200 text-amber-900">
                          <span className="font-bold">Item {issue.item_order || idx + 1}:</span> {issue.issue_type} — &ldquo;{issue.item_text}&rdquo; ({issue.recommendation})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Items List Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-slate-900">{selectedInstrument.title}</h3>
                    <span className="text-xs font-mono uppercase bg-navy-50 text-navy-800 px-2 py-0.5 rounded font-bold">
                      {selectedInstrument.instrument_type}
                    </span>
                  </div>
                  {selectedInstrument.description && (
                    <p className="text-xs text-slate-500 mt-1 italic">
                      {selectedInstrument.description}
                    </p>
                  )}
                </div>

                {/* Items Table / List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Configured Items & Questions ({(selectedInstrument.items || []).length})</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Responses auto-formatted for empirical analysis
                    </span>
                  </h4>

                  {(!selectedInstrument.items || selectedInstrument.items.length === 0) ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                      <Sliders className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-medium">No items added to this instrument yet.</p>
                      <p className="text-[11px] text-slate-400">
                        Use &ldquo;Generate Items from Variables&rdquo; above or add items using the form below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedInstrument.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex items-start justify-between gap-4 transition"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-navy-900 text-white font-mono text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="space-y-1 flex-1">
                              <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                                {item.item_text}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                                  {item.construct_name || 'General Construct'}
                                </span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-navy-100 text-navy-800 rounded">
                                  {item.item_type}
                                </span>
                                {item.is_reverse_coded && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3" />
                                    Reverse Coded
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Item Form */}
                <form onSubmit={handleAddItem} className="pt-5 border-t border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-navy-900" />
                    <span>Add New Question or Scale Item</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Item Statement or Question Prompt
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. I feel supported by my organization when adopting new pedagogical technologies."
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Construct / Dimension
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Organizational Support"
                          value={newConstruct}
                          onChange={(e) => setNewConstruct(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Response Format
                        </label>
                        <select
                          value={newItemType}
                          onChange={(e) => setNewItemType(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                        >
                          <option value="LIKERT_5">5-Point Likert (Strongly Disagree to Strongly Agree)</option>
                          <option value="LIKERT_7">7-Point Likert Scale</option>
                          <option value="MULTIPLE_CHOICE">Multiple Choice Single Select</option>
                          <option value="OPEN_ENDED">Open-Ended Qualitative Narrative</option>
                          <option value="DEMOGRAPHIC">Demographic Categorical</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                          <input
                            type="checkbox"
                            checked={newIsReverse}
                            onChange={(e) => setNewIsReverse(e.target.checked)}
                            className="w-4 h-4 text-navy-900 rounded focus:ring-0"
                          />
                          <span className="text-xs font-semibold text-slate-700">Reverse Coded Item</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={addingItem || !newItemText.trim()}
                        className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 text-gold-400" />
                        <span>{addingItem ? 'Adding Item...' : 'Add Item to Instrument'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-serif text-base font-bold text-slate-900">No Instrument Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an existing instrument from the left sidebar or create a new questionnaire or interview guide to configure items.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

