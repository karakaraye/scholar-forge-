'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MailOpen } from 'lucide-react';
import { collaborationApi } from '@/lib/api';
import type { InvitationSummary } from '@/types/project';

/** Lists project invitations waiting for the signed-in user. Renders nothing when there are none. */
export default function PendingInvitationsBanner() {
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    collaborationApi
      .myInvitations()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) setInvitations(list);
      })
      .catch(() => {
        /* the dashboard still works without this banner */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (invitations.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gold-400 bg-gold-50 p-5 space-y-3" aria-label="Pending invitations">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <MailOpen className="w-4 h-4 text-gold-600" />
        <span>
          You have {invitations.length} pending project invitation{invitations.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-2">
        {invitations.map((inv) => (
          <li
            key={inv.token}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-white border border-slate-200 px-4 py-3"
          >
            <div className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{inv.project_title}</span>
              <span className="text-slate-500"> · {inv.role_label} · from {inv.invited_by_name || inv.project_owner_name}</span>
            </div>
            <Link
              href={`/invitations/${encodeURIComponent(inv.token)}`}
              className="self-start sm:self-auto px-4 py-1.5 rounded-lg text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white transition"
            >
              Review
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
