import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck, BookMarked, Globe, FileCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-navy-900 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-navy-900 border border-gold-500/40 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-gold-400" />
              </div>
              <span className="font-serif font-bold text-lg text-white">
                ScholarForge <span className="text-gold-400 font-sans text-xs">AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your intelligent research workspace. Supporting undergraduate projects, master&apos;s theses, doctoral dissertations, and peer-reviewed journal articles across all academic disciplines.
            </p>
            <div className="flex items-center gap-2 text-xs text-gold-400/90 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Academic Integrity & Rigor First</span>
            </div>
          </div>

          {/* Academic Document Types */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Research Categories
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-gold-400 transition">Academic Projects & Capstones</li>
              <li className="hover:text-gold-400 transition">Master&apos;s Theses & Dissertations</li>
              <li className="hover:text-gold-400 transition">Empirical & Theoretical Papers</li>
              <li className="hover:text-gold-400 transition">Systematic Literature Reviews</li>
              <li className="hover:text-gold-400 transition">Peer-Reviewed Journal Articles</li>
            </ul>
          </div>

          {/* Disciplines Supported */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Disciplines
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-gold-400 transition">Computer Science & Engineering</li>
              <li className="hover:text-gold-400 transition">Business & Management</li>
              <li className="hover:text-gold-400 transition">Medicine, Nursing & Public Health</li>
              <li className="hover:text-gold-400 transition">Law, Politics & Social Sciences</li>
              <li className="hover:text-gold-400 transition">Arts, Humanities & Agriculture</li>
            </ul>
          </div>

          {/* Platform & Compliance */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              Platform & Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/features" className="hover:text-gold-400 transition">
                  Platform Architecture & Features
                </Link>
              </li>
              <li>
                <Link href="/library" className="hover:text-gold-400 transition">
                  Citation & Source Frameworks
                </Link>
              </li>
              <li className="text-slate-500">Stage 1 Foundation: REST APIs & PostgreSQL</li>
              <li className="text-slate-500">HttpOnly Secure Session Isolation</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-navy-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ScholarForge AI. All rights reserved.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <span>Stage 1 Foundation Operational</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              PostgreSQL Connected
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
