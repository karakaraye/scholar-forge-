import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Archive,
  Trash2,
  ExternalLink,
  Tag,
  Building2,
  FileText,
} from 'lucide-react';
import { ResearchProject } from '@/types/project';
import { formatDate } from '@/lib/utils';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ProjectCardProps {
  project: ResearchProject;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ProjectCard({ project, onArchive, onDelete }: ProjectCardProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await onDelete(project.id);
      setDeleteModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setActionLoading(true);
    try {
      await onArchive(project.id);
      setArchiveModalOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const statusColors = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    ARCHIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
        <div>
          {/* Top Badges */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                statusColors[project.status] || 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {project.status}
            </span>

            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Tag className="w-3 h-3 text-gold-600" />
              {project.citation_style}
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/research/${project.id}`}
            className="block group-hover:text-navy-700 transition"
          >
            <h3 className="font-serif font-bold text-base text-slate-900 leading-snug line-clamp-2">
              {project.title}
            </h3>
          </Link>

          {/* Subtype & Discipline */}
          <p className="text-xs text-slate-600 mt-1 font-medium">
            {project.document_subtype}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              <BookOpen className="w-3 h-3 text-navy-700" />
              {project.discipline_name || 'Discipline'}
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              <GraduationCap className="w-3 h-3 text-slate-600" />
              {project.academic_level}
            </span>

            {project.institution && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 truncate max-w-[150px]">
                <Building2 className="w-3 h-3 text-slate-600" />
                {project.institution}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Metadata & Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Updated {formatDate(project.updated_at)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setArchiveModalOpen(true)}
              className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
              title={project.status === 'ARCHIVED' ? 'Unarchive Project' : 'Archive Project'}
            >
              <Archive className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDeleteModalOpen(true)}
              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <Link
              href={`/research/${project.id}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-navy-900 text-white hover:bg-navy-800 transition"
            >
              <span>Workspace</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Research Project"
        message={`Are you sure you want to permanently delete "${project.title}"? This will delete all requirements, documents, and sections. This action cannot be undone.`}
        confirmText="Delete Project"
        confirmVariant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Archive Confirmation Modal */}
      <ConfirmationModal
        isOpen={archiveModalOpen}
        title={project.status === 'ARCHIVED' ? 'Unarchive Project' : 'Archive Research Project'}
        message={
          project.status === 'ARCHIVED'
            ? `Do you want to restore "${project.title}" to active status?`
            : `Are you sure you want to archive "${project.title}"? It will remain accessible under the archived filter.`
        }
        confirmText={project.status === 'ARCHIVED' ? 'Restore to Active' : 'Archive Project'}
        confirmVariant="warning"
        isLoading={actionLoading}
        onConfirm={handleArchive}
        onCancel={() => setArchiveModalOpen(false)}
      />
    </>
  );
}
