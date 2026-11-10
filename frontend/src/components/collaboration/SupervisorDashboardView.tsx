'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SupervisorProjectItem } from '@/types/project';
import { supervisorApi } from '@/lib/api';

export const SupervisorDashboardView: React.FC = () => {
  const [projects, setProjects] = useState<SupervisorProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupervised = async () => {
      try {
        const data = await supervisorApi.getProjects();
        setProjects(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load supervised projects');
      } finally {
        setLoading(false);
      }
    };
    fetchSupervised();
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        Loading supervisor dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Supervisor Dashboard</h1>
        <p className="text-sm text-slate-500">
          Track assigned research theses, dissertations, and peer-review tasks across your advisees.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
          <div className="text-3xl">📚</div>
          <h3 className="font-semibold text-slate-700">No Supervised Projects Assigned</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You currently have no active advisee projects or peer-review invitations assigned to your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div
              key={p.project_id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {p.discipline}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
                    {p.role}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                  {p.title}
                </h3>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Student: </span>
                  {p.student_name || 'Advisee'} ({p.student_email || 'No email'})
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Pending Corrections:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      p.pending_tasks_count > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.pending_tasks_count}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Open Comments:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      p.open_comments_count > 0
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.open_comments_count}
                  </span>
                </div>

                <Link
                  href={`/research/${p.project_id}`}
                  className="block text-center w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg transition"
                >
                  Open Workspace ➔
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboardView;

