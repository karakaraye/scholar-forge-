'use client';

import React, { useState, useEffect } from 'react';
import { ResearchProject, ResearchMethodology, ResearchVariable, SamplingCalculationResult } from '@/types/project';
import { methodologyApi } from '@/lib/api';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Binary,
  Layers
} from 'lucide-react';

interface MethodologyWorkspaceProps {
  project: ResearchProject;
  onRefreshConsistency?: () => void;
}

export default function MethodologyWorkspace({ project, onRefreshConsistency }: MethodologyWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'recommender' | 'design' | 'sampling' | 'variables'>('recommender');

  // Recommender State
  const [recommendations, setRecommendations] = useState<Array<Record<string, unknown>>>([]);
  const [recommenderLoading, setRecommenderLoading] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Record<string, unknown> | null>(null);

  // Active Project Methodology State
  const [methodology, setMethodology] = useState<ResearchMethodology | null>(null);
  const [savingMethodology, setSavingMethodology] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(false);

  // Sampling Calculator State
  const [samplingFormula, setSamplingFormula] = useState<'YAMANE' | 'COCHRAN' | 'KREJCIE_MORGAN' | 'POWER_ANALYSIS' | 'QUALITATIVE'>('YAMANE');
  const [populationSize, setPopulationSize] = useState<number>(1200);
  const [marginOfError, setMarginOfError] = useState<number>(0.05);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  const [nonresponseRate, setNonresponseRate] = useState<number>(0.10);
  const [power, setPower] = useState<number>(0.80);
  const [effectSize, setEffectSize] = useState<number>(0.50);
  const [qualitativeDesign, setQualitativeDesign] = useState<string>('PURPOSIVE');
  const [samplingResult, setSamplingResult] = useState<SamplingCalculationResult | null>(null);
  const [samplingLoading, setSamplingLoading] = useState(false);

  // Variables State
  const [variables, setVariables] = useState<ResearchVariable[]>([]);
  const [varsLoading, setVarsLoading] = useState(false);
  const [newVarName, setNewVarName] = useState('');
  const [newVarRole, setNewVarRole] = useState<'INDEPENDENT' | 'DEPENDENT' | 'MEDIATING' | 'MODERATING' | 'CONTROL'>('INDEPENDENT');
  const [newVarType, setNewVarType] = useState<'NOMINAL' | 'ORDINAL' | 'INTERVAL' | 'RATIO'>('INTERVAL');
  const [newVarDef, setNewVarDef] = useState('');

  // Initial Load
  useEffect(() => {
    loadMethodology();
    loadVariables();
    runRecommender();
  }, [project.id]);

  const loadMethodology = async () => {
    try {
      const res = await methodologyApi.getProjectMethodology(project.id);
      if (res.methodology) {
        setMethodology(res.methodology);
        setApprovalStatus(res.methodology.approved_by_researcher);
      }
    } catch (err) {
      console.error('Failed to load methodology:', err);
    }
  };

  const loadVariables = async () => {
    setVarsLoading(true);
    try {
      const vars = await methodologyApi.getVariables(project.id);
      setVariables(vars);
    } catch (err) {
      console.error('Failed to load variables:', err);
    } finally {
      setVarsLoading(false);
    }
  };

  const runRecommender = async () => {
    setRecommenderLoading(true);
    try {
      const res = await methodologyApi.recommend({
        discipline: project.discipline_details?.name || 'Multidisciplinary',
        category: project.document_category,
        objectives: project.requirements?.research_objectives || '',
        hypotheses: String(project.requirements?.custom_parameters?.research_hypotheses || '')
      });
      setRecommendations(res.recommendations || []);
      if (res.recommendations && res.recommendations.length > 0) {
        setSelectedDesign(res.recommendations[0]);
      }
    } catch (err) {
      console.error('Failed to run recommender:', err);
    } finally {
      setRecommenderLoading(false);
    }
  };

  const handleApplyMethodology = async (design: Record<string, unknown>) => {
    setSavingMethodology(true);
    try {
      const payload: Partial<ResearchMethodology> = {
        methodology_type: (design.approach as any) || 'QUANTITATIVE',
        design_category: String(design.approach || 'Empirical'),
        design_name: String(design.name || 'Empirical Survey Design'),
        epistemological_stance: String(design.epistemology || 'Positivist / Critical Realism'),
        justification: String(design.description || ''),
        assumptions: (design.assumptions as string[]) || [],
        limitations: (design.limitations as string[]) || [],
        planned_analyses: (design.suggested_analysis as string[]) || [],
        approved_by_researcher: true
      };
      const saved = await methodologyApi.saveProjectMethodology(project.id, payload);
      setMethodology(saved);
      setApprovalStatus(true);
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      console.error('Failed to save methodology:', err);
    } finally {
      setSavingMethodology(false);
    }
  };

  const handleCalculateSampling = async () => {
    setSamplingLoading(true);
    try {
      const res = await methodologyApi.calculateSampling({
        formula: samplingFormula,
        population_size: populationSize,
        margin_of_error: marginOfError,
        confidence_level: confidenceLevel,
        nonresponse_inflation_rate: nonresponseRate,
        power,
        effect_size: effectSize,
        strategy: qualitativeDesign
      });
      setSamplingResult(res);
    } catch (err) {
      console.error('Sampling calculation failed:', err);
    } finally {
      setSamplingLoading(false);
    }
  };

  const handleAddVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVarName.trim()) return;
    try {
      const created = await methodologyApi.createVariable(project.id, {
        name: newVarName.trim(),
        variable_role: newVarRole,
        variable_type: newVarType,
        operational_definition: newVarDef.trim()
      });
      setVariables((prev) => [...prev, created]);
      setNewVarName('');
      setNewVarDef('');
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      console.error('Failed to create variable:', err);
    }
  };

  const handleDeleteVariable = async (id: string) => {
    try {
      await methodologyApi.deleteVariable(id);
      setVariables((prev) => prev.filter((v) => v.id !== id));
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      console.error('Failed to delete variable:', err);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Workspace Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-gold-500" />
            <h2 className="font-serif text-lg font-bold text-navy-950">Intelligent Research Methodology Engine</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Discipline-aware design selection, sampling power calculators, and variable operationalization.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('recommender')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'recommender' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-gold-500" />
            <span>AI Recommender</span>
          </button>
          <button
            onClick={() => setActiveTab('sampling')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'sampling' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-navy-700" />
            <span>Sampling Calculator</span>
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'variables' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-emerald-600" />
            <span>Variables & Constructs ({variables.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI METHODOLOGY RECOMMENDER */}
      {activeTab === 'recommender' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recommended Designs for {project.discipline_details?.name || 'Your Discipline'}
            </span>
            <button
              onClick={runRecommender}
              disabled={recommenderLoading}
              className="text-xs font-semibold text-navy-900 hover:text-gold-600 transition flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Refresh Recommendations</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec: any, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedDesign(rec)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  selectedDesign?.design_type === rec.design_type
                    ? 'border-navy-900 bg-navy-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {rec.approach}
                    </span>
                    <span className="text-xs font-mono font-bold text-gold-600">
                      {Math.round(rec.suitability_score * 100)}% Fit
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-bold text-navy-950">{rec.name}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{rec.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {rec.suggested_analysis?.[0] || 'Statistical Test'}
                  </span>
                  {selectedDesign?.design_type === rec.design_type && (
                    <CheckCircle2 className="w-4 h-4 text-navy-900" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Design Deep-Dive Card */}
          {selectedDesign && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-navy-950">
                      {String(selectedDesign.name)}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-950 text-gold-400">
                      {String(selectedDesign.approach)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{String(selectedDesign.description)}</p>
                </div>

                <button
                  onClick={() => handleApplyMethodology(selectedDesign)}
                  disabled={savingMethodology}
                  className="px-4 py-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  <span>{methodology?.design_name === selectedDesign.name ? 'Approved & Adopted' : 'Adopt Methodology'}</span>
                </button>
              </div>

              {/* Assumptions & Limitations Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Theoretical Assumptions
                  </span>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                    {((selectedDesign.assumptions as string[]) || []).map((assump, i) => (
                      <li key={i}>{assump}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Methodological Limitations
                  </span>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                    {((selectedDesign.limitations as string[]) || []).map((limit, i) => (
                      <li key={i}>{limit}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAMPLING CALCULATOR */}
      {activeTab === 'sampling' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="md:col-span-1 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-serif text-sm font-bold text-navy-950">Sampling Formula & Parameters</h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Formula</label>
                <select
                  value={samplingFormula}
                  onChange={(e) => setSamplingFormula(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white font-medium"
                >
                  <option value="YAMANE">Yamane (1967) - Finite Population</option>
                  <option value="COCHRAN">Cochran - Infinite / Finite with FPC</option>
                  <option value="KREJCIE_MORGAN">Krejcie & Morgan (1970)</option>
                  <option value="POWER_ANALYSIS">Statistical Power Analysis (1 - β)</option>
                  <option value="QUALITATIVE">Qualitative Purposive Saturation</option>
                </select>
              </div>

              {samplingFormula !== 'QUALITATIVE' && (
                <>
                  {samplingFormula !== 'POWER_ANALYSIS' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Population Size (N)
                      </label>
                      <input
                        type="number"
                        value={populationSize}
                        onChange={(e) => setPopulationSize(Number(e.target.value))}
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        placeholder="e.g. 1000"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Margin of Error (e)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={marginOfError}
                        onChange={(e) => setMarginOfError(Number(e.target.value))}
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nonresponse Rate</label>
                      <input
                        type="number"
                        step="0.05"
                        value={nonresponseRate}
                        onChange={(e) => setNonresponseRate(Number(e.target.value))}
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                      />
                    </div>
                  </div>

                  {samplingFormula === 'POWER_ANALYSIS' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Power (1 - β)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={power}
                          onChange={(e) => setPower(Number(e.target.value))}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Effect Size (d / r)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={effectSize}
                          onChange={(e) => setEffectSize(Number(e.target.value))}
                          className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {samplingFormula === 'QUALITATIVE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qualitative Design</label>
                  <select
                    value={qualitativeDesign}
                    onChange={(e) => setQualitativeDesign(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="PURPOSIVE">Purposive Criterion Sampling</option>
                    <option value="MAXIMUM_VARIATION">Maximum Variation Sampling</option>
                    <option value="GROUNDED_THEORY_THEORETICAL">Theoretical Sampling (Grounded Theory)</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleCalculateSampling}
                disabled={samplingLoading}
                className="w-full py-2 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition flex items-center justify-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5 text-gold-400" />
                <span>Calculate Sample Size</span>
              </button>
            </div>

            {/* Result Presentation */}
            <div className="md:col-span-2">
              {samplingResult ? (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {String((samplingResult as any).formula_name || samplingFormula)}
                      </span>
                      <h4 className="font-serif text-base font-bold text-navy-950">Calculated Sample Size</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-navy-950">
                        {samplingResult.calculated_sample_size || (samplingResult as any).typical_sample_range || 'N/A'}
                      </div>
                      {samplingResult.inflated_sample_size && (
                        <div className="text-[11px] font-semibold text-gold-600">
                          {samplingResult.inflated_sample_size} with nonresponse inflation
                        </div>
                      )}
                    </div>
                  </div>

                  {(samplingResult as any).formula_expression && (
                    <div className="bg-slate-50 p-3 rounded-lg font-mono text-xs text-navy-900">
                      Formula: {(samplingResult as any).formula_expression}
                    </div>
                  )}

                  {(samplingResult as any).scientific_warning && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
                      <strong>Methodological Guard:</strong> {(samplingResult as any).scientific_warning}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                      <span className="font-bold text-slate-700">Scientific Assumptions</span>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        {((samplingResult as any).assumptions || [(samplingResult as any).saturation_criterion]).filter(Boolean).map((a: string, i: number) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                      <span className="font-bold text-slate-700">Limitations & Trade-offs</span>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        {((samplingResult as any).limitations || ['Assumes representative sampling frame']).map((l: string, i: number) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-center">
                  <Calculator className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">
                    Configure your population parameters and click Calculate to compute statistically valid sample sizes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VARIABLES & OPERATIONALIZATION */}
      {activeTab === 'variables' && (
        <div className="space-y-6">
          <form onSubmit={handleAddVariable} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-serif text-sm font-bold text-navy-950">Add Operationalized Research Variable</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Variable Name</label>
                <input
                  type="text"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  placeholder="e.g. Employee Retention"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newVarRole}
                  onChange={(e) => setNewVarRole(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="INDEPENDENT">Independent (IV)</option>
                  <option value="DEPENDENT">Dependent (DV)</option>
                  <option value="MEDIATING">Mediating</option>
                  <option value="MODERATING">Moderating</option>
                  <option value="CONTROL">Control</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Measurement Scale</label>
                <select
                  value={newVarType}
                  onChange={(e) => setNewVarType(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="INTERVAL">Interval (Likert 1-5)</option>
                  <option value="RATIO">Ratio (Continuous)</option>
                  <option value="ORDINAL">Ordinal (Ranked)</option>
                  <option value="NOMINAL">Nominal (Categorical)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operational Definition / Indicators</label>
              <input
                type="text"
                value={newVarDef}
                onChange={(e) => setNewVarDef(e.target.value)}
                placeholder="How this variable is concretely observed and quantified in this study"
                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>Save Variable</span>
              </button>
            </div>
          </form>

          {/* Variables List */}
          <div className="space-y-2">
            {variables.map((v) => (
              <div
                key={v.id}
                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-navy-950">{v.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-50 text-navy-800 border border-navy-100">
                      {v.variable_role || (v as any).scale_of_measurement}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {v.variable_type}
                    </span>
                  </div>
                  {v.operational_definition && (
                    <p className="text-[11px] text-slate-500">{v.operational_definition}</p>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteVariable(v.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                  title="Delete Variable"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

