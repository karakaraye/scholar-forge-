'use client';

import React, { useState, useEffect } from 'react';
import {
  FormattingTemplate,
  AcademicInstitution,
  TemplateDegreeLevel,
  TemplateDocumentType,
} from '@/types/formatting';
import { formattingApi } from '@/lib/api';

interface InstitutionalTemplateSelectorProps {
  projectId: string;
  selectedTemplateId?: string;
  onTemplateSelect: (template: FormattingTemplate) => void;
  onCloneTemplate?: (clonedTemplate: FormattingTemplate) => void;
}

export const InstitutionalTemplateSelector: React.FC<InstitutionalTemplateSelectorProps> = ({
  projectId,
  selectedTemplateId,
  onTemplateSelect,
  onCloneTemplate,
}) => {
  const [institutions, setInstitutions] = useState<AcademicInstitution[]>([]);
  const [templates, setTemplates] = useState<FormattingTemplate[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [selectedDegreeLevel, setSelectedDegreeLevel] = useState<string>('');
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInstitutions();
    loadTemplates();
  }, []);

  const loadInstitutions = async () => {
    try {
      const data = await formattingApi.listInstitutions();
      setInstitutions(data);
    } catch (err: any) {
      console.error('Failed to load institutions:', err);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await formattingApi.listTemplates({
        institution: selectedInstitutionId || undefined,
        degree_level: selectedDegreeLevel || undefined,
        document_type: selectedDocType || undefined,
        search: searchQuery || undefined,
      });
      setTemplates(data);
    } catch (err: any) {
      setError('Failed to load institutional templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedInstitutionId, selectedDegreeLevel, selectedDocType, searchQuery]);

  const handleAssign = async (tpl: FormattingTemplate) => {
    setAssigning(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await formattingApi.assignProjectTemplate(projectId, tpl.id, tpl.active_version?.id);
      onTemplateSelect(tpl);
      setSuccessMsg(`Assigned template: "${tpl.name}" successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to assign template');
    } finally {
      setAssigning(false);
    }
  };

  const handleClone = async (tpl: FormattingTemplate) => {
    if (!cloneName.trim()) return;
    try {
      const cloned = await formattingApi.cloneTemplate(tpl.id, cloneName.trim());
      setCloningId(null);
      setCloneName('');
      setSuccessMsg(`Successfully created custom template "${cloned.name}".`);
      loadTemplates();
      if (onCloneTemplate) onCloneTemplate(cloned);
    } catch (err: any) {
      setError(err.message || 'Failed to clone template');
    }
  };

  // Derive unique countries
  const countries = Array.from(new Set(institutions.map((i) => i.country).filter(Boolean)));
  const filteredInstitutions = selectedCountry
    ? institutions.filter((i) => i.country === selectedCountry)
    : institutions;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🏛️</span> Institutional & Departmental Templates
          </h3>
          <p className="text-sm text-slate-500">
            Browse verified institutional formatting standards or create customized department variants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Verified Standards
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setSelectedInstitutionId('');
            }}
            className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Institution</label>
          <select
            value={selectedInstitutionId}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
            className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Institutions</option>
            {filteredInstitutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.country})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Degree Level</label>
          <select
            value={selectedDegreeLevel}
            onChange={(e) => setSelectedDegreeLevel(e.target.value)}
            className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All Levels</option>
            <option value="UNDERGRADUATE">Undergraduate</option>
            <option value="MASTERS">Master&apos;s</option>
            <option value="PHD">PhD / Doctoral</option>
            <option value="POSTDOC">Postdoc</option>
            <option value="FACULTY">Faculty</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search Template</label>
          <input
            type="text"
            placeholder="Search template name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Loading institutional templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm border border-dashed rounded-lg">
          No templates found matching your criteria. Try loosening filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id;
            const isVerified = tpl.verification_status === 'OFFICIALLY_VERIFIED';
            const isCustom = tpl.verification_status === 'USER_CUSTOMIZED';

            return (
              <div
                key={tpl.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-900 text-base">{tpl.name}</h4>
                    <p className="text-xs text-slate-500">
                      {tpl.institution_name ? `${tpl.institution_name} • ` : ''}
                      {tpl.degree_level} • {tpl.document_type}
                    </p>
                  </div>
                  {isVerified ? (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <span>✓</span> Verified
                    </span>
                  ) : isCustom ? (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                      Customized
                    </span>
                  ) : (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                      Draft / Unverified
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{tpl.description}</p>

                {/* Rules Summary Pills */}
                {tpl.active_version?.rules_config && (
                  <div className="flex flex-wrap gap-1.5 mb-3 text-[11px] text-slate-600">
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      Font: {tpl.active_version.rules_config.typography.primary_font}{' '}
                      {tpl.active_version.rules_config.typography.base_font_size_pt}pt
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      Spacing: {tpl.active_version.rules_config.typography.line_spacing}x
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      Citation: {tpl.citation_style}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded">
                      Gutter: {tpl.active_version.rules_config.page_settings.margins_inches.gutter}&quot;
                    </span>
                  </div>
                )}

                {/* Source Transparency Link */}
                {tpl.verification_source_url && (
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1">
                    <span>🔗 Source:</span>
                    <a
                      href={tpl.verification_source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline truncate max-w-[240px]"
                    >
                      {tpl.verification_source_url}
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setCloningId(tpl.id);
                      setCloneName(`${tpl.name} (Custom)`);
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <span>📋</span> Clone & Customize
                  </button>

                  <button
                    disabled={assigning || isSelected}
                    onClick={() => handleAssign(tpl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {isSelected ? '✓ Assigned' : 'Use This Template'}
                  </button>
                </div>

                {/* Clone Modal / Prompt */}
                {cloningId === tpl.id && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Clone Name for Custom Template:
                    </label>
                    <input
                      type="text"
                      value={cloneName}
                      onChange={(e) => setCloneName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setCloningId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleClone(tpl)}
                        className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                      >
                        Create Clone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

