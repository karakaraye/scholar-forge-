'use client';

import React, { useState, useEffect } from 'react';
import {
  JournalProfile,
  JournalArticleType,
  ManuscriptMetadata,
  SubmissionReadinessResult,
  AuthorAffiliation,
  OrcidIdentifier,
} from '@/types/formatting';
import { journalsApi, publicationMetadataApi } from '@/lib/api';

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

interface JournalPublicationWorkspaceProps {
  projectId: string;
}

export const JournalPublicationWorkspace: React.FC<JournalPublicationWorkspaceProps> = ({
  projectId,
}) => {
  const [journals, setJournals] = useState<JournalProfile[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<string>('');
  const [activeArticleType, setActiveArticleType] = useState<JournalArticleType>('ORIGINAL_RESEARCH');
  const [metadata, setMetadata] = useState<ManuscriptMetadata | null>(null);
  const [readiness, setReadiness] = useState<SubmissionReadinessResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingReadiness, setCheckingReadiness] = useState<boolean>(false);
  const [savingMeta, setSavingMeta] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [corrName, setCorrName] = useState<string>('');
  const [corrEmail, setCorrEmail] = useState<string>('');
  const [corrPhone, setCorrPhone] = useState<string>('');
  const [affiliations, setAffiliations] = useState<AuthorAffiliation[]>([]);
  const [orcids, setOrcids] = useState<OrcidIdentifier[]>([]);
  const [coiStatement, setCoiStatement] = useState<string>('');
  const [dataStatement, setDataStatement] = useState<string>('');
  const [ethicsStatement, setEthicsStatement] = useState<string>('');
  const [fundingDetails, setFundingDetails] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jList, meta] = await Promise.all([
        journalsApi.listJournals(),
        publicationMetadataApi.getMetadata(projectId).catch(() => null),
      ]);
      setJournals(jList);
      if (jList.length > 0) setSelectedJournalId(jList[0].id);

      if (meta) {
        setMetadata(meta);
        setCorrName(meta.corresponding_author_name || '');
        setCorrEmail(meta.corresponding_author_email || '');
        setCorrPhone(meta.corresponding_author_phone || '');
        setAffiliations(meta.affiliations || []);
        setOrcids(meta.orcid_identifiers || []);
        setCoiStatement(meta.conflict_of_interest_statement || '');
        setDataStatement(meta.data_availability_statement || '');
        setEthicsStatement(meta.ethics_approval_statement || '');
        setFundingDetails(meta.funding_grant_details || '');
      }
    } catch (err: any) {
      setError('Failed to load journal profiles or metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReadiness = async (journalId: string) => {
    if (!journalId) return;
    setCheckingReadiness(true);
    try {
      const result = await journalsApi.getSubmissionReadiness(projectId, journalId);
      setReadiness(result);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCheckingReadiness(false);
    }
  };

  useEffect(() => {
    if (selectedJournalId) {
      handleCheckReadiness(selectedJournalId);
    }
  }, [selectedJournalId]);

  const handleSaveMetadata = async () => {
    setSavingMeta(true);
    setSaveMsg(null);
    setError(null);

    // Validate ORCIDs format
    for (const item of orcids) {
      if (item.orcid && !ORCID_REGEX.test(item.orcid.trim())) {
        setError(`Invalid ORCID identifier: "${item.orcid}". Must follow format 0000-0002-1825-0097.`);
        setSavingMeta(false);
        return;
      }
    }

    try {
      const payload: Partial<ManuscriptMetadata> = {
        corresponding_author_name: corrName,
        corresponding_author_email: corrEmail,
        corresponding_author_phone: corrPhone,
        affiliations,
        orcid_identifiers: orcids,
        conflict_of_interest_statement: coiStatement,
        data_availability_statement: dataStatement,
        ethics_approval_statement: ethicsStatement,
        funding_grant_details: fundingDetails,
      };
      const updated = await publicationMetadataApi.updateMetadata(projectId, payload);
      setMetadata(updated);
      setSaveMsg('Publication metadata saved successfully!');
      if (selectedJournalId) handleCheckReadiness(selectedJournalId);
    } catch (err: any) {
      setError(err.message || 'Failed to update metadata');
    } finally {
      setSavingMeta(false);
    }
  };

  const addAffiliation = () => {
    setAffiliations([...affiliations, { author_name: '', affiliation: '', email: '' }]);
  };

  const removeAffiliation = (idx: number) => {
    setAffiliations(affiliations.filter((_, i) => i !== idx));
  };

  const updateAffiliation = (idx: number, field: keyof AuthorAffiliation, val: any) => {
    const updated = [...affiliations];
    updated[idx] = { ...updated[idx], [field]: val };
    setAffiliations(updated);
  };

  const addOrcid = () => {
    setOrcids([...orcids, { name: '', orcid: '' }]);
  };

  const removeOrcid = (idx: number) => {
    setOrcids(orcids.filter((_, i) => i !== idx));
  };

  const updateOrcid = (idx: number, field: keyof OrcidIdentifier, val: string) => {
    const updated = [...orcids];
    updated[idx] = { ...updated[idx], [field]: val };
    setOrcids(updated);
  };

  const selectedJournal = journals.find((j) => j.id === selectedJournalId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>📰</span> Journal Publication Standards & Submission Readiness
          </h3>
          <p className="text-xs text-slate-500">
            Configure journal author guidelines, verified ORCID identifiers, and submission readiness checklists.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {readiness && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border rounded-lg">
              <span className="text-xs text-slate-500">Readiness Score:</span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  readiness.readiness_score >= 85
                    ? 'bg-emerald-100 text-emerald-800'
                    : readiness.readiness_score >= 60
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {readiness.readiness_score}%
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {error}
        </div>
      )}
      {saveMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          {saveMsg}
        </div>
      )}

      {/* Article Structures Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Target Article Architecture:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'ORIGINAL_RESEARCH', label: 'Original Research (IMRaD)', desc: 'Intro, Methods, Results, Discussion' },
            { id: 'REVIEW_ARTICLE', label: 'Review Article', desc: 'Narrative synthesis of published work' },
            { id: 'SYSTEMATIC_REVIEW', label: 'Systematic Review (PRISMA)', desc: 'PRISMA 2020 protocol & synthesis' },
            { id: 'CONCEPTUAL_THEORETICAL', label: 'Conceptual / Theoretical', desc: 'Propositions & conceptual framework' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveArticleType(type.id as any)}
              className={`p-3 rounded-lg border text-left transition ${
                activeArticleType === type.id
                  ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900">{type.label}</div>
              <div className="text-[10px] text-slate-500 mt-1">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Journal Profiles Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700">
          Select Target Publication Journal:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {journals.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelectedJournalId(j.id)}
              className={`p-3 rounded-lg border text-left transition ${
                selectedJournalId === j.id
                  ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-xs text-slate-900 truncate">{j.journal_name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{j.publisher}</div>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-600">
                <span>Limit: {j.word_limit ? `${j.word_limit} w` : 'Flexible'}</span>
                {j.double_blind_review && (
                  <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[9px]">Blind</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Submission Readiness Checklist */}
      {selectedJournal && readiness && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              Submission Readiness: {selectedJournal.journal_name}
            </h4>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                readiness.is_ready
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {readiness.is_ready ? '✓ Submission Ready' : 'Pending Declarations'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {readiness.checks.map((chk, i) => (
              <div
                key={i}
                className="p-2.5 rounded border bg-white flex items-start gap-2 shadow-2xs"
              >
                <span className={chk.passed ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                  {chk.passed ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{chk.name}</div>
                  <div className="text-[11px] text-slate-500">{chk.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Author & Publication Metadata Form */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Author Affiliations, ORCIDs & Declarations
          </h4>
          <button
            onClick={handleSaveMetadata}
            disabled={savingMeta}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {savingMeta ? 'Saving...' : '💾 Save Publication Metadata'}
          </button>
        </div>

        {/* Corresponding Author Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 mb-1">Corresponding Author Name</label>
            <input
              type="text"
              value={corrName}
              onChange={(e) => setCorrName(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Corresponding Author Email</label>
            <input
              type="email"
              value={corrEmail}
              onChange={(e) => setCorrEmail(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Phone Number</label>
            <input
              type="text"
              value={corrPhone}
              onChange={(e) => setCorrPhone(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* ORCIDs List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Verified ORCID Identifiers (Format: 0000-0002-1825-0097)
            </label>
            <button
              onClick={addOrcid}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              + Add Author ORCID
            </button>
          </div>

          {orcids.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Author Name"
                value={item.name}
                onChange={(e) => updateOrcid(idx, 'name', e.target.value)}
                className="w-1/3 text-xs border rounded p-2 focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="0000-0002-1825-0097"
                value={item.orcid}
                onChange={(e) => updateOrcid(idx, 'orcid', e.target.value)}
                className="w-1/2 text-xs border rounded p-2 font-mono focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={() => removeOrcid(idx)}
                className="text-red-500 hover:text-red-700 text-xs px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Mandatory Declarations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ethics Approval / Exemption Statement (Mandatory for Empirical Studies)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Approved by the Institutional Review Board (Approval #IRB-2025-091)..."
              value={ethicsStatement}
              onChange={(e) => setEthicsStatement(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Data Availability Statement
            </label>
            <textarea
              rows={3}
              placeholder="e.g. The datasets generated during the current study are available in the Zenodo repository..."
              value={dataStatement}
              onChange={(e) => setDataStatement(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Conflict of Interest Declaration
            </label>
            <textarea
              rows={2}
              placeholder="e.g. The authors declare that they have no competing interests."
              value={coiStatement}
              onChange={(e) => setCoiStatement(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Funding / Grant Information
            </label>
            <textarea
              rows={2}
              placeholder="e.g. This research received financial support from NIH Grant #R01-HG009..."
              value={fundingDetails}
              onChange={(e) => setFundingDetails(e.target.value)}
              className="w-full border rounded p-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

