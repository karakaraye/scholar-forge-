'use client';

import React, { useState } from 'react';
import { FormattingTemplate, RulesConfig } from '@/types/formatting';

interface FormattingRuleConfiguratorProps {
  template: FormattingTemplate;
  onSaveRules?: (updatedRules: RulesConfig, changelog: string) => Promise<void>;
  readOnly?: boolean;
}

export const FormattingRuleConfigurator: React.FC<FormattingRuleConfiguratorProps> = ({
  template,
  onSaveRules,
  readOnly = false,
}) => {
  const activeRules = template.active_version?.rules_config;
  const [rules, setRules] = useState<RulesConfig | null>(activeRules || null);
  const [activeTab, setActiveTab] = useState<
    'page' | 'typography' | 'chapters' | 'pagination' | 'tables' | 'citations'
  >('page');
  const [changelog, setChangelog] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!rules) {
    return (
      <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        No active rules configuration found for template &quot;{template.name}&quot;.
      </div>
    );
  }

  const handleMarginChange = (key: keyof RulesConfig['page_settings']['margins_inches'], val: number) => {
    setRules((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        page_settings: {
          ...prev.page_settings,
          margins_inches: {
            ...prev.page_settings.margins_inches,
            [key]: val,
          },
        },
      };
    });
  };

  const handleTypographyChange = (key: keyof RulesConfig['typography'], val: any) => {
    setRules((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        typography: {
          ...prev.typography,
          [key]: val,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!onSaveRules || !rules) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      await onSaveRules(rules, changelog || 'Updated formatting rules configuration');
      setSavedMsg('Template rules saved successfully!');
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>⚙️</span> Formatting Rule Configurator: {template.name}
          </h3>
          <p className="text-xs text-slate-500">
            Active Version: v{template.active_version?.version_number || 1} • {template.citation_style} Standard
          </p>
        </div>
        {!readOnly && onSaveRules && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : '💾 Save Rule Version'}
          </button>
        )}
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800">
          {savedMsg}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-medium text-slate-600">
        {[
          { id: 'page', label: '📄 Page & Margins' },
          { id: 'typography', label: '🔤 Typography & Spacing' },
          { id: 'chapters', label: '📑 Chapter Hierarchy' },
          { id: 'pagination', label: '🔢 Pagination' },
          { id: 'tables', label: '📊 Tables & Figures' },
          { id: 'citations', label: '📚 Citations & References' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 border-b-2 whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 font-semibold bg-indigo-50/50'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="p-6 space-y-6">
        {/* Page & Margins */}
        {activeTab === 'page' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Page Margins & Binding Gutter</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Top Margin (in)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.page_settings.margins_inches.top}
                  onChange={(e) => handleMarginChange('top', parseFloat(e.target.value) || 1.0)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Bottom Margin (in)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.page_settings.margins_inches.bottom}
                  onChange={(e) => handleMarginChange('bottom', parseFloat(e.target.value) || 1.0)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Left Margin (in)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.page_settings.margins_inches.left}
                  onChange={(e) => handleMarginChange('left', parseFloat(e.target.value) || 1.0)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Right Margin (in)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.page_settings.margins_inches.right}
                  onChange={(e) => handleMarginChange('right', parseFloat(e.target.value) || 1.0)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-indigo-700 mb-1">
                  Binding Gutter (in)
                </label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.page_settings.margins_inches.gutter}
                  onChange={(e) => handleMarginChange('gutter', parseFloat(e.target.value) || 0.0)}
                  className="w-full text-xs border border-indigo-300 rounded p-2 bg-indigo-50/30 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              * Binding gutter provides additional left allowance for hardcover thesis binding (standard: 0.5 in).
            </p>
          </div>
        )}

        {/* Typography & Spacing */}
        {activeTab === 'typography' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Body Typography & Line Spacing</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Primary Font</label>
                <select
                  disabled={readOnly}
                  value={rules.typography.primary_font}
                  onChange={(e) => handleTypographyChange('primary_font', e.target.value)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Palatino Linotype">Palatino Linotype</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Base Size (pt)</label>
                <input
                  type="number"
                  disabled={readOnly}
                  value={rules.typography.base_font_size_pt}
                  onChange={(e) => handleTypographyChange('base_font_size_pt', parseInt(e.target.value) || 12)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Line Spacing</label>
                <select
                  disabled={readOnly}
                  value={rules.typography.line_spacing}
                  onChange={(e) => handleTypographyChange('line_spacing', parseFloat(e.target.value))}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1.0}>1.0 (Single)</option>
                  <option value={1.5}>1.5 Lines</option>
                  <option value={2.0}>2.0 (Double)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">First Line Indent (in)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.typography.first_line_indent_inches}
                  onChange={(e) => handleTypographyChange('first_line_indent_inches', parseFloat(e.target.value) || 0.5)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Chapter Hierarchy */}
        {activeTab === 'chapters' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Chapter & Section Numbering Hierarchy</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Chapter Style</label>
                <select
                  disabled={readOnly}
                  value={rules.chapter_structure.chapter_numbering_style}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            chapter_structure: {
                              ...prev.chapter_structure,
                              chapter_numbering_style: e.target.value as any,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ARABIC">Arabic (Chapter 1)</option>
                  <option value="ROMAN">Roman (Chapter I)</option>
                  <option value="WORDS">Words (CHAPTER ONE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Heading Case</label>
                <select
                  disabled={readOnly}
                  value={rules.chapter_structure.heading_case}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            chapter_structure: {
                              ...prev.chapter_structure,
                              heading_case: e.target.value as any,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="UPPERCASE">ALL UPPERCASE</option>
                  <option value="TITLE_CASE">Title Case</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Max Heading Depth</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  disabled={readOnly}
                  value={rules.chapter_structure.section_numbering_depth}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            chapter_structure: {
                              ...prev.chapter_structure,
                              section_numbering_depth: parseInt(e.target.value) || 3,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {activeTab === 'pagination' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Pagination Schemes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border rounded-lg">
                <h5 className="text-xs font-semibold text-slate-700 mb-2">Preliminary Pages (Front Matter)</h5>
                <p className="text-xs text-slate-500 mb-2">
                  Format: Lowercase Roman numerals (i, ii, iii...). Title page is counted as page &quot;i&quot; but numeral is suppressed.
                </p>
                <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-mono">
                  {rules.pagination.preliminary_format} • {rules.pagination.prelim_position}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg">
                <h5 className="text-xs font-semibold text-slate-700 mb-2">Main Body (Chapter 1 Onwards)</h5>
                <p className="text-xs text-slate-500 mb-2">
                  Format: Arabic numerals (1, 2, 3...) beginning at page 1 from Chapter 1.
                </p>
                <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-mono">
                  {rules.pagination.main_format} • {rules.pagination.main_position}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tables & Figures */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Captions & Cross-Referencing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Table Caption Placement</label>
                <select
                  disabled={readOnly}
                  value={rules.tables_figures.table_caption_placement}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            tables_figures: {
                              ...prev.tables_figures,
                              table_caption_placement: e.target.value as any,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ABOVE">ABOVE Table (Academic Standard)</option>
                  <option value="BELOW">BELOW Table</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Figure Caption Placement</label>
                <select
                  disabled={readOnly}
                  value={rules.tables_figures.figure_caption_placement}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            tables_figures: {
                              ...prev.tables_figures,
                              figure_caption_placement: e.target.value as any,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="BELOW">BELOW Figure (Academic Standard)</option>
                  <option value="ABOVE">ABOVE Figure</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Citations & References */}
        {activeTab === 'citations' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800">Citation Style & Bibliography Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Citation Format</label>
                <input
                  type="text"
                  disabled
                  value={rules.citations.style}
                  className="w-full text-xs bg-slate-100 border rounded p-2 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Hanging Indent (in)</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={readOnly}
                  value={rules.citations.hanging_indent_inches}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            citations: {
                              ...prev.citations,
                              hanging_indent_inches: parseFloat(e.target.value) || 0.5,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">DOI Required</label>
                <select
                  disabled={readOnly}
                  value={rules.citations.doi_required ? 'YES' : 'NO'}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev
                        ? {
                            ...prev,
                            citations: {
                              ...prev.citations,
                              doi_required: e.target.value === 'YES',
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="YES">Yes (Mandatory)</option>
                  <option value="NO">No</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Changelog prompt if saving allowed */}
        {!readOnly && onSaveRules && (
          <div className="pt-4 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Version Changelog Note:
            </label>
            <input
              type="text"
              placeholder="e.g. Switched line spacing to 2.0 and increased left binding gutter"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

