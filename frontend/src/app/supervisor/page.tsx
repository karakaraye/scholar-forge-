'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import SupervisorDashboardView from '@/components/collaboration/SupervisorDashboardView';

export default function SupervisorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 min-h-screen">
        <div className="text-sm font-semibold text-slate-500">Loading ScholarForge Supervisor Workspace...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-screen bg-slate-50">
      <Sidebar className="hidden xl:flex" />
      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto">
        <SupervisorDashboardView />
      </div>
    </div>
  );
}

