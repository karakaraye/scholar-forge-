'use client';

import React, { useState } from 'react';
import { DocumentSection, StructureTemplate } from '@/types/project';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
  X,
  FileText,
  FolderPlus,
  RotateCw,
} from 'lucide-react';

interface OutlineManagerProps {
  sections: DocumentSection[];
  selectedSectionId?: string;
  onSelectSection: (section: DocumentSection) => void;
  onAddSection: (title: string, sectionType: string, parentId?: string | null) => Promise<void>;
  onRenameSection: (sectionId: string, newTitle: string) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onReorder: (reordered: DocumentSection[]) => Promise<void>;
  onApplyTemplate?: (templateId: string) => Promise<void>;
  templates?: StructureTemplate[];
}

export default function OutlineManager({
  sections,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onReorder,
  onApplyTemplate,
  templates = [],
}: OutlineManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('SECTION');
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Group top-level sections and subsections
  const parentSections = sections.filter((s) => !s.parent_section);
  const getSubsections = (parentId: string) =>
    sections.filter((s) => s.parent_section === parentId);

  const startRename = (section: DocumentSection, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(section.id);
    setEditingTitle(section.title);
  };

  const saveRename = async (sectionId: string) => {
    if (!editingTitle.trim()) return;
    setLoadingAction(true);
    try {
      await onRenameSection(sectionId, editingTitle.trim());
      setEditingId(null);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoadingAction(true);
    try {
      await onAddSection(newTitle.trim(), newType, targetParentId);
      setNewTitle('');
      setIsAddingNew(false);
      setTargetParentId(null);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);

    // Update order_index
    const updated = reordered.map((sec, idx) => ({ ...sec, order_index: idx }));
    await onReorder(updated);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-full max-h-[850px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-navy-800" />
          <h3 className="font-serif text-sm font-bold text-slate-900">Manuscript Outline</h3>
        </div>
        <div className="flex items-center gap-1">
          {onApplyTemplate && templates.length > 0 && (
            <button
              onClick={() => setTemplateModalOpen(true)}
              title="Apply Discipline Outline Template"
              className="p-1 rounded text-slate-400 hover:text-gold-600 hover:bg-slate-50 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              setIsAddingNew(true);
              setTargetParentId(null);
              setNewType('CHAPTER');
            }}
            title="Add New Chapter or Section"
            className="p-1 rounded bg-navy-900 text-white hover:bg-navy-800 text-xs flex items-center gap-1 font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-[11px] pr-1">Add</span>
          </button>
        </div>
      </div>

      {/* Add New Section Inline Form */}
      {isAddingNew && (
        <form onSubmit={handleAddNew} className="p-3 mb-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>{targetParentId ? 'New Subsection' : 'New Chapter / Section'}</span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Section Title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-navy-800 bg-white"
            autoFocus
          />
          <div className="flex items-center justify-between gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="text-[11px] px-2 py-1 rounded border border-slate-300 bg-white"
            >
              <option value="CHAPTER">Chapter</option>
              <option value="SECTION">Section</option>
              <option value="INTRODUCTION">Introduction</option>
              <option value="LITERATURE_REVIEW">Literature Review</option>
              <option value="METHODOLOGY">Methodology</option>
              <option value="RESULTS">Results</option>
              <option value="DISCUSSION">Discussion</option>
              <option value="CONCLUSION">Conclusion</option>
              <option value="APPENDIX">Appendix</option>
            </select>
            <button
              type="submit"
              disabled={loadingAction || !newTitle.trim()}
              className="px-3 py-1 rounded bg-navy-900 text-white text-[11px] font-bold hover:bg-navy-800 transition disabled:opacity-50"
            >
              Add Section
            </button>
          </div>
        </form>
      )}

      {/* Sections Tree */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {sections.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No sections yet. Click &quot;Add&quot; to build an outline.
          </div>
        ) : (
          sections.map((section, idx) => {
            const isSelected = selectedSectionId === section.id;
            const isSub = Boolean(section.parent_section);

            return (
              <div
                key={section.id}
                onClick={() => onSelectSection(section)}
                className={`group relative rounded-xl p-2.5 transition flex items-center justify-between gap-2 cursor-pointer border ${
                  isSub ? 'ml-4 bg-slate-50/60' : 'bg-white'
                } ${
                  isSelected
                    ? 'border-navy-900 bg-navy-950 text-white shadow-sm'
                    : 'border-slate-100 hover:border-slate-300 text-slate-800'
                }`}
              >
                {/* Left: Indicator & Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-navy-800 text-gold-400' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>

                  {editingId === section.id ? (
                    <div
                      className="flex items-center gap-1 flex-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="text-xs px-2 py-0.5 rounded border border-slate-300 text-slate-900 w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => saveRename(section.id)}
                        className="p-1 text-emerald-500 hover:text-emerald-700"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="truncate flex-1">
                      <p className={`truncate font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {section.title}
                      </p>
                      <span
                        className={`text-[10px] uppercase font-mono ${
                          isSelected ? 'text-gold-300' : 'text-slate-400'
                        }`}
                      >
                        {section.section_type} • {section.word_count} words
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Actions: Reorder, Add Sub, Rename, Delete */}
                {editingId !== section.id && (
                  <div
                    className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => handleMove(idx, 'up', e)}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1 text-slate-400 hover:text-navy-900 disabled:opacity-20"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleMove(idx, 'down', e)}
                      disabled={idx === sections.length - 1}
                      title="Move Down"
                      className="p-1 text-slate-400 hover:text-navy-900 disabled:opacity-20"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>

                    {!isSub && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetParentId(section.id);
                          setNewType('SUBSECTION');
                          setIsAddingNew(true);
                        }}
                        title="Add Subsection"
                        className="p-1 text-slate-400 hover:text-gold-500"
                      >
                        <FolderPlus className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={(e) => startRename(section, e)}
                      title="Rename Section"
                      className="p-1 text-slate-400 hover:text-navy-700"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${section.title}"?`)) {
                          onDeleteSection(section.id);
                        }
                      }}
                      title="Delete Section"
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Template Selection Modal */}
      {templateModalOpen && onApplyTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-serif text-base font-bold text-slate-900">
                Apply Academic Outline Template
              </h3>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Applying a new outline template will reconstruct chapters tailored to the discipline.
              Existing written content in matching sections will be automatically preserved.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-gold-500 transition cursor-pointer bg-slate-50/50"
                  onClick={async () => {
                    setTemplateModalOpen(false);
                    await onApplyTemplate(tpl.id);
                  }}
                >
                  <h4 className="text-xs font-bold text-navy-900">{tpl.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.disciplines.slice(0, 3).map((d) => (
                      <span key={d} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200/80 text-slate-700">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

