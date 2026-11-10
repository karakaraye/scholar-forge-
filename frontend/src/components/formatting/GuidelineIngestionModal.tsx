'use client';

import React, { useState } from 'react';
import { GuidelineIngestionResponse, FormattingTemplate } from '@/types/formatting';
import { guidelineIngestionApi } from '@/lib/api';

interface GuidelineIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated?: (template: FormattingTemplate) => void;
}

export const GuidelineIngestionModal: React.FC<GuidelineIngestionModalProps> = ({
  isOpen,
  onClose,
  onTemplateCreated,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [institutionName, setInstitutionName] = useState<string>('');
  const [degreeLevel, setDegreeLevel] = useState<string>('MASTERS');
  const [templateName, setTemplateName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [ingestionResult, setIngestionResult] = useState<GuidelineIngestionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      setError('Please select a PDF or DOCX author guideline document.');
      return;
    }
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (institutionName) formData.append('institution_name', institutionName);
      if (degreeLevel) formData.append('degree_level', degreeLevel);

      const res = await guidelineIngestionApi.uploadAndIngest(formData);
      setIngestionResult(res);
      setTemplateName(
        res.institution_detected
          ? `${res.institution_detected} Guidelines Standard`
          : 'Custom Extracted Guideline Template'
      );
    } catch (err: any) {
      setError(err.message || 'Guideline ingestion failed');
    } finally {
      setUploading(false);
    }
  };

  const handleApproveTemplate = async () => {
    if (!ingestionResult) return;
    setApproving(true);
    setError(null);

    try {
      // Build rules_config from candidate rules
      const rulesConfig: any = {};
      for (const rule of ingestionResult.candidate_rules) {
        if (!rulesConfig[rule.category.toLowerCase()]) {
          rulesConfig[rule.category.toLowerCase()] = {};
        }
        rulesConfig[rule.category.toLowerCase()][rule.parameter] = rule.extracted_value;
      }

      const createdTpl = await guidelineIngestionApi.approveGuidelines(ingestionResult.source_id, {
        name: templateName.trim() || 'Ingested Guideline Template',
        degree_level: degreeLevel,
        rules_config: rulesConfig,
      });

      if (onTemplateCreated) onTemplateCreated(createdTpl);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve guidelines template');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📥</span> Ingest Author Guidelines (PDF/DOCX)
            </h4>
            <p className="text-xs text-slate-500">
              Upload institutional or journal guidelines to automatically extract formatting rules.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Security / Prompt Injection Banner */}
        <div className="p-3 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
          <span>🛡️</span>
          <div>
            <strong>Adversarial Sanitization:</strong> Ingested files are strictly sanitized for prompt injection
            patterns. Extracted rules remain in candidate status until explicitly approved by a researcher.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {!ingestionResult ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Guidelines Document (DOCX or PDF):
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution or Journal Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. University of Edinburgh"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Level</label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="UNDERGRADUATE">Undergraduate</option>
                    <option value="MASTERS">Master&apos;s</option>
                    <option value="PHD">PhD / Doctoral</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={uploading || !file}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {uploading ? 'Parsing & Extracting Rules...' : 'Ingest and Extract Formatting Rules'}
                </button>
              </div>
            </div>
          ) : (
            /* Ingested Candidate Rules Review */
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between text-xs">
                <div>
                  <strong>Detected:</strong> {ingestionResult.institution_detected || 'Academic Guideline'}{' '}
                  • Confidence: {Math.round(ingestionResult.confidence_score * 100)}%
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">
                  Pending Human Approval
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Name:
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Extracted Rule Candidates ({ingestionResult.candidate_rules.length}):
                </h5>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ingestionResult.candidate_rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border border-slate-200 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-800 font-mono">
                          {rule.rule_key} ({rule.parameter})
                        </strong>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">
                          {Math.round(rule.confidence * 100)}% match
                        </span>
                      </div>
                      <div className="text-slate-600">
                        Value:{' '}
                        <code className="text-indigo-600 font-semibold">
                          {JSON.stringify(rule.extracted_value)}
                        </code>
                      </div>
                      {rule.source_excerpt && (
                        <p className="text-[11px] text-slate-400 italic">
                          &quot;{rule.source_excerpt}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
          >
            Cancel
          </button>
          {ingestionResult && (
            <button
              onClick={handleApproveTemplate}
              disabled={approving}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
            >
              {approving ? 'Creating Template...' : '✓ Approve & Create Template'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

