'use client';

import React, { useState, useEffect } from 'react';
import { FormattingTemplate } from '@/types/formatting';
import { formattingApi, documentsApi, projectsApi } from '@/lib/api';
import { InstitutionalTemplateSelector } from './InstitutionalTemplateSelector';
import { FormattingRuleConfigurator } from './FormattingRuleConfigurator';
import { PreliminaryPagesWorkspace } from './PreliminaryPagesWorkspace';
import { ComplianceAuditPanel } from './ComplianceAuditPanel';
import { GuidelineIngestionModal } from './GuidelineIngestionModal';
import { ResearchDocument, DocumentSection } from '@/types/project';

interface FormattingPreviewWorkspaceProps {
  projectId: string;
}

export const FormattingPreviewWorkspace: React.FC<FormattingPreviewWorkspaceProps> = ({
  projectId,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<FormattingTemplate | null>(null);
  const [leftTab, setLeftTab] = useState<'selector' | 'rules'>('selector');
  const [centerTab, setCenterTab] = useState<'prelims' | 'body'>('prelims');
  const [showIngestionModal, setShowIngestionModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [document, setDocument] = useState<ResearchDocument | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);

  useEffect(() => {
    loadActiveTemplate();
    loadDocumentContent();
  }, [projectId]);

  const loadActiveTemplate = async () => {
    setLoading(true);
    try {
      const res = await formattingApi.getProjectTemplate(projectId);
      if (res.template) {
        setActiveTemplate(res.template);
      }
    } catch (err: any) {
      console.error('Failed to load project template:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentContent = async () => {
    try {
      const proj = await projectsApi.getById(projectId);
      if (proj && proj.documents && proj.documents.length > 0) {
        setDocument(proj.documents[0]);
        const secList = await documentsApi.getSections(proj.documents[0].id);
        setSections(secList);
      }
    } catch (err: any) {
      console.error('Failed to load document content:', err);
    }
  };

  const handleTemplateSelected = (tpl: FormattingTemplate) => {
    setActiveTemplate(tpl);
  };

  const handleRulesSaved = async (rules: any, changelog: string) => {
    if (!activeTemplate) return;
    try {
      // Re-fetch project template
      await loadActiveTemplate();
    } catch (err: any) {
      console.error(err);
    }
  };

  const typography = activeTemplate?.active_version?.rules_config?.typography;
  const pageSettings = activeTemplate?.active_version?.rules_config?.page_settings;

  return (
    <div className="space-y-4">
      {/* Top Banner & Ingestion Action */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📐</span> Academic Formatting & Institutional Compliance Studio
          </h2>
          <p className="text-xs text-slate-500">
            Active Standard:{' '}
            <strong className="text-indigo-600 font-semibold">
              {activeTemplate ? activeTemplate.name : 'No Institutional Template Assigned'}
            </strong>{' '}
            {activeTemplate?.verification_status === 'OFFICIALLY_VERIFIED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 ml-1">
                ✓ Verified
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIngestionModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>📥</span> Ingest Guidelines (PDF/DOCX)
          </button>
        </div>
      </div>

      {/* 3-Panel Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: Template Selector & Rules (Col span 3) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex gap-2">
            <button
              onClick={() => setLeftTab('selector')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${leftTab === 'selector'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              🏛️ Template Catalog
            </button>
            <button
              onClick={() => setLeftTab('rules')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${leftTab === 'rules'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              ⚙️ Formatting Rules
            </button>
          </div>

          {leftTab === 'selector' ? (
            <InstitutionalTemplateSelector
              projectId={projectId}
              selectedTemplateId={activeTemplate?.id}
              onTemplateSelect={handleTemplateSelected}
            />
          ) : activeTemplate ? (
            <FormattingRuleConfigurator
              template={activeTemplate}
              onSaveRules={handleRulesSaved}
            />
          ) : (
            <div className="p-6 bg-white rounded-xl border border-dashed text-center text-xs text-slate-400">
              Select an institutional template to configure formatting rules.
            </div>
          )}
        </div>

        {/* CENTER PANEL: Live Layout Preview (Col span 5) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          {/* Preview Navigation Bar */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCenterTab('prelims')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${centerTab === 'prelims'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                📜 Front Matter Pages
              </button>
              <button
                onClick={() => setCenterTab('body')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${centerTab === 'body'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                📖 Manuscript Body ({sections.length} Sections)
              </button>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              {typography?.primary_font || 'Times New Roman'} {typography?.base_font_size_pt || 12}pt
            </div>
          </div>

          {/* Web Preview Transparency Alert */}
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Physical pagination layout:</span>
              <strong className="text-amber-950 underline decoration-amber-500 font-semibold">NOT_VERIFIED</strong>
            </div>
            <span className="text-[10px] text-amber-700">Measured on Export</span>
          </div>

          {/* Preview Canvas */}
          {centerTab === 'prelims' ? (
            <PreliminaryPagesWorkspace projectId={projectId} />
          ) : (
            /* Main Body Chapter Preview */
            <div
              className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[500px] overflow-y-auto space-y-6 shadow-inner"
              style={{
                fontFamily: typography?.primary_font || 'Times New Roman, serif',
                fontSize: `${typography?.base_font_size_pt || 12}pt`,
                lineHeight: typography?.line_spacing || 2.0,
              }}
            >
              {sections.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-sans">
                  No manuscript sections found. Add sections in the Writing workspace.
                </div>
              ) : (
                sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 font-sans border-b border-slate-100 pb-2">
                      <span>Section {idx + 1}</span>
                      <span>{sec.word_count} words</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg uppercase tracking-wide">
                      {sec.title}
                    </h3>

                    <div
                      className="prose prose-sm max-w-none text-slate-800"
                      dangerouslySetInnerHTML={{ __html: sec.content || '<p class="italic text-slate-400">Empty section</p>' }}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Compliance Audit & Safe Auto-Format (Col span 3) */}
        <div className="lg:col-span-3 space-y-4">
          <ComplianceAuditPanel
            projectId={projectId}
            onAutoformatApplied={() => {
              loadDocumentContent();
            }}
          />
        </div>
      </div>

      {/* Guideline Ingestion Modal */}
      <GuidelineIngestionModal
        isOpen={showIngestionModal}
        onClose={() => setShowIngestionModal(false)}
        onTemplateCreated={(newTpl) => {
          setActiveTemplate(newTpl);
          setLeftTab('rules');
        }}
      />
    </div>
  );
};
