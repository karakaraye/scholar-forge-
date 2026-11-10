'use client';

import { DocumentExportWorkspace } from '@/components/export/DocumentExportWorkspace';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { projectsApi, documentsApi, researchApi, citationsApi } from '@/lib/api';
import {
  ResearchProject,
  DocumentSection,
  DocumentVersion,
  ConsistencyReport,
  StructureTemplate,
  AIAction,
  AIGenerateResponse,
  ResearchSource,
} from '@/types/project';
import { formatDate } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import ConfirmationModal from '@/components/ConfirmationModal';
import AcademicEditor, { AcademicEditorHandle } from '@/components/editor/AcademicEditor';
import OutlineManager from '@/components/workspace/OutlineManager';
import AIAssistantPanel from '@/components/workspace/AIAssistantPanel';
import VersionHistoryModal from '@/components/workspace/VersionHistoryModal';
import CitationModal from '@/components/workspace/CitationModal';
import CitationAuditModal from '@/components/workspace/CitationAuditModal';
import LiteratureReviewPanel from '@/components/workspace/LiteratureReviewPanel';
import MethodologyWorkspace from '@/components/workspace/MethodologyWorkspace';
import InstrumentBuilder from '@/components/workspace/InstrumentBuilder';
import DatasetManager from '@/components/workspace/DatasetManager';
import AnalysisDashboard from '@/components/workspace/AnalysisDashboard';
import HypothesisPanel from '@/components/workspace/HypothesisPanel';
import QualitativeWorkspace from '@/components/workspace/QualitativeWorkspace';
import ChapterFourWorkspace from '@/components/workspace/ChapterFourWorkspace';
import ResearchWorkflowTimeline from '@/components/workflow/ResearchWorkflowTimeline';
import ResearchPlanningWorkspace from '@/components/workflow/ResearchPlanningWorkspace';
import ResearchAlignmentGrid from '@/components/workflow/ResearchAlignmentGrid';
import ManuscriptAssemblyViewer from '@/components/workflow/ManuscriptAssemblyViewer';
import QualityAssuranceDashboard from '@/components/workflow/QualityAssuranceDashboard';
import ReviewPreparationPanel from '@/components/workflow/ReviewPreparationPanel';
import CollaboratorsManager from '@/components/collaboration/CollaboratorsManager';
import InlineCommentsPanel from '@/components/collaboration/InlineCommentsPanel';
import SupervisorFeedbackWorkspace from '@/components/collaboration/SupervisorFeedbackWorkspace';
import CorrectionTracker from '@/components/collaboration/CorrectionTracker';
import VersionDiffViewer from '@/components/collaboration/VersionDiffViewer';
import JournalReviewMatrix from '@/components/collaboration/JournalReviewMatrix';
import { FormattingPreviewWorkspace } from '@/components/formatting/FormattingPreviewWorkspace';
import { PreliminaryPagesWorkspace } from '@/components/formatting/PreliminaryPagesWorkspace';
import { ComplianceAuditPanel } from '@/components/formatting/ComplianceAuditPanel';
import { JournalPublicationWorkspace } from '@/components/formatting/JournalPublicationWorkspace';
import { commentsApi } from '@/lib/api';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Tag,
  Globe,
  Archive,
  Trash2,
  History,
  AlertCircle,
  FileCheck,
  Bookmark,
  ChevronLeft,
  Loader2,
  PenTool,
  Quote,
  ShieldCheck,
  BookMarked,
  Layers,
  Sparkles,
  Compass,
  FileText,
  Database,
  BarChart3,
  MessageSquare,
  Users,
  CheckSquare,
  FileDiff,
  Award,
  MessageCircle,
} from 'lucide-react';

