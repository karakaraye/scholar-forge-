'use client';

import React from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { BookOpen, Bookmark, Library, Sparkles, Database, Search, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LibraryPage() {
  const sampleSources = [
    {
      title: 'Attention Is All You Need',
      authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'Uszkoreit, J.'],
      year: 2017,
      type: 'Conference Paper',
      doi: '10.48550/arXiv.1706.03762',
    },
    {
      title: 'Deep Residual Learning for Image Recognition',
      authors: ['He, K.', 'Zhang, X.', 'Ren, S.', 'Sun, J.'],
      year: 2016,
      type: 'Conference Paper',
      doi: '10.1109/CVPR.2016.90',
    },
    {
      title: 'Building Scalable Web Services with Microservice Architectures',
      authors: ['Richardson, C.'],
      year: 2019,
      type: 'Book',
      doi: 'ISBN 978-1617294549',
    },
  ];

  return (
    <div className="flex-1 flex">
      <Sidebar className="hidden md:flex" />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Link href="/dashboard" className="hover:text-navy-900 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-gold-600">Research Library</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              Academic Research Library
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Central catalog for literature sources, annotated bibliographies, and universal citations.
            </p>
          </div>

          {/* Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-950 to-navy-900 text-white border border-navy-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-navy-800 text-gold-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Foundation Ready</span>
              </div>
              <h2 className="font-serif text-xl font-bold text-white">
                Literature & Citation Architecture
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                The Stage 1 PostgreSQL database schema is operational with <code className="bg-navy-800 px-1 py-0.5 rounded text-[11px]">ResearchSource</code> and <code className="bg-navy-800 px-1 py-0.5 rounded text-[11px]">Citation</code> models. Automated semantic literature discovery will be activated in Stage 2.
              </p>
            </div>

            <Link
              href="/research/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow shrink-0 self-start md:self-auto"
            >
              <span>Create Project</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Catalog Schema Preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-gold-600" />
                <span>Source Schema Catalog Preview</span>
              </h3>
              <span className="text-xs text-slate-400">Sample Reference Records</span>
            </div>

            <div className="space-y-3">
              {sampleSources.map((source, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{source.title}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {source.authors.join(', ')} ({source.year})
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      DOI: {source.doi}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded bg-navy-100 text-navy-800 text-[11px] font-semibold self-start sm:self-auto">
                    {source.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
