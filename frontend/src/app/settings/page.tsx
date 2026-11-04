'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authApi, workspaceApi } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import {
  Settings as SettingsIcon,
  Lock,
  Shield,
  Layers,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Database,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [workspace, setWorkspace] = useState<{
    id: string;
    name: string;
    slug: string;
    owner_email: string;
    is_personal: boolean;
    member_count: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const ws = await workspaceApi.getCurrent();
        setWorkspace(ws);
      } catch (err) {
        console.error('Failed to load workspace', err);
      }
    }
    if (user) {
      loadWorkspace();
    }
  }, [user]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password confirmation does not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError('Failed to update password. Please check your current password.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex">
      <Sidebar className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Link href="/dashboard" className="hover:text-navy-900 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gold-600">Settings</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              Account & Workspace Settings
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure security credentials, encryption, and workspace environments.
            </p>
          </div>

          {/* Password Security Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500">
                  Ensure your account uses a secure password with letters, numbers, and symbols.
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 rounded-lg text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isChangingPassword ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </div>

          {/* Workspace Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-900">
                  Workspace Environment
                </h3>
                <p className="text-xs text-slate-500">
                  Dedicated PostgreSQL workspace container for research isolation.
                </p>
              </div>
            </div>

            {workspace ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Workspace Name</span>
                  <span className="font-bold text-slate-800">{workspace.name}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Workspace Slug</span>
                  <span className="font-mono text-slate-800">{workspace.slug}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Isolation Type</span>
                  <span className="font-bold text-slate-800">{workspace.is_personal ? 'Personal Isolation' : 'Shared Workspace'}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Security Standard</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    HttpOnly Cookies & CSRF Protection
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Loading workspace configuration...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