export default function ResearchWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const projectId = params?.id as string;

  // Project & Document State
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<DocumentSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Content & Autosave State
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Panels State
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [templates, setTemplates] = useState<StructureTemplate[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Consistency Report State
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);

  // Stage 3 Citations, Audit & Literature State
  const editorRef = useRef<AcademicEditorHandle | null>(null);
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'ai' | 'literature' | 'comments'>('ai');
  const [bibLoading, setBibLoading] = useState(false);
  const [commentsRefreshTrigger, setCommentsRefreshTrigger] = useState(0);

  // Stage 4, 5 & 6 Workspace Tabs State
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<
    | 'workflow'
    | 'planning'
    | 'alignment'
    | 'manuscript'
    | 'methodology'
    | 'instruments'
    | 'datasets'
    | 'statistics'
    | 'qualitative'
    | 'hypotheses'
    | 'results'
    | 'assembly'
    | 'quality'
    | 'review'
    | 'collaborators'
    | 'feedback'
    | 'corrections'
    | 'diff'
    | 'journal'
    | 'formatting'
    | 'prelims'
    | 'compliance'
    | 'journal-prep'
    | 'export'
  >('manuscript');

  const handleAddCommentSelection = async (selection: { text: string; start: number; end: number }) => {
    const mainDocId = project?.documents?.[0]?.id;
    if (!projectId || !mainDocId) return;
    const promptPreview = selection.text ? `on "${selection.text.slice(0, 30)}..."` : 'on current section';
    const textPrompt = window.prompt(`Add inline manuscript comment ${promptPreview}:`);
    if (!textPrompt || !textPrompt.trim()) return;

    try {
      await commentsApi.create(projectId, {
        document_id: mainDocId,
        section_id: selectedSection?.id,
        anchor_text: selection.text || 'Section Note',
        start_offset: selection.start || 0,
        end_offset: selection.end || 0,
        content: textPrompt.trim(),
      });
      setRightPanelTab('comments');
      setCommentsRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to create comment');
    }
  };

  // Insert Citation Handler
  const handleInsertCitation = useCallback(
    (citationText: string, source: ResearchSource, format: 'PARENTHETICAL' | 'NARRATIVE') => {
      const citationHtml = `<span class="csl-citation font-semibold text-navy-900" data-source-id="${source.id}">${citationText}</span>&nbsp;`;
      if (editorRef.current) {
        editorRef.current.insertContent(citationHtml);
      } else {
        setEditorContent((prev) => prev + ` ${citationText} `);
      }
    },
    []
  );

  // Generate Bibliography Handler
  const handleGenerateBibliography = useCallback(async () => {
    if (!projectId) return;
    setBibLoading(true);
    try {
      const resp = await citationsApi.getBibliography(
        projectId,
        project?.citation_style || 'APA_7TH'
      );
      if (resp.references && resp.references.length > 0) {
        const bibItems = resp.references
          .map((r) => `<p class="csl-entry mb-2 text-sm leading-relaxed">${r.full_reference}</p>`)
          .join('\n');
        const bibHtml = `
          <div class="csl-bibliography my-6 pt-4 border-t border-slate-300">
            <h2 class="font-serif text-lg font-bold text-slate-900 mb-3">References</h2>
            ${bibItems}
          </div>
        `;
        if (editorRef.current) {
          editorRef.current.insertContent(bibHtml);
        } else {
          setEditorContent((prev) => prev + bibHtml);
        }
      } else {
        alert('No citations or attached references found for this project.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to generate bibliography.');
    } finally {
      setBibLoading(false);
    }
  }, [projectId, project?.citation_style]);

  // Insert Literature Content Handler
  const handleInsertLiteratureContent = useCallback((html: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(html);
    } else {
      setEditorContent((prev) => prev + html);
    }
  }, []);

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load project details
  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.getById(projectId);
      setProject(data);

      const mainDoc = data.documents?.[0];
      if (mainDoc && mainDoc.sections) {
        setSections(mainDoc.sections);
        if (mainDoc.sections.length > 0) {
          const firstSec = mainDoc.sections[0];
          setSelectedSection(firstSec);
          setEditorContent(firstSec.content || '<p></p>');
        }
      }

      // Fetch templates catalog for outline switching
      try {
        const tpls = await documentsApi.getTemplates();
        setTemplates(tpls);
      } catch {
        // templates fallback
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

  // Handle Unsaved Changes browser navigation alert
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your manuscript. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Autosave execution
  const executeSave = useCallback(
    async (contentToSave: string, wordCount: number, sectionToSave: DocumentSection) => {
      setSaveStatus('saving');
      try {
        const updated = await documentsApi.updateSection(sectionToSave.id, {
          content: contentToSave,
        });
        setSaveStatus('saved');
        setLastSavedAt(new Date());

        // Update local sections list
        setSections((prev) =>
          prev.map((s) => (s.id === updated.id ? { ...s, content: updated.content, word_count: updated.word_count } : s))
        );
      } catch (err) {
        console.error('Autosave error:', err);
        setSaveStatus('error');
      }
    },
    []
  );

  // Editor content change with debounced autosave (1.5 seconds)
  const handleEditorChange = (html: string, wordCount: number) => {
    setEditorContent(html);
    setSaveStatus('unsaved');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    if (!selectedSection) return;

    autosaveTimerRef.current = setTimeout(() => {
      executeSave(html, wordCount, selectedSection);
    }, 1500);
  };

  // Manual save trigger
  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    if (selectedSection) {
      const words = editorContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
      executeSave(editorContent, words, selectedSection);
    }
  };

  // Section Navigation & Selection
  const handleSelectSection = (section: DocumentSection) => {
    // If pending unsaved changes on current section, save immediately
    if (saveStatus === 'unsaved' && selectedSection) {
      handleManualSave();
    }
    setSelectedSection(section);
    setEditorContent(section.content || '<p></p>');
    setSaveStatus('saved');
  };

  const currentSectionIndex = sections.findIndex((s) => s.id === selectedSection?.id);
  const hasPrevSection = currentSectionIndex > 0;
  const hasNextSection = currentSectionIndex >= 0 && currentSectionIndex < sections.length - 1;

  const handleNextSection = () => {
    if (hasNextSection) {
      handleSelectSection(sections[currentSectionIndex + 1]);
    }
  };

  const handlePrevSection = () => {
    if (hasPrevSection) {
      handleSelectSection(sections[currentSectionIndex - 1]);
    }
  };

  // Outline Operations
  const handleAddSection = async (title: string, sectionType: string, parentId?: string | null) => {
    if (!project?.documents?.[0]) return;
    const docId = project.documents[0].id;

    const newSec = await documentsApi.createSection(docId, {
      title,
      section_type: sectionType,
      parent_section: parentId,
      content: '',
    });

    setSections((prev) => [...prev, newSec]);
    handleSelectSection(newSec);
  };

  const handleRenameSection = async (sectionId: string, newTitle: string) => {
    const updated = await documentsApi.updateSection(sectionId, { title: newTitle });
    setSections((prev) => prev.map((s) => (s.id === updated.id ? { ...s, title: updated.title } : s)));
    if (selectedSection?.id === sectionId) {
      setSelectedSection((prev) => (prev ? { ...prev, title: newTitle } : null));
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    await documentsApi.deleteSection(sectionId);
    const remaining = sections.filter((s) => s.id !== sectionId);
    setSections(remaining);
    if (selectedSection?.id === sectionId) {
      if (remaining.length > 0) {
        handleSelectSection(remaining[0]);
      } else {
        setSelectedSection(null);
        setEditorContent('<p></p>');
      }
    }
  };

  const handleReorder = async (reordered: DocumentSection[]) => {
    if (!project?.documents?.[0]) return;
    setSections(reordered);
    const payload = reordered.map((s, idx) => ({
      id: s.id,
      order_index: idx,
      parent_section_id: s.parent_section || null,
    }));
    await documentsApi.reorderSections(project.documents[0].id, payload);
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!project?.documents?.[0]) return;
    const docId = project.documents[0].id;
    const res = await documentsApi.applyTemplate(docId, {
      discipline_name: project.discipline_details?.name || project.discipline_name,
      document_category: project.document_category,
      document_subtype: project.document_subtype,
      preserve_content: true,
    });
    if (res.document?.sections) {
      setSections(res.document.sections);
      if (res.document.sections.length > 0) {
        handleSelectSection(res.document.sections[0]);
      }
    }
  };

  // AI Assistant Integration
  const handleRequestAI = async (
    action: AIAction,
    instructions?: string,
    rewriteStyle?: 'formal' | 'concise' | 'detailed' | 'clearer' | 'flow'
  ): Promise<AIGenerateResponse | null> => {
    if (!project) return null;
    try {
      const res = await researchApi.generateAi({
        project_id: project.id,
        action,
        section_id: selectedSection?.id,
        instructions,
        rewrite_style: rewriteStyle,
        selected_text: editorContent.replace(/<[^>]*>/g, '').slice(0, 1000),
      });
      return res;
    } catch (err: unknown) {
      if (err instanceof Error) {
        return {
          job_id: '',
          status: 'FAILED',
          action,
          error: err.message,
        };
      }
      return null;
    }
  };

  const handleFeedbackAI = async (jobId: string, action: 'ACCEPT' | 'REJECT' | 'EDIT', finalText?: string) => {
    if (!jobId) return;
    try {
      await researchApi.feedbackAiJob(jobId, action, finalText);
    } catch (err) {
      console.error('Failed to submit AI feedback:', err);
    }
  };

  const handleApplySuggestion = (textToInsert: string) => {
    // Append or insert suggested content into Tiptap editor
    const formatted = `<div class="ai-generated-block my-4 p-4 rounded-lg bg-slate-50 border-l-4 border-gold-500 font-serif leading-relaxed"><p>${textToInsert.replace(
      /\n\n/g,
      '</p><p>'
    )}</p></div>`;
    const updatedHtml = editorContent ? `${editorContent}${formatted}` : formatted;
    setEditorContent(updatedHtml);
    if (selectedSection) {
      const words = updatedHtml.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
      executeSave(updatedHtml, words, selectedSection);
    }
  };

  // Version History Operations
  const openVersionModal = async () => {
    if (!project?.documents?.[0]) return;
    setVersionModalOpen(true);
    setVersionsLoading(true);
    try {
      const vList = await documentsApi.getVersions(project.documents[0].id);
      setVersions(vList);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleCreateSnapshot = async (summary: string) => {
    if (!project?.documents?.[0]) return;
    const newVer = await documentsApi.createVersion(project.documents[0].id, summary);
    setVersions((prev) => [newVer, ...prev]);
    if (project.documents[0]) {
      project.documents[0].current_version_number = newVer.version_number;
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!project?.documents?.[0]) return;
    const docId = project.documents[0].id;
    const res = await documentsApi.restoreVersion(docId, versionId);
    if (res.document?.sections) {
      setSections(res.document.sections);
      if (res.document.sections.length > 0) {
        handleSelectSection(res.document.sections[0]);
      }
    }
    await loadProject();
  };

  // Consistency Check
  const handleRunConsistencyCheck = async () => {
    if (!project) return;
    setConsistencyLoading(true);
    try {
      const report = await researchApi.getConsistencyReport(project.id);
      setConsistencyReport(report);
    } catch (err) {
      console.error('Failed to run consistency scan:', err);
    } finally {
      setConsistencyLoading(false);
    }
  };

  // Project Actions (Archive / Delete)
  const handleArchive = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await projectsApi.archive(project.id);
      setArchiveModalOpen(false);
      await loadProject();
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
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-navy-900 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Academic Workspace & Manuscript...
          </p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-screen">
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

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <div className="flex-1 flex">
        <Sidebar className="hidden xl:flex" />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Sub-Header & Metadata Bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shadow-sm">
            <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Title & Status */}
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Link href="/dashboard" className="hover:text-navy-900 transition flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                  <span>/</span>
                  <Link href="/research" className="hover:text-navy-900 transition">
                    Research
                  </Link>
                  <span>/</span>
                  <span className="text-gold-600 truncate max-w-sm">{project.title}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-navy-950 text-gold-400">
                    {project.document_category.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gold-50 text-gold-700 border border-gold-200">
                    {project.document_subtype}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {project.discipline_details?.name || 'Academic'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-navy-50 text-navy-800 font-bold">
                    {project.citation_style}
                  </span>
                </div>
              </div>

              {/* Right Workspace Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCitationModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-navy-900 text-white hover:bg-navy-800 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="Insert In-Text Citation"
                >
                  <Quote className="w-3.5 h-3.5 text-gold-400" />
                  <span>Cite</span>
                </button>

                <button
                  onClick={() => setAuditModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
                  title="Run Citation Integrity Audit"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Audit Citations</span>
                </button>

                <button
                  onClick={openVersionModal}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition flex items-center gap-1.5 shadow-sm"
                >
                  <History className="w-3.5 h-3.5 text-navy-800" />
                  <span>Versions (v{project.documents?.[0]?.current_version_number || 1})</span>
                </button>

                <button
                  onClick={() => setArchiveModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
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
          </div>

          {/* RESEARCH WORKSPACE NAVIGATION BAR */}
          <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2 shadow-inner">
            <div className="max-w-[1700px] mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('workflow')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'workflow'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Layers className="w-3.5 h-3.5 text-gold-400" />
                <span>Workflow Lifecycle</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('planning')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'planning'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-gold-400" />
                <span>Research Planning</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('alignment')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'alignment'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                <span>13-Node Alignment</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('manuscript')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'manuscript'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <PenTool className="w-3.5 h-3.5 text-gold-400" />
                <span>Manuscript & Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('methodology')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'methodology'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Compass className="w-3.5 h-3.5 text-gold-400" />
                <span>Methodology & Sampling</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('instruments')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'instruments'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <FileText className="w-3.5 h-3.5 text-gold-400" />
                <span>Research Instruments</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('datasets')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'datasets'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Database className="w-3.5 h-3.5 text-gold-400" />
                <span>Datasets & Cleaning</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('statistics')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'statistics'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-gold-400" />
                <span>Statistical Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('qualitative')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'qualitative'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
                <span>Qualitative Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('hypotheses')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'hypotheses'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                <span>Hypotheses & Decisions</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('results')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'results'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Results & Chapter 4</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('assembly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'assembly'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-gold-400" />
                <span>Manuscript Assembly</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('quality')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'quality'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-gold-400" />
                <span>Quality QA (6-Cat)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('review')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'review'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                <span>Defense & Review</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('collaborators')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'collaborators'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Users className="w-3.5 h-3.5 text-gold-400" />
                <span>Collaborators & Roles</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('feedback')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'feedback'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-gold-400" />
                <span>Supervisor Feedback</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('corrections')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'corrections'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-gold-400" />
                <span>Revisions & Tasks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('diff')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'diff'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <FileDiff className="w-3.5 h-3.5 text-gold-400" />
                <span>Version Diff</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('journal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'journal'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <Award className="w-3.5 h-3.5 text-gold-400" />
                <span>Reviewer Matrix</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('formatting')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'formatting'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <span>📐</span>
                <span>Formatting & Templates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('prelims')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'prelims'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <span>📜</span>
                <span>Front Matter / Prelims</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('compliance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'compliance'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <span>🛡️</span>
                <span>Compliance Audit</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('export')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'export'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <span>📥</span>
                <span>Word & PDF Export</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('journal-prep')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeWorkspaceTab === 'journal-prep'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy-950 hover:bg-slate-200/60'
                  }`}
              >
                <span>📰</span>
                <span>Journal Publication Prep</span>
              </button>
            </div>
          </div>

          {/* WORKSPACE CONTENT AREA */}
          <div className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6">
            {activeWorkspaceTab === 'workflow' && (
              <ResearchWorkflowTimeline
                projectId={projectId}
                onNavigateToTab={(t) => setActiveWorkspaceTab(t as any)}
              />
            )}

            {activeWorkspaceTab === 'planning' && (
              <ResearchPlanningWorkspace projectId={projectId} />
            )}

            {activeWorkspaceTab === 'alignment' && (
              <ResearchAlignmentGrid projectId={projectId} />
            )}

            {activeWorkspaceTab === 'manuscript' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* PANEL 1: Left Manuscript Outline & Chapter Tree (3 Cols) */}
                <div className="lg:col-span-3 h-full">
                  <OutlineManager
                    sections={sections}
                    selectedSectionId={selectedSection?.id}
                    onSelectSection={handleSelectSection}
                    onAddSection={handleAddSection}
                    onRenameSection={handleRenameSection}
                    onDeleteSection={handleDeleteSection}
                    onReorder={handleReorder}
                    onApplyTemplate={handleApplyTemplate}
                    templates={templates}
                  />
                </div>

                {/* PANEL 2: Center Tiptap Rich Text Writing Editor (6 Cols) */}
                <div className="lg:col-span-6 h-full">
                  {selectedSection ? (
                    <AcademicEditor
                      content={editorContent}
                      sectionTitle={selectedSection.title}
                      sectionType={selectedSection.section_type}
                      isSaving={saveStatus === 'saving'}
                      saveStatus={saveStatus}
                      lastSavedAt={lastSavedAt}
                      onSaveManual={handleManualSave}
                      onChangeContent={handleEditorChange}
                      onNextSection={handleNextSection}
                      onPrevSection={handlePrevSection}
                      hasNextSection={hasNextSection}
                      hasPrevSection={hasPrevSection}
                      onOpenCitationModal={() => setCitationModalOpen(true)}
                      onGenerateBibliography={handleGenerateBibliography}
                      onAddComment={handleAddCommentSelection}
                      editorRef={editorRef}
                    />
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                      <PenTool className="w-8 h-8 text-gold-500 mx-auto mb-2" />
                      <h3 className="font-serif text-base font-bold text-slate-900">No Section Selected</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Select a chapter or section from the outline to begin writing.
                      </p>
                    </div>
                  )}
                </div>

                {/* PANEL 3: Right AI Assistant, Consistency & Literature Review (3 Cols) */}
                <div className="lg:col-span-3 h-full space-y-3">
                  {/* Tab Selector */}
                  <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('ai')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${rightPanelTab === 'ai'
                          ? 'bg-white text-navy-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                      <span>AI Assistant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('literature')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${rightPanelTab === 'literature'
                          ? 'bg-white text-navy-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-gold-500" />
                      <span>Literature</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPanelTab('comments')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${rightPanelTab === 'comments'
                          ? 'bg-white text-navy-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Comments</span>
                    </button>
                  </div>

                  {rightPanelTab === 'ai' ? (
                    <AIAssistantPanel
                      project={project}
                      activeSectionTitle={selectedSection?.title}
                      selectedText={editorContent.replace(/<[^>]*>/g, '').slice(0, 300)}
                      onApplySuggestion={handleApplySuggestion}
                      onRequestAI={handleRequestAI}
                      onFeedbackAI={handleFeedbackAI}
                      consistencyReport={consistencyReport}
                      onRunConsistencyCheck={handleRunConsistencyCheck}
                      consistencyLoading={consistencyLoading}
                    />
                  ) : rightPanelTab === 'literature' ? (
                    <LiteratureReviewPanel
                      project={project}
                      onInsertContent={handleInsertLiteratureContent}
                    />
                  ) : (
                    <InlineCommentsPanel
                      key={commentsRefreshTrigger}
                      projectId={projectId}
                      documentId={project.documents?.[0]?.id}
                      activeSectionId={selectedSection?.id}
                      onRefreshComments={() => setCommentsRefreshTrigger((p) => p + 1)}
                    />
                  )}
                </div>
              </div>
            )}

            {activeWorkspaceTab === 'methodology' && (
              <MethodologyWorkspace
                project={project}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'instruments' && (
              <InstrumentBuilder
                project={project}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'datasets' && (
              <DatasetManager
                project={project}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'statistics' && (
              <AnalysisDashboard
                project={project}
                onInsertContent={handleInsertLiteratureContent}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'qualitative' && (
              <QualitativeWorkspace
                project={project}
                onInsertContent={handleInsertLiteratureContent}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'hypotheses' && (
              <HypothesisPanel
                project={project}
                onInsertContent={handleInsertLiteratureContent}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'results' && (
              <ChapterFourWorkspace
                project={project}
                onInsertContent={handleInsertLiteratureContent}
                onRefreshConsistency={handleRunConsistencyCheck}
              />
            )}

            {activeWorkspaceTab === 'assembly' && (
              <ManuscriptAssemblyViewer projectId={projectId} />
            )}

            {activeWorkspaceTab === 'quality' && (
              <QualityAssuranceDashboard projectId={projectId} />
            )}

            {activeWorkspaceTab === 'review' && (
              <ReviewPreparationPanel projectId={projectId} />
            )}

            {activeWorkspaceTab === 'collaborators' && (
              <CollaboratorsManager
                projectId={projectId}
                currentUserRole={(project as any)?.role || 'PROJECT_OWNER'}
              />
            )}

            {activeWorkspaceTab === 'feedback' && (
              <SupervisorFeedbackWorkspace
                projectId={projectId}
                documentId={project.documents?.[0]?.id}
              />
            )}

            {activeWorkspaceTab === 'corrections' && (
              <CorrectionTracker
                projectId={projectId}
                documentId={project.documents?.[0]?.id}
                currentUserRole={(project as any)?.role || 'PROJECT_OWNER'}
                onSelectTaskSection={(secId) => {
                  if (secId) {
                    const sec = sections.find((s) => s.id === secId);
                    if (sec) {
                      setSelectedSection(sec);
                      setActiveWorkspaceTab('manuscript');
                    }
                  }
                }}
              />
            )}

            {activeWorkspaceTab === 'diff' && project.documents?.[0] && (
              <VersionDiffViewer
                documentId={project.documents[0].id}
                currentVersionNumber={project.documents[0].current_version_number || 1}
                onVersionRestored={loadProject}
              />
            )}

            {activeWorkspaceTab === 'journal' && (
              <JournalReviewMatrix
                projectId={projectId}
              />
            )}

            {activeWorkspaceTab === 'formatting' && (
              <FormattingPreviewWorkspace projectId={projectId} />
            )}

            {activeWorkspaceTab === 'prelims' && (
              <PreliminaryPagesWorkspace projectId={projectId} />
            )}

            {activeWorkspaceTab === 'compliance' && (
              <ComplianceAuditPanel projectId={projectId} />
            )}

            {activeWorkspaceTab === 'journal-prep' && (
              <JournalPublicationWorkspace projectId={projectId} />
            )}

            {activeWorkspaceTab === 'export' && (
              <DocumentExportWorkspace projectId={projectId} />
            )}
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        versions={versions}
        currentVersionNumber={project.documents?.[0]?.current_version_number || 1}
        onCreateSnapshot={handleCreateSnapshot}
        onRestoreVersion={handleRestoreVersion}
        loading={versionsLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Research Project"
        message={`Are you sure you want to delete "${project.title}"? This will permanently delete the manuscript, dynamic outlines, version snapshots, and requirements.`}
        confirmText="Delete Permanently"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={archiveModalOpen}
        title={project.status === 'ARCHIVED' ? 'Unarchive Project' : 'Archive Project'}
        message={
          project.status === 'ARCHIVED'
            ? 'Restore this project to active workspace status?'
            : 'Archive this project? It will be moved to your archived research repository.'
        }
        confirmText={project.status === 'ARCHIVED' ? 'Restore Active' : 'Archive'}
        confirmVariant="warning"
        isLoading={actionLoading}
        onConfirm={handleArchive}
        onCancel={() => setArchiveModalOpen(false)}
      />

      {/* Citation Insertion Modal */}
      <CitationModal
        isOpen={citationModalOpen}
        onClose={() => setCitationModalOpen(false)}
        projectId={projectId}
        onInsertCitation={handleInsertCitation}
      />

      {/* Citation Integrity Audit Modal */}
      <CitationAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        projectId={projectId}
        onSyncBibliography={handleGenerateBibliography}
      />
    </div>
  );
}
