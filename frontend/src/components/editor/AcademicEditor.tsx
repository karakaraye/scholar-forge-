'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import CharacterCount from '@tiptap/extension-character-count';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Maximize2,
  Minimize2,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  BookMarked,
  MessageSquare,
} from 'lucide-react';

export interface AcademicEditorHandle {
  insertContent: (content: string) => void;
  getHTML: () => string;
}

interface AcademicEditorProps {
  content: string;
  sectionTitle: string;
  sectionType?: string;
  isSaving: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSavedAt?: Date | null;
  onSaveManual?: () => void;
  onChangeContent: (html: string, wordCount: number) => void;
  onNextSection?: () => void;
  onPrevSection?: () => void;
  hasNextSection?: boolean;
  hasPrevSection?: boolean;
  onOpenCitationModal?: () => void;
  onGenerateBibliography?: () => void;
  onAddComment?: (selection: { text: string; start: number; end: number }) => void;
  editorRef?: React.MutableRefObject<AcademicEditorHandle | null>;
}

export default function AcademicEditor({
  content,
  sectionTitle,
  sectionType = 'SECTION',
  isSaving,
  saveStatus,
  lastSavedAt,
  onSaveManual,
  onChangeContent,
  onNextSection,
  onPrevSection,
  hasNextSection,
  hasPrevSection,
  onOpenCitationModal,
  onGenerateBibliography,
  onAddComment,
  editorRef,
}: AcademicEditorProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-navy-700 underline font-semibold hover:text-gold-600 transition',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full border border-slate-300 my-4 text-xs',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 bg-slate-100 font-bold p-2 text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 p-2',
        },
      }),
      CharacterCount,
    ],
    content: content || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[460px] p-6 sm:p-8 font-serif text-slate-800 leading-relaxed text-base select-text',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      onChangeContent(html, words);
    },
  });

  // Keep editor content in sync when switching sections
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== content) {
        editor.commands.setContent(content || '<p></p>');
      }
    }
  }, [content, editor]);

  // Bind imperative handle to editorRef if provided
  useEffect(() => {
    if (editorRef && editor) {
      editorRef.current = {
        insertContent: (newContent: string) => {
          editor.chain().focus().insertContent(newContent).run();
        },
        getHTML: () => editor.getHTML(),
      };
    }
  }, [editorRef, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter scholarly hyperlink URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertAcademicTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-6 h-6 animate-spin text-navy-800" />
      </div>
    );
  }

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div
      className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'min-h-[640px]'
      }`}
    >
      {/* Top Header: Section Title, Save Indicator, and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-navy-950 text-gold-400 font-mono">
            {sectionType}
          </span>
          <h2 className="font-serif text-lg font-bold text-slate-900 truncate max-w-md">
            {sectionTitle || 'Untitled Section'}
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 font-medium">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-navy-700 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving manuscript...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>All changes saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unsaved edits</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-rose-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed (retrying)</span>
              </span>
            )}
          </div>

          {/* Manual Save Button */}
          {onSaveManual && (
            <button
              onClick={onSaveManual}
              disabled={isSaving || saveStatus === 'saved'}
              className="px-3 py-1.5 rounded-lg bg-navy-900 text-white font-semibold text-xs hover:bg-navy-800 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-gold-400" />
              <span>Save Now</span>
            </button>
          )}

          {/* Full Screen Toggle */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Writing Mode'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-200 transition"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-200 bg-slate-100/70 text-slate-700 text-xs">
        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('paragraph') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Paragraph"
        >
          <Pilcrow className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded font-bold hover:bg-slate-200 transition ${
            editor.isActive('heading', { level: 1 }) ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded font-bold hover:bg-slate-200 transition ${
            editor.isActive('heading', { level: 2 }) ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded font-bold hover:bg-slate-200 transition ${
            editor.isActive('heading', { level: 3 }) ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={`p-1.5 rounded font-bold hover:bg-slate-200 transition ${
            editor.isActive('heading', { level: 4 }) ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Heading 4"
        >
          <Heading4 className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* Text Styles */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('bold') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('italic') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('underline') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('strike') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('subscript') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Subscript (H₂O)"
        >
          <SubscriptIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('superscript') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Superscript / Exponent (R²)"
        >
          <SuperscriptIcon className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* Lists & Quotes */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('bulletList') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('orderedList') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('blockquote') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Academic Block Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* Tables & Links */}
        <button
          onClick={insertAcademicTable}
          className="p-1.5 rounded hover:bg-slate-200 transition"
          title="Insert Table (3x3)"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={setLink}
          className={`p-1.5 rounded hover:bg-slate-200 transition ${
            editor.isActive('link') ? 'bg-navy-900 text-white hover:bg-navy-800' : ''
          }`}
          title="Add Hyperlink"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        {editor.isActive('link') && (
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1.5 rounded hover:bg-slate-200 transition"
            title="Remove Hyperlink"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-[1px] h-4 bg-slate-300 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        {(onOpenCitationModal || onGenerateBibliography) && (
          <div className="w-[1px] h-4 bg-slate-300 mx-1" />
        )}

        {/* Scholarly Citation & Bibliography Actions */}
        {onOpenCitationModal && (
          <button
            onClick={onOpenCitationModal}
            className="px-2 py-1 rounded bg-navy-50 hover:bg-navy-100 text-navy-900 font-bold transition flex items-center gap-1 border border-navy-200"
            title="Insert In-Text Citation (CSL Standard)"
          >
            <Quote className="w-3.5 h-3.5 text-gold-600" />
            <span>Cite</span>
          </button>
        )}
        {onGenerateBibliography && (
          <button
            onClick={onGenerateBibliography}
            className="px-2 py-1 rounded bg-gold-50 hover:bg-gold-100 text-navy-950 font-bold transition flex items-center gap-1 border border-gold-300"
            title="Generate & Insert Bibliography"
          >
            <BookMarked className="w-3.5 h-3.5 text-gold-700" />
            <span>Bibliography</span>
          </button>
        )}
        {onAddComment && (
          <button
            onClick={() => {
              const { from, to } = editor.state.selection;
              const selectedText = editor.state.doc.textBetween(from, to, ' ');
              onAddComment({
                text: selectedText || '',
                start: from,
                end: to,
              });
            }}
            className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold transition flex items-center gap-1 border border-indigo-200"
            title="Add Inline Manuscript Comment"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Comment</span>
          </button>
        )}
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* Footer Status Bar: Word Count, Char Count, Section Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-4">
          <span>
            Words: <strong className="text-slate-800 font-bold">{wordCount.toLocaleString()}</strong>
          </span>
          <span>
            Characters: <strong className="text-slate-800 font-bold">{charCount.toLocaleString()}</strong>
          </span>
          {lastSavedAt && (
            <span className="text-[11px] text-slate-400">
              Last saved: {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasPrevSection && onPrevSection && (
            <button
              onClick={onPrevSection}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
            >
              ← Previous Section
            </button>
          )}
          {hasNextSection && onNextSection && (
            <button
              onClick={onNextSection}
              className="px-2.5 py-1 rounded bg-navy-900 text-white font-semibold text-xs hover:bg-navy-800 transition"
            >
              Next Section →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
