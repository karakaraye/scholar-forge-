'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  BookOpen,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Sparkles,
  School,
  Search,
} from 'lucide-react';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';

const SAMPLE_DISCIPLINES = [
  { name: 'Computer Science', cat: 'STEM' },
  { name: 'Information Technology', cat: 'STEM' },
  { name: 'Engineering', cat: 'STEM' },
  { name: 'Medicine', cat: 'Health Sciences' },
  { name: 'Nursing', cat: 'Health Sciences' },
  { name: 'Public Health', cat: 'Health Sciences' },
  { name: 'Management', cat: 'Business' },
  { name: 'Business Administration', cat: 'Business' },
  { name: 'Economics', cat: 'Business' },
  { name: 'Finance', cat: 'Business' },
  { name: 'Law', cat: 'Law & Governance' },
  { name: 'Political Science', cat: 'Social Sciences' },
  { name: 'Psychology', cat: 'Social Sciences' },
  { name: 'Sociology', cat: 'Social Sciences' },
  { name: 'Education', cat: 'Education' },
  { name: 'Environmental Science', cat: 'Agriculture & Environment' },
  { name: 'Arts & Humanities', cat: 'Humanities' },
];

export default function LandingPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredDisciplines = selectedCategory === 'ALL'
    ? SAMPLE_DISCIPLINES
    : SAMPLE_DISCIPLINES.filter(d => d.cat === selectedCategory);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white pt-20 pb-24 border-b border-navy-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800/80 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multidisciplinary Academic Research SaaS</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Your intelligent <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500">
              research workspace.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ScholarForge AI empowers undergraduate scholars, master&apos;s candidates, PhD researchers, faculty, and academic professionals to scaffold, organize, and manage rigorous research across all disciplines.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-base font-bold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow-lg flex items-center justify-center gap-2 group"
            >
              <span>Launch Research Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
            <Link
              href="/features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-base font-semibold bg-navy-800/80 hover:bg-navy-800 text-slate-200 border border-navy-700 transition flex items-center justify-center"
            >
              Explore Features
            </Link>
          </div>

          {/* Academic Trust Bar */}
          <div className="mt-14 pt-8 border-t border-navy-800/60 max-w-3xl mx-auto flex flex-wrap items-center justify-around gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All Academic Disciplines</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-400" />
              <span>Rigorous Research Formats</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>PostgreSQL Data Isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>HttpOnly Session Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* Document Categories Section */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-serif text-3xl font-bold text-slate-900">
              Three Pillars of Academic Scaffolding
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Not all academic documents conform to a rigid five-chapter format. ScholarForge AI dynamically adapts to your document category and methodology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DOCUMENT_CATEGORIES.map((cat) => (
              <div
                key={cat.value}
                className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-lg bg-navy-900 border border-gold-500/30 flex items-center justify-center mb-6">
                    {cat.value === 'ACADEMIC_PROJECT' && <GraduationCap className="w-6 h-6 text-gold-400" />}
                    {cat.value === 'RESEARCH_PAPER' && <FileText className="w-6 h-6 text-gold-400" />}
                    {cat.value === 'JOURNAL_ARTICLE' && <BookOpen className="w-6 h-6 text-gold-400" />}
                  </div>

                  <h3 className="font-serif text-xl font-bold text-slate-900 mb-2">
                    {cat.label}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-navy-800 uppercase tracking-wider">
                    Dynamic Outline
                  </span>
                  <Link
                    href="/register"
                    className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1"
                  >
                    Configure <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multidisciplinary Showcase Section */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-200 text-gold-700 text-xs font-semibold mb-3">
              <School className="w-3.5 h-3.5" />
              <span>Universal Academic Coverage</span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-slate-900">
              Supporting Every Faculty & Discipline
            </h2>
            <p className="mt-2 text-slate-600 text-sm">
              Configured with 21 core academic disciplines, expandable by institution administrators.
            </p>

            {/* Filter Tabs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {['ALL', 'STEM', 'Health Sciences', 'Business', 'Social Sciences', 'Law & Governance', 'Humanities'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedCategory(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    selectedCategory === tab
                      ? 'bg-navy-950 text-gold-400 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredDisciplines.map((d) => (
              <div
                key={d.name}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-gold-500/50 hover:shadow-sm transition text-center"
              >
                <p className="text-xs font-bold text-slate-800">{d.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{d.cat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-navy-950 text-white text-center border-t border-navy-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
            Begin Your Research Project Today
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Create your account in seconds, configure your dissertation, thesis, or paper through the 5-step wizard, and access your dedicated workspace.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-base font-bold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow-lg"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

