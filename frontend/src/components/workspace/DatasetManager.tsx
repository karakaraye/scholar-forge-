'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResearchProject, ResearchDataset, DatasetVersion } from '@/types/project';
import { datasetsApi } from '@/lib/api';
import {
  Database,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  History,
  RotateCcw,
  Sparkles,
  Layers,
  Table,
  Filter,
  Sliders,
  ShieldCheck,
  Loader2,
  Info
} from 'lucide-react';

interface DatasetManagerProps {
  project: ResearchProject;
  onRefreshConsistency?: () => void;
  onDatasetSelected?: (dataset: ResearchDataset) => void;
}

export default function DatasetManager({ project, onRefreshConsistency, onDatasetSelected }: DatasetManagerProps) {
  const [datasets, setDatasets] = useState<ResearchDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<ResearchDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // File Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cleaning transformation state
  const [transformAction, setTransformAction] = useState<string>('impute_missing');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'constant'>('mean');
  const [constantValue, setConstantValue] = useState<string>('0');
  const [iqrMultiplier, setIqrMultiplier] = useState<number>(1.5);
  const [reverseMin, setReverseMin] = useState<number>(1);
  const [reverseMax, setReverseMax] = useState<number>(5);
  const [compositeName, setCompositeName] = useState<string>('composite_score');
  const [compositeCols, setCompositeCols] = useState<string[]>([]);
  const [compositeMethod, setCompositeMethod] = useState<'mean' | 'sum'>('mean');

  // Load Datasets
  const loadDatasets = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await datasetsApi.list(project.id);
      setDatasets(data);
      if (data.length > 0) {
        const active = selectedDataset ? data.find(d => d.id === selectedDataset.id) || data[0] : data[0];
        setSelectedDataset(active);
        if (onDatasetSelected) onDatasetSelected(active);
      } else {
        setSelectedDataset(null);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // Handle File Upload
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File size exceeds the 20MB academic research dataset limit.');
      return;
    }

    setUploading(true);
    try {
      const name = file.name.replace(/\.[^/.]+$/, '');
      const format = file.name.endsWith('.csv') ? 'CSV' : file.name.endsWith('.json') ? 'JSON' : 'XLSX';
      const uploaded = await datasetsApi.upload(project.id, file, name, format);
      setDatasets(prev => [uploaded, ...prev]);
      setSelectedDataset(uploaded);
      if (onDatasetSelected) onDatasetSelected(uploaded);
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Execute Transformation
  const handleTransform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) return;
    setTransforming(true);
    try {
      let params: Record<string, unknown> = {};

      if (transformAction === 'impute_missing') {
        params = {
          column: targetColumn,
          strategy: imputeStrategy,
          constant_value: constantValue,
        };
      } else if (transformAction === 'drop_duplicates') {
        params = {};
      } else if (transformAction === 'handle_outliers') {
        params = {
          column: targetColumn,
          method: 'winsorize',
          iqr_multiplier: iqrMultiplier,
        };
      } else if (transformAction === 'reverse_score') {
        params = {
          column: targetColumn,
          min_val: reverseMin,
          max_val: reverseMax,
        };
      } else if (transformAction === 'composite_score') {
        params = {
          composite_name: compositeName,
          columns: compositeCols,
          method: compositeMethod,
        };
      }

      const updated = await datasetsApi.transform(selectedDataset.id, transformAction, params);
      setSelectedDataset(updated);
      setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d));
      if (onDatasetSelected) onDatasetSelected(updated);
      alert('Transformation successfully applied and new dataset version recorded!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Transformation failed');
    } finally {
      setTransforming(false);
    }
  };

  // Rollback Version
  const handleRollback = async (versionNumber: number) => {
    if (!selectedDataset) return;
    if (!confirm(`Rollback dataset to version ${versionNumber}?`)) return;
    setRollingBack(true);
    try {
      const restored = await datasetsApi.rollback(selectedDataset.id, versionNumber);
      setSelectedDataset(restored);
      setDatasets(prev => prev.map(d => d.id === restored.id ? restored : d));
      if (onDatasetSelected) onDatasetSelected(restored);
      alert(`Restored version ${versionNumber} successfully!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rollback failed');
    } finally {
      setRollingBack(false);
    }
  };

  // Delete Dataset
  const handleDeleteDataset = async (id: string) => {
    if (!confirm('Permanently delete this dataset and its version history?')) return;
    try {
      await datasetsApi.delete(id);
      setDatasets(prev => prev.filter(d => d.id !== id));
      if (selectedDataset?.id === id) {
        setSelectedDataset(null);
      }
      if (onRefreshConsistency) onRefreshConsistency();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete dataset');
    }
  };

  // Available column names from selected dataset
  const columnsList: string[] = selectedDataset?.columns_schema?.columns || [];
  const profiles: Record<string, any> = selectedDataset?.columns_schema?.profiles || {};
  const hasFormulaSanitized: boolean = !!selectedDataset?.columns_schema?.has_formula_sanitized;
  const versions: DatasetVersion[] = selectedDataset?.versions || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-slate-900">Research Dataset Management & Cleaning</h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload authentic empirical data (CSV, XLSX, JSON up to 20MB). Automatic formula injection sanitization,
                type profiling, and non-destructive version lineage with instant rollback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".csv,.xlsx,.json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin text-gold-400" /> : <Upload className="w-4 h-4 text-gold-400" />}
              <span>Upload New Dataset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Formula Sanitization Alert Banner */}
      {hasFormulaSanitized && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">Security Protection Applied:</span> CSV formula injection characters
            (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">=, +, -, @</code>) were detected in uploaded cells and safely escaped with single quotes to protect researcher environments.
          </div>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-700">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Datasets List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-serif text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Project Datasets</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {datasets.length}
              </span>
            </h3>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                dragActive ? 'border-navy-900 bg-navy-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800">Drag & drop dataset file</p>
              <p className="text-[10px] text-slate-400 mt-0.5">CSV, XLSX, or JSON (max 20MB)</p>
            </div>

            {/* List */}
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading datasets...</div>
            ) : datasets.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No datasets uploaded yet.</div>
            ) : (
              <div className="space-y-2">
                {datasets.map(ds => (
                  <div
                    key={ds.id}
                    onClick={() => {
                      setSelectedDataset(ds);
                      if (onDatasetSelected) onDatasetSelected(ds);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      selectedDataset?.id === ds.id
                        ? 'border-navy-900 bg-navy-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileSpreadsheet className="w-4 h-4 text-navy-800 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900 truncate">{ds.name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDataset(ds.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {ds.file_format}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {ds.row_count} rows × {ds.column_count} cols
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-navy-100 text-navy-800 ml-auto">
                        v{ds.current_version_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Profiling, Cleaning & Version Lineage (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDataset ? (
            <>
              {/* Dataset Profile Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-900">{selectedDataset.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedDataset.row_count} rows, {selectedDataset.column_count} attributes, Version {selectedDataset.current_version_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified Raw Data Intact
                    </span>
                  </div>
                </div>

                {/* Column Profiling Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-navy-900" />
                    <span>Attribute Types & Distribution Profile</span>
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Column Name</th>
                          <th className="py-2.5 px-3">Inferred Type</th>
                          <th className="py-2.5 px-3">Missing (%)</th>
                          <th className="py-2.5 px-3">Mean / Mode</th>
                          <th className="py-2.5 px-3">Min – Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {columnsList.map((colName) => {
                          const p = profiles[colName] || {};
                          return (
                            <tr key={colName} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono font-bold text-navy-900">{colName}</td>
                              <td className="py-2 px-3">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                                  {p.type || 'UNKNOWN'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`font-mono text-xs ${p.missing_percentage > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                                  {p.missing_count || 0} ({p.missing_percentage || 0}%)
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-xs">
                                {p.mean !== undefined ? Number(p.mean).toFixed(2) : (p.mode || '—')}
                              </td>
                              <td className="py-2 px-3 text-slate-500 font-mono text-xs">
                                {p.min !== undefined && p.max !== undefined ? `${p.min} – ${p.max}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Reproducible Data Cleaning Tools */}
                <form onSubmit={handleTransform} className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-navy-900" />
                      <span>Reproducible Cleaning & Transformation</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Creates a new version; never overwrites raw data
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Transformation Action
                      </label>
                      <select
                        value={transformAction}
                        onChange={(e) => setTransformAction(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                      >
                        <option value="impute_missing">Impute Missing Values</option>
                        <option value="drop_duplicates">Drop Duplicate Observations</option>
                        <option value="handle_outliers">Winsorize Outliers (IQR Method)</option>
                        <option value="reverse_score">Reverse-Code Scale Items</option>
                        <option value="composite_score">Create Composite / Index Scale</option>
                      </select>
                    </div>

                    {/* Dynamic Action Fields */}
                    {transformAction === 'impute_missing' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Column</label>
                          <select
                            value={targetColumn}
                            onChange={(e) => setTargetColumn(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                          >
                            <option value="">Select Column...</option>
                            {columnsList.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Imputation Strategy</label>
                          <select
                            value={imputeStrategy}
                            onChange={(e) => setImputeStrategy(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                          >
                            <option value="mean">Mean (Continuous / Interval)</option>
                            <option value="median">Median (Skewed Data / Ordinal)</option>
                            <option value="mode">Mode (Categorical / Nominal)</option>
                            <option value="constant">Constant Value</option>
                          </select>
                        </div>
                      </>
                    )}

                    {transformAction === 'handle_outliers' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Numeric Column</label>
                          <select
                            value={targetColumn}
                            onChange={(e) => setTargetColumn(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                          >
                            <option value="">Select Column...</option>
                            {columnsList.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">IQR Multiplier</label>
                          <input
                            type="number"
                            step="0.1"
                            value={iqrMultiplier}
                            onChange={(e) => setIqrMultiplier(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900"
                          />
                        </div>
                      </>
                    )}

                    {transformAction === 'reverse_score' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Likert Column</label>
                          <select
                            value={targetColumn}
                            onChange={(e) => setTargetColumn(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                          >
                            <option value="">Select Column...</option>
                            {columnsList.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Min (e.g. 1)</label>
                            <input
                              type="number"
                              value={reverseMin}
                              onChange={(e) => setReverseMin(parseInt(e.target.value))}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Max (e.g. 5)</label>
                            <input
                              type="number"
                              value={reverseMax}
                              onChange={(e) => setReverseMax(parseInt(e.target.value))}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {transformAction === 'composite_score' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">New Variable Name</label>
                          <input
                            type="text"
                            value={compositeName}
                            onChange={(e) => setCompositeName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Method</label>
                          <select
                            value={compositeMethod}
                            onChange={(e) => setCompositeMethod(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-navy-900 bg-white"
                          >
                            <option value="mean">Mean Composite</option>
                            <option value="sum">Sum Composite</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Multi-column selector for composite score */}
                  {transformAction === 'composite_score' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        Select Component Columns to Combine
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                        {columnsList.map(c => (
                          <label
                            key={c}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer border transition flex items-center gap-1.5 ${
                              compositeCols.includes(c)
                                ? 'bg-navy-900 text-white border-navy-900 font-bold'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={compositeCols.includes(c)}
                              onChange={(e) => {
                                if (e.target.checked) setCompositeCols([...compositeCols, c]);
                                else setCompositeCols(compositeCols.filter(x => x !== c));
                              }}
                              className="hidden"
                            />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={transforming}
                      className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {transforming ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400" /> : <Sparkles className="w-3.5 h-3.5 text-gold-400" />}
                      <span>Apply Transformation</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Version History & Rollback Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-navy-900" />
                    <span>Dataset Version Lineage ({versions.length} Snapshots)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Revert any transformation with full data audit trail
                  </span>
                </h4>

                <div className="space-y-2">
                  {versions.map(v => (
                    <div
                      key={v.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        v.version_number === selectedDataset.current_version_number
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-navy-900 text-gold-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          v{v.version_number}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">
                            {v.transformation_applied || 'Initial Dataset Ingestion'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {v.created_at ? new Date(v.created_at).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>

                      {v.version_number !== selectedDataset.current_version_number ? (
                        <button
                          type="button"
                          onClick={() => handleRollback(v.version_number)}
                          disabled={rollingBack}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Rollback</span>
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active Version
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
              <Database className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-serif text-base font-bold text-slate-900">No Dataset Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a CSV, XLSX, or JSON empirical dataset or select one from the list to view attributes and execute cleaning transformations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

