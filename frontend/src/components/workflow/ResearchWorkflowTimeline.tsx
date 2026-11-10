'use client';

import React, { useState, useEffect } from 'react';
import {
  ResearchWorkflow,
  WorkflowStep,
  WorkflowStageKey,
  WorkflowStatus,
} from '@/types/project';
import { workflowApi } from '@/lib/api';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface ResearchWorkflowTimelineProps {
  projectId: string;
  onNavigateToTab?: (tabKey: string) => void;
}

export default function ResearchWorkflowTimeline({
  projectId,
  onNavigateToTab,
}: ResearchWorkflowTimelineProps) {
  const [workflow, setWorkflow] = useState<ResearchWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);

  const fetchWorkflow = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workflowApi.get(projectId);
      setWorkflow(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load research workflow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [projectId]);

  const handleStepStatusChange = async (stepId: string, newStatus: WorkflowStatus) => {
    setUpdatingStepId(stepId);
    try {
      const updatedStep = await workflowApi.updateStep(stepId, {
        status: newStatus,
        progress_pct: newStatus === 'COMPLETED' ? 100 : newStatus === 'IN_PROGRESS' ? 50 : 0,
      });

      setWorkflow((prev) => {
        if (!prev) return null;
        const newStages = prev.stages.map((s) => (s.id === stepId ? updatedStep : s));
        const totalPct = newStages.reduce((acc, curr) => acc + curr.progress_pct, 0);
        const overall = Math.round(totalPct / (newStages.length || 1));
        return {
          ...prev,
          stages: newStages,
          overall_progress: overall,
        };
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update workflow step');
    } finally {
      setUpdatingStepId(null);
    }
  };

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            In Progress
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Blocked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <PlayCircle className="w-3.5 h-3.5 text-slate-400" />
            Not Started
          </span>
        );
    }
  };

  const mapStageToTab = (stageKey: WorkflowStageKey): string => {
    switch (stageKey) {
      case 'SETUP':
      case 'PLANNING':
        return 'planning';
      case 'LITERATURE':
      case 'FRAMEWORK':
        return 'manuscript';
      case 'METHODOLOGY':
        return 'methodology';
      case 'INSTRUMENT':
        return 'instruments';
      case 'DATA_COLLECTION':
      case 'DATA_ANALYSIS':
        return 'datasets';
      case 'RESULTS':
        return 'results';
      case 'MANUSCRIPT':
        return 'assembly';
      case 'QUALITY_ASSURANCE':
        return 'quality';
      case 'REVIEW':
        return 'review';
      default:
        return 'manuscript';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-navy-800 mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Research Lifecycle Engine...</p>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-rose-900">{error || 'Workflow not found.'}</p>
        <button
          onClick={fetchWorkflow}
          className="mt-4 px-4 py-2 bg-navy-900 text-white text-xs font-bold rounded-lg hover:bg-navy-800 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Overall Lifecycle Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-navy-50 text-navy-900 rounded-lg">
                <Layers className="w-5 h-5 text-gold-500" />
              </span>
              <div>
                <h2 className="text-lg font-bold font-serif text-slate-900">
                  Adaptive Academic Research Lifecycle
                </h2>
                <p className="text-xs text-slate-500">
                  Deterministic progress calculation powered by authentic database entities.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWorkflow}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Completion
              </span>
              <span className="text-2xl font-black text-navy-950">
                {workflow.overall_progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-navy-900 via-gold-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, workflow.overall_progress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 12-Stage Visual Timeline Cards */}
      <div className="space-y-3">
        {workflow.stages.map((step, idx) => {
          const isCurrent = step.stage_key === workflow.current_stage;
          const targetTab = mapStageToTab(step.stage_key);

          return (
            <div
              key={step.id}
              className={`p-5 rounded-2xl border transition-all duration-200 bg-white ${
                isCurrent
                  ? 'border-navy-900 ring-2 ring-navy-900/10 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Stage Info */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                      step.status === 'COMPLETED'
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-navy-950 text-gold-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                      {getStatusBadge(step.status)}
                      {step.is_required && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Status Controls & Tab Navigation */}
                <div className="flex items-center gap-3 self-end lg:self-center">
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      disabled={updatingStepId === step.id}
                      onClick={() => handleStepStatusChange(step.id, 'IN_PROGRESS')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                        step.status === 'IN_PROGRESS'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      disabled={updatingStepId === step.id}
                      onClick={() => handleStepStatusChange(step.id, 'COMPLETED')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                        step.status === 'COMPLETED'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Complete
                    </button>
                  </div>

                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab(targetTab)}
                      className="px-3 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition flex items-center gap-1 shadow-sm"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

