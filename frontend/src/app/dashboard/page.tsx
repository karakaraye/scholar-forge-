'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectsApi } from '@/lib/api';
import { ResearchProject, DashboardStats } from '@/types/project';
import Sidebar from '@/components/Sidebar';
import StatCard from '@/components/StatCard';
import ProjectCard from '@/components/ProjectCard';
import PendingInvitationsBanner from '@/components/collaboration/PendingInvitationsBanner';
import {
  FolderKanban,
  CheckCircle,
  FileEdit,
  Archive,
  PlusCircle,
  Search,
  Filter,
  Sparkles,
  AlertCircle,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [statsData, projectsData] = await Promise.all([
        projectsApi.getDashboardStats(),
        projectsApi.list({
          search: searchQuery || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        }),
      ]);
      setStats(statsData);
      setProjects(projectsData.results || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const handleArchive = async (id: string) => {
    try {
      const res = await projectsApi.archive(id);
      setSuccessMsg(res.message);
      await loadDashboardData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await projectsApi.delete(id);
      setSuccessMsg('Project deleted successfully.');
      await loadDashboardData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-navy-900 border-t-gold-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      {/* Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <PendingInvitationsBanner />

          {/* Welcome Banner */}
          <div className="bg-navy-950 rounded-2xl p-6 sm:p-8 text-white border border-navy-900 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-navy-900 border border-gold-500/30 text-gold-400 text-xs font-medium mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{user?.academic_level ? user.academic_level.replace('_', ' ') : 'Academic Scholar'}</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Welcome back, {user?.first_name || user?.full_name || 'Researcher'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  {user?.institution ? `${user.institution} • ` : ''}Your multidisciplinary research projects and outlines are ready.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/research/create"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow"
                >
                  <PlusCircle className="w-4 h-4 text-navy-950" />
                  <span>Create Research</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Toast / Success Alerts */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
              <span className="font-medium">{successMsg}</span>
              <button
                onClick={() => setSuccessMsg(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadDashboardData}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Real Database Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              title="Total Projects"
              value={stats?.total_projects ?? 0}
              icon={FolderKanban}
              subtitle="All registered studies"
              color="navy"
            />
            <StatCard
              title="Active Research"
              value={stats?.active_projects ?? 0}
              icon={CheckCircle}
              subtitle="In progress & writing"
              color="emerald"
            />
            <StatCard
              title="Draft Projects"
              value={stats?.draft_projects ?? 0}
              icon={FileEdit}
              subtitle="Pending configuration"
              color="gold"
            />
            <StatCard
              title="Archived"
              value={stats?.archived_projects ?? 0}
              icon={Archive}
              subtitle="Preserved repository"
              color="slate"
            />
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects, disciplines, institutions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">All Categories</option>
                <option value="ACADEMIC_PROJECT">Academic Project</option>
                <option value="RESEARCH_PAPER">Research Paper</option>
                <option value="JOURNAL_ARTICLE">Journal Article</option>
              </select>

              <button
                onClick={loadDashboardData}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition"
                title="Refresh Projects"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Research Projects Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Research Workspaces ({projects.length})
              </h2>
              <Link
                href="/research"
                className="text-xs font-semibold text-gold-600 hover:text-gold-700 transition"
              >
                View all repository &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-56 bg-slate-200/60 rounded-xl animate-pulse border border-slate-200"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              /* Empty State */
              <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-full bg-navy-900/5 text-navy-900 flex items-center justify-center mx-auto mb-4 border border-navy-900/10">
                  <BookOpen className="w-7 h-7 text-gold-600" />
                </div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  No research projects found
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  {searchQuery || statusFilter || categoryFilter
                    ? 'No projects match your current filters. Try resetting the search or filter options.'
                    : 'You haven’t configured any research projects yet. Use the 5-step wizard to setup your thesis, dissertation, or paper.'}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {searchQuery || statusFilter || categoryFilter ? (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('');
                        setCategoryFilter('');
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      href="/research/create"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white transition shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4 text-gold-400" />
                      <span>Start Your First Research</span>
                    </Link>
                  )}
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
    </div>
  );
}
