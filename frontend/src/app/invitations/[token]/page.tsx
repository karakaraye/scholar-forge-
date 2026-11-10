'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, GraduationCap, MailOpen, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { collaborationApi } from '@/lib/api';
import type { InvitationSummary } from '@/types/project';

type ViewState = 'loading' | 'ready' | 'not-found' | 'accepted' | 'declined';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  PROJECT_OWNER: 'Full access, including managing the research team.',
  SUPERVISOR: 'Read, comment and approve revisions. Advisory: cannot edit the manuscript directly.',
  CO_AUTHOR: 'Read, comment and edit the manuscript and research data.',
  ACADEMIC_REVIEWER: 'Read the manuscript and leave comments and review feedback.',
  VIEWER: 'Read-only access to the manuscript and research data.',
};

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [state, setState] = useState<ViewState>('loading');
  const [invitation, setInvitation] = useState<InvitationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null);

  const returnPath = token ? `/invitations/${encodeURIComponent(token)}` : '/dashboard';

  useEffect(() => {
    if (authLoading || !user || !token) return;
    let cancelled = false;
    setState('loading');
    collaborationApi
      .getInvitation(token)
      .then((data) => {
        if (cancelled) return;
        setInvitation(data);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token]);

  const handleAccept = async () => {
    if (!token) return;
    setSubmitting('accept');
    setError(null);
    try {
      const res = await collaborationApi.acceptInvitation(token);
      setState('accepted');
      const projectId = res.collaborator?.project || invitation?.project_id;
      if (projectId) {
        setTimeout(() => router.push(`/research/${projectId}`), 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not accept the invitation.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setSubmitting('decline');
    setError(null);
    try {
      await collaborationApi.rejectInvitation(token);
      setState('declined');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not decline the invitation.');
    } finally {
      setSubmitting(null);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-lg w-full space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-navy-900 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-gold-400" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">Project Invitation</h1>
        </div>
        {children}
      </div>
    </div>
  );

  if (authLoading) {
    return shell(<p className="text-center text-sm text-slate-500">Checking your session…</p>);
  }

  if (!user) {
    return shell(
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-600">
          You have been invited to collaborate on a research project. Sign in, or create an account
          with the email address the invitation was sent to, to review it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/login?next=${encodeURIComponent(returnPath)}`}
            className="px-5 py-2.5 rounded-lg text-sm font-bold bg-navy-900 hover:bg-navy-800 text-white transition"
          >
            Sign in to continue
          </Link>
          <Link
            href={`/register?next=${encodeURIComponent(returnPath)}`}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return shell(<p className="text-center text-sm text-slate-500">Loading invitation…</p>);
  }

  if (state === 'not-found') {
    return shell(
      <div className="space-y-4 text-center">
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm text-left">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            This invitation could not be found for <strong>{user.email}</strong>. It may have been
            revoked, or it was sent to a different email address.
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition">
            Go to dashboard
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gold-600 hover:text-gold-700 transition"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  if (state === 'accepted') {
    return shell(
      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-sm">
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          You joined <strong>{invitation?.project_title}</strong>. Opening the project…
        </div>
      </div>
    );
  }

  if (state === 'declined') {
    return shell(
      <div className="space-y-4 text-center">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 text-slate-700 text-sm text-left">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>You declined the invitation to {invitation?.project_title}.</div>
        </div>
        <Link href="/dashboard" className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (!invitation) return null;

  const isActionable = invitation.status === 'PENDING' && !invitation.is_expired;
  const expiresOn = new Date(invitation.expires_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return shell(
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <MailOpen className="w-5 h-5 text-gold-600 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 space-y-1">
          <p>
            <strong>{invitation.invited_by_name || invitation.project_owner_name}</strong> invited you to collaborate on
          </p>
          <p className="font-serif text-lg font-bold text-slate-900">{invitation.project_title}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your role</dt>
          <dd className="mt-1 font-semibold text-slate-900">{invitation.role_label}</dd>
          <dd className="mt-1 text-xs text-slate-500">{ROLE_DESCRIPTIONS[invitation.role] || ''}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scope</dt>
          <dd className="mt-1 text-slate-900">
            {invitation.assigned_sections_count > 0
              ? `${invitation.assigned_sections_count} assigned section${invitation.assigned_sections_count === 1 ? '' : 's'}`
              : 'Whole manuscript'}
          </dd>
          <dd className="mt-1 text-xs text-slate-500">
            {isActionable ? `Expires ${expiresOn}` : `Status: ${invitation.is_expired ? 'Expired' : invitation.status.toLowerCase()}`}
          </dd>
        </div>
      </dl>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {isActionable ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting !== null}
            className="flex-1 py-3 px-4 rounded-lg text-sm font-bold bg-navy-900 hover:bg-navy-800 text-white transition disabled:opacity-50"
          >
            {submitting === 'accept' ? 'Accepting…' : 'Accept invitation'}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting !== null}
            className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {submitting === 'decline' ? 'Declining…' : 'Decline'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          This invitation can no longer be accepted. Ask the project owner to send a new one.
        </p>
      )}
    </div>
  );
}
