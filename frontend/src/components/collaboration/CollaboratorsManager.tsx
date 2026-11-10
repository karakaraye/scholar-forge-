'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ProjectCollaborator,
  ProjectInvitation,
  CollaboratorRole,
} from '@/types/project';
import { collaborationApi } from '@/lib/api';

export interface AssignableSection {
  id: string;
  title: string;
  parentId?: string | null;
}

interface CollaboratorsManagerProps {
  projectId: string;
  initialCollaborators?: ProjectCollaborator[];
  initialInvitations?: ProjectInvitation[];
  currentUserRole?: CollaboratorRole | null;
  /** Manuscript sections that can be assigned to a collaborator. Top-level chapters are offered. */
  sections?: AssignableSection[];
  onRefresh?: () => void;
}

const ROLE_DESCRIPTIONS: Record<CollaboratorRole, string> = {
  PROJECT_OWNER: 'Full project administration, revision approvals, and team management.',
  SUPERVISOR: 'Review assigned manuscript sections, insert critique, and approve/reject revisions.',
  CO_AUTHOR: 'Draft and edit assigned chapters with full co-authoring write access.',
  ACADEMIC_REVIEWER: 'Conduct peer review checkpoints, request corrections, and annotate findings.',
  VIEWER: 'Read-only access to manuscript and project progress without edit permissions.',
};

export const CollaboratorsManager: React.FC<CollaboratorsManagerProps> = ({
  projectId,
  initialCollaborators,
  initialInvitations,
  currentUserRole,
  sections = [],
  onRefresh,
}) => {
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>(initialCollaborators || []);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>(initialInvitations || []);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('SUPERVISOR');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const assignableSections = sections.filter((s) => !s.parentId);
  const sectionTitleById = new Map(sections.map((s) => [s.id, s.title]));

  const toggleSection = (id: string) => {
    setSelectedSectionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await collaborationApi.list(projectId);
      setCollaborators(res.collaborators || []);
      setInvitations(res.pending_invitations || []);
    } catch {
      // ignore on initial load error
    }
  }, [projectId]);

  useEffect(() => {
    if (initialCollaborators !== undefined) {
      setCollaborators(initialCollaborators);
    }
    if (initialInvitations !== undefined) {
      setInvitations(initialInvitations);
    }
    if (initialCollaborators === undefined || initialInvitations === undefined) {
      fetchTeam();
    }
  }, [initialCollaborators, initialInvitations, fetchTeam]);

  const canManage = currentUserRole === 'PROJECT_OWNER' || !currentUserRole; // default owner if not isolated

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const invite = await collaborationApi.invite(projectId, {
        email: email.trim(),
        role,
        assigned_sections: selectedSectionIds,
      });
      setInvitations((prev) => [invite, ...prev]);
      if (invite.email_sent === false) {
        const link = `${window.location.origin}/invitations/${invite.token}`;
        setSuccess(
          `Invitation created for ${email}, but the email could not be sent. Share this link with them: ${link}`
        );
      } else {
        setSuccess(`Invitation sent to ${email} as ${role}.`);
      }
      setEmail('');
      setSelectedSectionIds([]);
      setIsInviting(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collabId: string, userEmail: string) => {
    if (!window.confirm(`Revoke access for ${userEmail}?`)) return;
    try {
      await collaborationApi.remove(projectId, collabId);
      setCollaborators((prev) => prev.filter((c) => c.id !== collabId));
      setSuccess(`Access revoked for ${userEmail}.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await collaborationApi.revokeInvitation(projectId, invitationId);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setSuccess('Invitation revoked.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke invitation');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Research Collaborators & Supervisors</h2>
          <p className="text-sm text-slate-500">
            Manage co-authors, academic advisors, peer reviewers, and read-only viewers with strict project isolation.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setIsInviting((prev) => !prev)}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
          >
            {isInviting ? 'Cancel' : '+ Invite Collaborator'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Invite Form */}
      {isInviting && (
        <form onSubmit={handleSendInvite} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Invite New Collaborator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Collaborator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supervisor@university.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as CollaboratorRole)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="SUPERVISOR">Supervisor (Review, Comment & Approve)</option>
                <option value="CO_AUTHOR">Co-Author (Full Manuscript Edit Rights)</option>
                <option value="ACADEMIC_REVIEWER">Academic Reviewer (Checkpoint Critique)</option>
                <option value="VIEWER">Viewer (Read-Only Observer)</option>
                <option value="PROJECT_OWNER">Project Co-Owner (Admin)</option>
              </select>
            </div>
          </div>
          {assignableSections.length > 0 && (
            <fieldset>
              <legend className="block text-xs font-semibold text-slate-700 mb-1">
                Limit to chapters (optional)
              </legend>
              <p className="text-[11px] text-slate-500 mb-2">
                Leave all unticked for whole-manuscript access. Scoped collaborators can read everything
                but only edit or comment within the ticked chapters and their subsections.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {assignableSections.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedSectionIds.includes(s.id)}
                      onChange={() => toggleSection(s.id)}
                      className="rounded border-slate-300"
                    />
                    <span className="truncate">{s.title}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="text-xs text-slate-500 italic">
            Role note: {ROLE_DESCRIPTIONS[role]}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviting(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Secure Invitation'}
            </button>
          </div>
        </form>
      )}

      {/* Active Collaborators Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Active Collaborators ({collaborators.length})
        </h3>
        {collaborators.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No external collaborators invited yet.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned Sections</th>
                  <th className="px-4 py-3">Joined</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {collaborators.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.user_name}</div>
                      <div className="text-xs text-slate-500">{c.user_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        c.role === 'SUPERVISOR'
                          ? 'bg-purple-100 text-purple-700'
                          : c.role === 'CO_AUTHOR'
                          ? 'bg-blue-100 text-blue-700'
                          : c.role === 'ACADEMIC_REVIEWER'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {c.assigned_sections && c.assigned_sections.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.assigned_sections.map((sec, idx) => (
                            <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {sectionTitleById.get(sec) || sec}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">All manuscript sections</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveCollaborator(c.id, c.user_email)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Revoke Access
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-slate-800">
            Pending Invitations ({invitations.length})
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Invitee Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Expires</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invitations.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-medium text-slate-800">{i.invitee_email}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{i.role}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(i.expires_at).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevokeInvitation(i.id)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                        >
                          Cancel Invite
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsManager;

