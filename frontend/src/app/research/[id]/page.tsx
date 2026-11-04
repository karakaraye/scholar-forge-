'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { projectsApi } from '@/lib/api';
import { ResearchProject, DocumentSection } from '@/types/project';
import { formatDate } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import ConfirmationModal from '@/components/ConfirmationModal';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Tag,
  Globe,
  Archive,
  Trash2,
  ChevronLeft,
  Sparkles,
  Layers,
  FileText,
  Bookmark,
  History,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  PenTool,
} from 'lucide-react';

export default function ResearchWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const projectId = params?.id as string;

  const [project, setProject] = useState<ResearchProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'outline' | 'requirements' | 'sources' | 'versions'>('editor');
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.getById(projectId);
      setProject(data);
      if (data.documents && data.documents.length > 0 && data.documents[0].sections.length > 0) {
        setSelectedSection(data.documents[0].sections[0]);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load research project.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (user && projectId) {
      loadProject();
    }
  }, [user, projectId, loadProject]);

  const handleArchive = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await projectsApi.archive(project.id);
      setArchiveModalOpen(false);
      await loadProject();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await projectsApi.delete(project.id);
      setDeleteModalOpen(false);
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-navy-900 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Research Workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="font-serif text-lg font-bold text-slate-900">Workspace Unavailable</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {error || 'This research project could not be found or you do not have permission to view it.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sections = project.documents?.[0]?.sections || [];

  return (
    <div className="flex-1 flex">
      <Sidebar className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Breadcrumbs & Back */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/dashboard" className="hover:text-navy-900 transition">
                Dashboard
              </Link>
              <span>/</span>
              <Link href="/research" className="hover:text-navy-900 transition">
                Research
              </Link>
              <span>/</span>
              <span className="text-gold-600 truncate max-w-xs">{project.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setArchiveModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5 text-slate-500" />
                <span>{project.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}</span>
              </button>

              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Dedicated Research Workspace Header Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="space-y-2 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-navy-950 text-gold-400">
                    {project.document_category.replace('_', ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gold-50 text-gold-700 border border-gold-200">
                    {project.document_subtype}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      project.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  {project.title}
                </h1>
              </div>
            </div>

            {/* Metadata Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Discipline</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-navy-700 shrink-0" />
                  {project.discipline_details?.name || 'Academic'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Level</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  {project.academic_level}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Citation</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                  {project.citation_style}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Language</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 truncate">
                  <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {project.preferred_language}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Institution</span>
                <span className="font-bold text-slate-800 flex items-center gap-1 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {project.institution || 'Independent'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Last Updated</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {formatDate(project.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'editor'
                  ? 'border-navy-900 text-navy-900 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4 text-gold-600" />
              <span>Manuscript Workspace</span>
            </button>

            <button
              onClick={() => setActiveTab('outline')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'outline'
                  ? 'border-navy-900 text-navy-900 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Dynamic Outline ({sections.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'requirements'
                  ? 'border-navy-900 text-navy-900 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Research Requirements</span>
            </button>

            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'sources'
                  ? 'border-navy-900 text-navy-900 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Literature & Citations</span>
            </button>

            <button
              onClick={() => setActiveTab('versions')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'versions'
                  ? 'border-navy-900 text-navy-900 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Version History</span>
            </button>
          </div>

          {/* TAB 1: Manuscript Workspace (Editor Placeholder & Outline Nav) */}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sections Sidebar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-navy-700" />
                    <span>Chapters & Sections</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {sections.length} generated
                  </span>
                </div>

                <div className="space-y-1.5">
                  {sections.map((section, idx) => {
                    const isSelected = selectedSection?.id === section.id;
                    return (
                      <button
                        type="button"
                        key={section.id}
                        onClick={() => setSelectedSection(section)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-navy-950 text-gold-400 font-bold shadow-sm'
                            : 'hover:bg-slate-100 text-slate-700 font-medium'
                        }`}
                      >
                        <span className="truncate pr-2">
                          {idx + 1}. {section.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-navy-800 text-gold-300' : 'bg-slate-200/60 text-slate-500'
                          }`}
                        >
                          {section.section_type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editor Workspace Placeholder */}
              <div className="lg:col-span-2 space-y-4">
                {/* AI Assistant Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-navy-950 to-navy-900 text-white border border-navy-800 flex items-start gap-3 shadow-sm">
                  <Sparkles className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                      Stage 2 AI Writing Assistant Horizon
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      AI academic writing, peer-reviewed reference synthesis, dynamic outline synthesis, and formatting engines will be enabled in Stage 2.
                    </p>
                  </div>
                </div>

                {/* Section Writing Canvas Placeholder */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm min-h-[420px] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                          {selectedSection?.section_type || 'MANUSCRIPT SECTION'}
                        </span>
                        <h2 className="font-serif text-xl font-bold text-slate-900 mt-0.5">
                          {selectedSection?.title || 'Academic Manuscript Section'}
                        </h2>
                      </div>
                      <span className="text-xs text-slate-400">
                        Words: {selectedSection?.word_count || 0}
                      </span>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed space-y-4">
                      <p className="italic text-slate-400 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        This section has been scaffolded according to your {project.document_category.replace('_', ' ')} requirements. In Stage 2, the rich block editor and AI synthesis pipeline will connect here.
                      </p>

                      <div className="space-y-2 pt-2">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                        <div className="h-4 bg-slate-100 rounded w-5/6" />
                        <div className="h-4 bg-slate-100 rounded w-4/6" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Draft Status: Scaffolding Complete</span>
                    <span>Citation Engine: {project.citation_style}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic Outline */}
          {activeTab === 'outline' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Dynamic Chapter & Section Scaffolding
              </h3>
              <p className="text-xs text-slate-500">
                Generated specifically for {project.document_subtype} in {project.discipline_details?.name || 'your field'}.
              </p>

              <div className="space-y-3 pt-4">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-navy-950 text-gold-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{sec.title}</h4>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          Type: {sec.section_type}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium">{sec.word_count} words</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Research Requirements */}
          {activeTab === 'requirements' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Research Requirements & Parameters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block">
                    Research Methodology
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {project.requirements?.research_methodology || 'No specific methodology registered yet.'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block">
                    Research Objectives
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {project.requirements?.research_objectives || 'No specific objectives registered yet.'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block">
                    Supervisor / Department Requirements
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {project.requirements?.supervisor_requirements || 'Standard faculty submission requirements.'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-xs font-bold text-navy-950 uppercase tracking-wider block">
                    Target Word Count
                  </span>
                  <p className="text-xs text-slate-700 font-bold">
                    {project.requirements?.target_word_count
                      ? `${project.requirements.target_word_count.toLocaleString()} words`
                      : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Literature & Citations Placeholder */}
          {activeTab === 'sources' && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center max-w-xl mx-auto space-y-4">
              <Bookmark className="w-10 h-10 text-gold-500 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Literature & Citation Engine Placeholder
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Stage 1 establishes the database schema for <code className="text-xs bg-slate-100 p-1">ResearchSource</code>, <code className="text-xs bg-slate-100 p-1">ProjectSource</code>, and <code className="text-xs bg-slate-100 p-1">Citation</code> formatted to {project.citation_style}. Automated search, synthesis, and bibtex extraction will launch in Stage 2.
              </p>
              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
              >
                Explore Library Framework
              </Link>
            </div>
          )}

          {/* TAB 5: Version History */}
          {activeTab === 'versions' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-slate-900">
                Version History & Manuscript Revisions
              </h3>

              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-950 text-gold-400">
                      v1.0.0
                    </span>
                    <span className="text-xs font-bold text-slate-900">Initial Scaffold</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Created via ScholarForge Multidisciplinary Setup Wizard
                  </p>
                </div>
                <span className="text-xs text-slate-400">{formatDate(project.created_at)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Research Project"
        message={`Are you sure you want to delete "${project.title}"? This will permanently remove all documents, chapters, and requirements.`}
        confirmText="Delete Permanently"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Archive Modal */}
      <ConfirmationModal
        isOpen={archiveModalOpen}
        title={project.status === 'ARCHIVED' ? 'Unarchive Project' : 'Archive Project'}
        message={
          project.status === 'ARCHIVED'
            ? 'Restore this project to active workspace status?'
            : 'Archive this project? It will be moved to the archived repository.'
        }
        confirmText={project.status === 'ARCHIVED' ? 'Restore Active' : 'Archive'}
        confirmVariant="warning"
        isLoading={actionLoading}
        onConfirm={handleArchive}
        onCancel={() => setArchiveModalOpen(false)}
      />
    </div>
  );
}
