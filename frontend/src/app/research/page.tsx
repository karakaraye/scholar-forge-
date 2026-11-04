'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectsApi } from '@/lib/api';
import { ResearchProject } from '@/types/project';
import Sidebar from '@/components/Sidebar';
import ProjectCard from '@/components/ProjectCard';
import {
  FolderKanban,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

export default function MyResearchPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.list({
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
      });
      setProjects(res.results || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch research repository.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, search, status, category]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, fetchProjects]);

  const handleArchive = async (id: string) => {
    await projectsApi.archive(id);
    await fetchProjects();
  };

  const handleDelete = async (id: string) => {
    await projectsApi.delete(id);
    await fetchProjects();
  };

  return (
    <div className="flex-1 flex">
      <Sidebar className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Link href="/dashboard" className="hover:text-navy-900 transition">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-gold-600">Research Repository</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                My Research Projects
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                View, manage, filter, and access your academic projects and research papers.
              </p>
            </div>

            <Link
              href="/research/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4 text-navy-950" />
              <span>Create New Research</span>
            </Link>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, discipline, institution..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">All Document Categories</option>
                <option value="ACADEMIC_PROJECT">Academic Project</option>
                <option value="RESEARCH_PAPER">Research Paper</option>
                <option value="JOURNAL_ARTICLE">Journal Article</option>
              </select>

              <button
                onClick={fetchProjects}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchProjects}
                className="text-xs font-bold text-rose-700 hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 bg-slate-200/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-slate-900">
                No matching research projects
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No studies match your filter settings. Clear your filters or create a new project.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSearch('');
                    setStatus('');
                    setCategory('');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
                >
                  Reset Filters
                </button>
                <Link
                  href="/research/create"
                  className="px-4 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-xs font-bold text-white transition"
                >
                  Create Research
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
