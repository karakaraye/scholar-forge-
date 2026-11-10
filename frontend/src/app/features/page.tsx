import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  GraduationCap,
  ShieldAlert,
  Database,
  Lock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ListOrdered,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';
import { CITATION_STYLES, DOCUMENT_CATEGORIES } from '@/lib/constants';

export default function FeaturesPage() {
  const features = [
    {
      title: 'Multidisciplinary Configuration Engine',
      icon: Globe,
      desc: 'Seamlessly configure research spanning STEM, Social Sciences, Health Sciences, Business, Law, Humanities, and Interdisciplinary domains without arbitrary limitations.',
    },
    {
      title: '5-Step Guided Setup Wizard',
      icon: ListOrdered,
      desc: 'Structured setup wizard capturing document category, document subtype, academic discipline, citation format, objectives, methodology, and supervisor constraints.',
    },
    {
      title: 'Dynamic Outline Scaffolding',
      icon: Layers,
      desc: 'Smart manuscript outlines tailored to your academic discipline and document category, avoiding artificial rigid 5-chapter enforcement.',
    },
    {
      title: 'Universal Citation Styles',
      icon: BookOpen,
      desc: 'First-class support for APA 7th, MLA 9th, Chicago 17th, Harvard, IEEE, and Vancouver reference standards.',
    },
    {
      title: 'Enterprise Data Isolation & Ownership',
      icon: Lock,
      desc: 'PostgreSQL row-level isolation guarantees that researchers only ever access their private projects and verified workspace collaborations.',
    },
    {
      title: 'Real-Time Database Analytics',
      icon: Database,
      desc: 'Dynamic live project metrics, active/draft/archived status counters, and instant search & multi-facet filtering.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Header */}
      <section className="bg-navy-950 text-white py-16 border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-800 border border-gold-500/30 text-gold-400 text-xs font-semibold uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-white">
            Engineered for Serious Academic Research
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
            Discover how ScholarForge AI provides the technical foundation, methodological structure, and workspace security required for high-impact scholarship.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-lg bg-navy-900 border border-gold-500/30 flex items-center justify-center text-gold-400 mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-900 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Citation Styles Section */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
              Supported Citation Formats
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              ScholarForge AI formats in-text citations and bibliographies to match premier academic standards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {CITATION_STYLES.map((c) => (
              <div
                key={c.value}
                className="p-5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-4"
              >
                <div className="p-2 rounded bg-navy-900 text-gold-400 font-bold text-xs uppercase shrink-0">
                  {c.value}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{c.label}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.field}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
            Ready to Configure Your Research?
          </h2>
          <p className="text-slate-300 text-sm mb-6">
            Join scholars and researchers worldwide with a structured, professional research environment.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow"
          >
            <span>Create Research Project</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

