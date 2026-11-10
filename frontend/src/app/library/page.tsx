'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import {
  discoveryApi,
  sourcesApi,
  collectionsApi,
  projectsApi,
  projectSourcesApi,
  documentsUploadApi,
} from '@/lib/api';
import {
  ResearchSource,
  ResearchCollection,
  ResearchProject,
  DiscoveryResult,
  VerificationStatus,
  SourceType,
} from '@/types/project';
import {
  BookOpen,
  Bookmark,
  Search,
  Sparkles,
  Upload,
  FileText,
  FolderPlus,
  Plus,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Filter,
  Star,
  Tag,
  Trash2,
  Folder,
  FileCode,
  FileUp,
  RefreshCw,
  Loader2,
  Paperclip,
  Check,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Active Tab: 'discovery' | 'sources' | 'collections' | 'import'
  const [activeTab, setActiveTab] = useState<'discovery' | 'sources' | 'collections' | 'import'>('discovery');

  // Discovery State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDiscipline, setSearchDiscipline] = useState('');
  const [searchPubType, setSearchPubType] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [isOpenAccessOnly, setIsOpenAccessOnly] = useState(false);
  const [provider, setProvider] = useState<'all' | 'openalex' | 'crossref' | 'semantic_scholar'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'citations'>('relevance');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DiscoveryResult[]>([]);
  const [searchTotal, setSearchTotal] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingSourceId, setSavingSourceId] = useState<string | null>(null);
  const [savedSuccessIds, setSavedSuccessIds] = useState<Set<string>>(new Set());

  // Personal Library State
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('');
  const [readStatusFilter, setReadStatusFilter] = useState('');

  // Collections State
  const [collections, setCollections] = useState<ResearchCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<ResearchCollection | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#1e3a8a');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  // Projects (for "Attach to Project")
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [attachModalSource, setAttachModalSource] = useState<ResearchSource | DiscoveryResult | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [attachStatus, setAttachStatus] = useState<string | null>(null);

  // Import State
  const [importMode, setImportMode] = useState<'doi' | 'bibtex' | 'ris' | 'file'>('doi');
  const [importDoi, setImportDoi] = useState('');
  const [importBibtex, setImportBibtex] = useState('');
  const [importRis, setImportRis] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<{
    id: string;
    filename: string;
    wordCount: number;
    status: string;
    preview: string;
  } | null>(null);

  // Expanded abstracts tracker
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());

  // Check auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load Initial Data
  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const data = await sourcesApi.list();
      setSources(data);
    } catch {
      // ignore
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      const data = await collectionsApi.list();
      setCollections(data);
    } catch {
      // ignore
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await projectsApi.list();
      const results = Array.isArray(data) ? data : data.results || [];
      setProjects(results);
      if (results.length > 0) setSelectedProjectId(results[0].id);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSources();
      loadCollections();
      loadProjects();
    }
  }, [user, loadSources, loadCollections, loadProjects]);

  // Discovery Search Execution
  const handleDiscoverySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const resp = await discoveryApi.search({
        query: searchQuery.trim(),
        discipline: searchDiscipline || undefined,
        publication_type: searchPubType || undefined,
        year_from: yearFrom ? parseInt(yearFrom, 10) : undefined,
        year_to: yearTo ? parseInt(yearTo, 10) : undefined,
        is_open_access: isOpenAccessOnly ? true : undefined,
        provider: provider !== 'all' ? provider : undefined,
        sort_by: sortBy,
      });
      setSearchResults(resp.results || []);
      setSearchTotal(resp.total_count);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSearchError(err.message);
      } else {
        setSearchError('Scholarly search encountered an issue.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle Abstract Expansion
  const toggleAbstract = (id: string) => {
    setExpandedAbstracts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Save Discovery Result to My Library
  const handleSaveToLibrary = async (item: DiscoveryResult) => {
    const itemId = item.id || item.doi || item.title;
    setSavingSourceId(itemId);
    try {
      const created = await sourcesApi.create({
        title: item.title,
        authors: item.authors,
        publication_year: item.publication_year,
        source_type: (item.publication_type?.toUpperCase() as SourceType) || 'JOURNAL_ARTICLE',
        journal_name: item.journal_or_venue,
        publisher: item.publisher,
        doi: item.doi || undefined,
        url: item.doi ? `https://doi.org/${item.doi}` : item.landing_page_url || undefined,
        abstract: item.abstract || undefined,
        is_open_access: item.is_open_access,
        citation_count: item.citation_count,
        openalex_id: item.openalex_id || undefined,
        crossref_doi: item.doi || undefined,
        semantic_scholar_id: item.semantic_scholar_id || undefined,
      });
      setSavedSuccessIds((prev) => new Set(prev).add(itemId));
      setSources((prev) => [created, ...prev]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save source');
    } finally {
      setSavingSourceId(null);
    }
  };

  // Attach Source to Project
  const handleAttachSource = async () => {
    if (!attachModalSource || !selectedProjectId) return;
    setAttachStatus('Attaching...');
    try {
      let sourceId = '';
      if ('verification_status' in attachModalSource && 'created_at' in attachModalSource) {
        sourceId = (attachModalSource as ResearchSource).id;
      } else {
        // Need to save first
        const item = attachModalSource as DiscoveryResult;
        const created = await sourcesApi.create({
          title: item.title,
          authors: item.authors,
          publication_year: item.publication_year,
          source_type: (item.publication_type?.toUpperCase() as SourceType) || 'JOURNAL_ARTICLE',
          journal_name: item.journal_or_venue,
          doi: item.doi || undefined,
          abstract: item.abstract || undefined,
          is_open_access: item.is_open_access,
        });
        sourceId = created.id;
        setSources((prev) => [created, ...prev]);
      }

      await projectSourcesApi.attach(selectedProjectId, { source_id: sourceId });
      setAttachStatus('Attached successfully!');
      setTimeout(() => {
        setAttachModalSource(null);
        setAttachStatus(null);
      }, 1200);
    } catch (err: unknown) {
      setAttachStatus(err instanceof Error ? err.message : 'Attachment failed');
    }
  };

  // Create Collection
  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    setIsCreatingCollection(true);
    try {
      const created = await collectionsApi.create({
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || undefined,
        color: newCollectionColor,
      });
      setCollections((prev) => [...prev, created]);
      setNewCollectionName('');
      setNewCollectionDesc('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setIsCreatingCollection(false);
    }
  };

  // Import Submissions
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setImportResult(null);
    try {
      if (importMode === 'doi') {
        if (!importDoi.trim()) return;
        const res = await sourcesApi.importDoi(importDoi.trim());
        setImportResult({ success: true, message: `Successfully verified and imported: "${res.title}"` });
        setImportDoi('');
        loadSources();
      } else if (importMode === 'bibtex') {
        if (!importBibtex.trim()) return;
        const res = await sourcesApi.importBibtex(importBibtex.trim());
        setImportResult({ success: true, message: `Imported ${res.length} references from BibTeX.` });
        setImportBibtex('');
        loadSources();
      } else if (importMode === 'ris') {
        if (!importRis.trim()) return;
        const res = await sourcesApi.importRis(importRis.trim());
        setImportResult({ success: true, message: `Imported ${res.length} references from RIS.` });
        setImportRis('');
        loadSources();
      }
    } catch (err: unknown) {
      setImportResult({
        success: false,
        message: err instanceof Error ? err.message : 'Import failed.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Document Upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    if (uploadFile.size > 20 * 1024 * 1024) {
      setUploadError('Document file size exceeds 20MB limit.');
      return;
    }

    setUploadProgress(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const resp = await documentsUploadApi.upload(uploadFile);
      setUploadSuccess({
        id: resp.id,
        filename: resp.original_filename || resp.file_name,
        wordCount: resp.word_count || 0,
        status: resp.extraction_status,
        preview: resp.extracted_text_preview || resp.extracted_text || '',
      });
      setUploadFile(null);
      loadSources();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload and text extraction failed.');
    } finally {
      setUploadProgress(false);
    }
  };

  // Helper: Verification Badge
  const renderVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'METADATA_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>Verified</span>
          </span>
        );
      case 'PARTIALLY_VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Partially Verified</span>
          </span>
        );
      case 'WITHDRAWN_OR_RETRACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>RETRACTED</span>
          </span>
        );
      case 'METADATA_CONFLICT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            <span>Metadata Conflict</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            <span>Unverified</span>
          </span>
        );
    }
  };

  // Filter personal sources
  const filteredSources = sources.filter((s) => {
    const matchesSearch =
      !sourceSearchQuery ||
      s.title.toLowerCase().includes(sourceSearchQuery.toLowerCase()) ||
      s.authors.some((a) => a.toLowerCase().includes(sourceSearchQuery.toLowerCase()));
    const matchesType = !sourceTypeFilter || s.source_type === sourceTypeFilter;
    const matchesRead = !readStatusFilter || s.reading_status === readStatusFilter;
    return matchesSearch && matchesType && matchesRead;
  });

  return (
    <div className="flex-1 flex min-h-screen bg-slate-50">
      <Sidebar className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Link href="/dashboard" className="hover:text-navy-900 transition">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-gold-600">Research Library</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Academic Research Library & Discovery
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Discover authentic scholarly publications across OpenAlex, Crossref & Semantic Scholar with zero hallucination.
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('import')}
                className="px-3.5 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
              >
                <Upload className="w-3.5 h-3.5 text-gold-400" />
                <span>Import / Upload</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-6">
              <button
                onClick={() => setActiveTab('discovery')}
                className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'discovery'
                    ? 'border-gold-500 text-navy-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Search className="w-4 h-4 text-gold-600" />
                <span>Scholarly Discovery Engine</span>
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'sources'
                    ? 'border-gold-500 text-navy-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Bookmark className="w-4 h-4 text-gold-600" />
                <span>My Library ({sources.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'collections'
                    ? 'border-gold-500 text-navy-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Folder className="w-4 h-4 text-gold-600" />
                <span>Collections ({collections.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 ${
                  activeTab === 'import'
                    ? 'border-gold-500 text-navy-950'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileUp className="w-4 h-4 text-gold-600" />
                <span>Import & Document Upload</span>
              </button>
            </nav>
          </div>

          {/* TAB 1: SCHOLARLY DISCOVERY ENGINE */}
          {activeTab === 'discovery' && (
            <div className="space-y-6">
              {/* Search Form Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <form onSubmit={handleDiscoverySearch} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by keywords, title, research objectives, or DOI..."
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-900 bg-slate-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-6 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span>Search Publications</span>
                    </button>
                  </div>

                  {/* Filters Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Discipline</label>
                      <select
                        value={searchDiscipline}
                        onChange={(e) => setSearchDiscipline(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">All Disciplines</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Medicine">Medicine & Health</option>
                        <option value="Business">Management & Business</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Social Sciences">Social Sciences</option>
                        <option value="Humanities">Humanities & Law</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Type</label>
                      <select
                        value={searchPubType}
                        onChange={(e) => setSearchPubType(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">All Types</option>
                        <option value="journal-article">Journal Article</option>
                        <option value="proceedings-article">Conference Paper</option>
                        <option value="book">Book</option>
                        <option value="dissertation">Dissertation / Thesis</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Year Range</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="From"
                          value={yearFrom}
                          onChange={(e) => setYearFrom(e.target.value)}
                          className="w-1/2 p-2 text-xs rounded-lg border border-slate-200"
                        />
                        <input
                          type="number"
                          placeholder="To"
                          value={yearTo}
                          onChange={(e) => setYearTo(e.target.value)}
                          className="w-1/2 p-2 text-xs rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as any)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="all">Federated (All)</option>
                        <option value="openalex">OpenAlex</option>
                        <option value="crossref">Crossref REST</option>
                        <option value="semantic_scholar">Semantic Scholar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="newest">Newest First</option>
                        <option value="citations">Citation Count</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isOpenAccessOnly}
                          onChange={(e) => setIsOpenAccessOnly(e.target.checked)}
                          className="rounded text-navy-900 focus:ring-navy-900"
                        />
                        <span>Open Access Only</span>
                      </label>
                    </div>
                  </div>
                </form>

                {searchError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {searchError}
                  </div>
                )}
              </div>

              {/* Search Results */}
              <div className="space-y-4">
                {searchTotal !== null && (
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>
                      Found {searchResults.length} {searchResults.length === 1 ? 'publication' : 'publications'}
                    </span>
                    <span className="text-emerald-700 font-mono">Authoritative Deduplication Active</span>
                  </div>
                )}

                {searchResults.length === 0 && !isSearching && searchTotal !== null && (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="font-serif text-sm font-bold text-slate-800">No Publications Found</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Try broadening your search keywords or removing filters.
                    </p>
                  </div>
                )}

                {searchResults.map((item, idx) => {
                  const itemId = item.id || item.doi || `search-res-${idx}`;
                  const isSaved = savedSuccessIds.has(itemId);
                  const isAbstractExpanded = expandedAbstracts.has(itemId);

                  return (
                    <div
                      key={itemId}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {renderVerificationBadge(item.verification_status || 'UNVERIFIED')}
                            {item.is_open_access && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Open Access
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {item.publication_type || item.source_type}
                            </span>
                            {item.metadata_provenance && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                via {item.metadata_provenance}
                              </span>
                            )}
                          </div>

                          <h3 className="font-serif text-base font-bold text-slate-900 leading-snug">
                            {item.title}
                          </h3>

                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">
                              {item.authors && item.authors.length > 0 ? item.authors.join(', ') : 'Unknown Authors'}
                            </span>
                            {item.publication_year ? ` (${item.publication_year})` : ''}
                            {item.journal_or_venue ? ` • ${item.journal_or_venue}` : ''}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex sm:flex-col items-end gap-2 shrink-0">
                          {isSaved ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSaveToLibrary(item)}
                              disabled={savingSourceId === itemId}
                              className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
                            >
                              {savingSourceId === itemId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5 text-gold-400" />
                              )}
                              <span>Save to Library</span>
                            </button>
                          )}

                          <button
                            onClick={() => setAttachModalSource(item)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                            <span>Attach to Project</span>
                          </button>
                        </div>
                      </div>

                      {/* Abstract snippet */}
                      {item.abstract && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className={isAbstractExpanded ? '' : 'line-clamp-2'}>
                            <span className="font-semibold text-slate-700">Abstract: </span>
                            {item.abstract}
                          </p>
                          <button
                            onClick={() => toggleAbstract(itemId)}
                            className="text-[11px] font-bold text-navy-800 hover:text-gold-600 mt-1 flex items-center gap-1"
                          >
                            {isAbstractExpanded ? (
                              <>
                                <span>Show less</span>
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>Show full abstract</span>
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Metadata Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-3">
                          {item.doi && (
                            <a
                              href={`https://doi.org/${item.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-navy-700 hover:underline flex items-center gap-1"
                            >
                              <span>DOI: {item.doi}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {item.citation_count !== undefined && item.citation_count > 0 && (
                            <span>Citations: {item.citation_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MY SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={sourceSearchQuery}
                    onChange={(e) => setSourceSearchQuery(e.target.value)}
                    placeholder="Search personal library by title or author..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-900"
                  />
                </div>

                <select
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value)}
                  className="p-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">All Document Types</option>
                  <option value="JOURNAL_ARTICLE">Journal Article</option>
                  <option value="BOOK">Book</option>
                  <option value="CONFERENCE_PAPER">Conference Paper</option>
                  <option value="DISSERTATION">Dissertation</option>
                </select>

                <select
                  value={readStatusFilter}
                  onChange={(e) => setReadStatusFilter(e.target.value)}
                  className="p-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">All Reading Statuses</option>
                  <option value="UNREAD">Unread</option>
                  <option value="READING">Reading</option>
                  <option value="READ">Read</option>
                </select>
              </div>

              {/* Source List */}
              {sourcesLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gold-500" />
                  <p className="text-xs">Loading personal library...</p>
                </div>
              ) : filteredSources.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                  <Bookmark className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h3 className="font-serif text-sm font-bold text-slate-800">Your Library is Empty</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Discover scholarly publications or import BibTeX, RIS, or DOI records to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSources.map((source) => (
                    <div
                      key={source.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {renderVerificationBadge(source.verification_status)}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {source.source_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                source.reading_status === 'READ'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : source.reading_status === 'READING'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {source.reading_status}
                            </span>
                          </div>

                          <h3 className="font-serif text-base font-bold text-slate-900 leading-snug">
                            {source.title}
                          </h3>

                          <p className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-800">
                              {source.authors.join(', ')}
                            </span>
                            {source.publication_year ? ` (${source.publication_year})` : ''}
                            {source.journal_name ? ` • ${source.journal_name}` : ''}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-end gap-2 shrink-0">
                          <button
                            onClick={() => setAttachModalSource(source)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                            <span>Attach to Project</span>
                          </button>
                        </div>
                      </div>

                      {source.abstract && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 line-clamp-2">
                          {source.abstract}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-3">
                          {source.doi && (
                            <a
                              href={`https://doi.org/${source.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-navy-700 hover:underline flex items-center gap-1"
                            >
                              <span>DOI: {source.doi}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {source.citation_count !== undefined && (
                            <span>Citations: {source.citation_count}</span>
                          )}
                        </div>

                        {source.tags && source.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {source.tags.map((tag: string, idx: number) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COLLECTIONS */}
          {activeTab === 'collections' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Create Collection Card */}
              <div className="md:col-span-1 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-gold-600" />
                  <span>Create Collection</span>
                </h3>

                <form onSubmit={handleCreateCollection} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Collection Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Machine Learning Ethics 2026"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes or context..."
                      value={newCollectionDesc}
                      onChange={(e) => setNewCollectionDesc(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-navy-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Color Tag</label>
                    <div className="flex items-center gap-2">
                      {['#1e3a8a', '#065f46', '#991b1b', '#854d0e', '#581c87'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewCollectionColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            newCollectionColor === c ? 'border-slate-900 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingCollection || !newCollectionName.trim()}
                    className="w-full py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isCreatingCollection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Create Collection</span>
                  </button>
                </form>
              </div>

              {/* Collections Grid */}
              <div className="md:col-span-2 space-y-4">
                {collections.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                    <Folder className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h3 className="font-serif text-sm font-bold text-slate-800">No Collections Created</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Group literature sources into custom folders or thematic reviews.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {collections.map((col) => (
                      <div
                        key={col.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: col.color_tag || '#1e3a8a' }}
                            />
                            <h4 className="font-serif text-sm font-bold text-slate-900">{col.name}</h4>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {col.item_count || 0} items
                          </span>
                        </div>
                        {col.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{col.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: IMPORT & DOCUMENT UPLOAD */}
          {activeTab === 'import' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form 1: Bibliographic Import */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-gold-600" />
                    <span>Bibliographic Import</span>
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setImportMode('doi')}
                      className={`px-2.5 py-1 rounded transition ${
                        importMode === 'doi' ? 'bg-navy-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      DOI
                    </button>
                    <button
                      onClick={() => setImportMode('bibtex')}
                      className={`px-2.5 py-1 rounded transition ${
                        importMode === 'bibtex' ? 'bg-navy-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      BibTeX
                    </button>
                    <button
                      onClick={() => setImportMode('ris')}
                      className={`px-2.5 py-1 rounded transition ${
                        importMode === 'ris' ? 'bg-navy-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      RIS
                    </button>
                  </div>
                </div>

                <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
                  {importMode === 'doi' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Authoritative Digital Object Identifier (DOI) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10.1145/1327452.1327492 or https://doi.org/..."
                        value={importDoi}
                        onChange={(e) => setImportDoi(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Resolves Crossref metadata and validates registration status without hallucination.
                      </p>
                    </div>
                  )}

                  {importMode === 'bibtex' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        BibTeX Source String *
                      </label>
                      <textarea
                        rows={6}
                        placeholder={`@article{vaswani2017,\n  title={Attention Is All You Need},\n  author={Vaswani, Ashish},\n  year={2017}\n}`}
                        value={importBibtex}
                        onChange={(e) => setImportBibtex(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                      />
                    </div>
                  )}

                  {importMode === 'ris' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        RIS Format String *
                      </label>
                      <textarea
                        rows={6}
                        placeholder={`TY  - JOUR\nTI  - Deep Residual Learning\nAU  - He, Kaiming\nPY  - 2016\nER  -`}
                        value={importRis}
                        onChange={(e) => setImportRis(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-navy-900"
                      />
                    </div>
                  )}

                  {importResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-semibold ${
                        importResult.success
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {importResult.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isImporting}
                    className="w-full py-2.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin text-gold-400" /> : <RefreshCw className="w-4 h-4 text-gold-400" />}
                    <span>Import & Verify Reference</span>
                  </button>
                </form>
              </div>

              {/* Form 2: PDF & DOCX Document Upload */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-gold-600" />
                    <span>Academic Document Extraction</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload research PDFs or Word manuscripts (up to 20MB) for native text stream extraction.
                  </p>
                </div>

                <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
                  <div className="border-2 border-dashed border-slate-200 hover:border-navy-800 rounded-xl p-8 text-center bg-slate-50 transition cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="doc-upload-input"
                    />
                    <label htmlFor="doc-upload-input" className="cursor-pointer space-y-2 block">
                      <Upload className="w-8 h-8 text-navy-800 mx-auto" />
                      <p className="text-xs font-bold text-slate-800">
                        {uploadFile ? uploadFile.name : 'Click or drag PDF / DOCX here'}
                      </p>
                      <p className="text-[11px] text-slate-400">Maximum file size: 20MB</p>
                    </label>
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Document Processed Successfully</span>
                      </div>
                      <p>
                        Extracted <span className="font-mono font-bold">{uploadSuccess.wordCount}</span> words. Status: {uploadSuccess.status}.
                      </p>
                      {uploadSuccess.preview && (
                        <div className="bg-white p-2 rounded border border-emerald-100 font-mono text-[11px] text-slate-700 max-h-24 overflow-y-auto">
                          {uploadSuccess.preview}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploadProgress || !uploadFile}
                    className="w-full py-2.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {uploadProgress ? (
                      <Loader2 className="w-4 h-4 animate-spin text-navy-950" />
                    ) : (
                      <Upload className="w-4 h-4 text-navy-950" />
                    )}
                    <span>Extract Document Text</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attach to Project Modal */}
      {attachModalSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gold-600" />
              <span>Attach Source to Project</span>
            </h3>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <p className="font-bold text-slate-800 line-clamp-2">{attachModalSource.title}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {attachModalSource.authors.join(', ')} ({attachModalSource.publication_year})
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Select Destination Project
              </label>
              {projects.length === 0 ? (
                <p className="text-xs text-rose-600">No active research projects found.</p>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.discipline})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {attachStatus && (
              <p className="text-xs font-semibold text-navy-900 bg-gold-50 p-2 rounded border border-gold-200">
                {attachStatus}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAttachModalSource(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAttachSource}
                disabled={!selectedProjectId || !!attachStatus}
                className="px-4 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition disabled:opacity-50"
              >
                Attach Source
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}