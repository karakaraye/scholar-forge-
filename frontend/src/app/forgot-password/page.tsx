'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { GraduationCap, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; devResetLink?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessData(null);
    setIsLoading(true);

    try {
      const res = await authApi.requestPasswordReset(email);
      let devResetLink = '';
      if (res.dev_reset_data) {
        devResetLink = `/reset-password?uid=${res.dev_reset_data.uid}&token=${res.dev_reset_data.token}`;
      }
      setSuccessData({
        message: res.message,
        devResetLink,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to dispatch reset instructions.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-navy-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-gold-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            Reset Password
          </h2>
          <p className="mt-2 text-xs text-slate-500">
            Enter your academic email address to receive password reset instructions
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successData && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">Instructions Dispatched</p>
                <p className="mt-1 text-xs text-emerald-700">{successData.message}</p>
              </div>
            </div>

            {successData.devResetLink && (
              <div className="pt-2 border-t border-emerald-200 text-xs">
                <span className="font-semibold text-emerald-900">Stage 1 Development Shortcut:</span>
                <Link
                  href={successData.devResetLink}
                  className="mt-1 block font-mono text-[11px] text-emerald-950 underline break-all bg-emerald-100 p-2 rounded"
                >
                  Proceed to Reset Link &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@institution.edu"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg text-sm font-bold bg-navy-900 hover:bg-navy-800 text-white transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-600 hover:text-navy-900 transition"
          >
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
