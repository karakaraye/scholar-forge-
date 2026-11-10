'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ManuscriptComment, CommentStatus } from '@/types/project';
import { commentsApi } from '@/lib/api';

interface InlineCommentsPanelProps {
  projectId?: string;
  documentId?: string;
  comments?: ManuscriptComment[];
  activeSectionId?: string;
  onRefreshComments?: () => void;
  onSelectAnchor?: (anchorText: string, startOffset: number, endOffset: number) => void;
}

export const InlineCommentsPanel: React.FC<InlineCommentsPanelProps> = ({
  projectId,
  documentId,
  comments: propComments,
  activeSectionId,
  onRefreshComments,
  onSelectAnchor,
}) => {
  const [comments, setComments] = useState<ManuscriptComment[]>(propComments || []);
  const [filter, setFilter] = useState<'ALL' | CommentStatus>('ALL');
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const pid = projectId || documentId;
    if (!pid) return;
    try {
      const data = await commentsApi.list(pid, documentId ? { document_id: documentId } : undefined);
      setComments(data);
    } catch {
      // ignore
    }
  }, [projectId, documentId]);

  useEffect(() => {
    if (propComments !== undefined) {
      setComments(propComments);
    } else {
      fetchComments();
    }
  }, [propComments, fetchComments]);

  const filteredComments = comments.filter((c) => {
    if (filter === 'ALL') return true;
    return c.status === filter;
  });

  const handleAddReply = async (commentId: string) => {
    const text = replyInputs[commentId]?.trim();
    if (!text) return;

    setLoadingMap((prev) => ({ ...prev, [commentId]: true }));
    setError(null);
    try {
      await commentsApi.reply(commentId, text);
      setReplyInputs((prev) => ({ ...prev, [commentId]: '' }));
      if (onRefreshComments) onRefreshComments();
    } catch (err: any) {
      setError(err.message || 'Failed to submit reply');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleToggleStatus = async (comment: ManuscriptComment) => {
    const nextStatus = comment.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    try {
      await commentsApi.updateStatus(comment.id, nextStatus);
      if (onRefreshComments) onRefreshComments();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Manuscript Comments</h3>
          <p className="text-xs text-slate-500">
            Inline peer annotations and contextual discussion threads.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          {(['ALL', 'OPEN', 'RESOLVED', 'ORPHANED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                filter === st
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      )}

      {filteredComments.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm italic">
          No {filter.toLowerCase()} comments recorded for this manuscript.
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {filteredComments.map((c) => (
            <div
              key={c.id}
              className={`border rounded-xl p-4 transition space-y-3 ${
                c.status === 'RESOLVED'
                  ? 'bg-slate-50/70 border-slate-200 opacity-80'
                  : c.status === 'ORPHANED'
                  ? 'bg-amber-50/30 border-amber-200'
                  : 'bg-white border-slate-200 hover:border-indigo-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{c.author_name}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {c.section_title && (
                    <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {c.section_title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {c.status === 'ORPHANED' && (
                    <span
                      title="The highlighted text was deleted or significantly altered in a subsequent revision."
                      className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full"
                    >
                      Orphaned
                    </span>
                  )}
                  <button
                    onClick={() => handleToggleStatus(c)}
                    className={`text-[11px] font-medium px-2 py-0.5 rounded transition ${
                      c.status === 'RESOLVED'
                        ? 'text-slate-600 hover:bg-slate-200'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {c.status === 'RESOLVED' ? 'Reopen' : '✓ Resolve'}
                  </button>
                </div>
              </div>

              {/* Anchor text preview */}
              {c.anchor_text && (
                <div
                  onClick={() => onSelectAnchor && onSelectAnchor(c.anchor_text, c.start_offset, c.end_offset)}
                  className="bg-amber-50/60 border-l-2 border-amber-400 px-2.5 py-1 text-xs text-slate-700 rounded-r cursor-pointer hover:bg-amber-100/50 transition font-mono line-clamp-2"
                  title="Click to jump to highlighted text in the manuscript editor"
                >
                  &ldquo;{c.anchor_text}&rdquo;
                </div>
              )}

              {/* Comment Content */}
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {c.content}
              </p>

              {/* Replies Thread */}
              {c.replies && c.replies.length > 0 && (
                <div className="pl-3 border-l-2 border-slate-100 space-y-2 pt-1">
                  {c.replies.map((r) => (
                    <div key={r.id} className="bg-slate-50 p-2.5 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-800">{r.author_name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {c.status !== 'RESOLVED' && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={replyInputs[c.id] || ''}
                    onChange={(e) =>
                      setReplyInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddReply(c.id);
                    }}
                    placeholder="Reply to this thread..."
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleAddReply(c.id)}
                    disabled={loadingMap[c.id] || !replyInputs[c.id]?.trim()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InlineCommentsPanel;

