'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-navy-950 border-b border-navy-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-navy-900 border border-gold-500/40 flex items-center justify-center shadow-inner group-hover:border-gold-400 transition">
                <GraduationCap className="w-6 h-6 text-gold-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                  ScholarForge <span className="text-gold-400 text-xs font-sans uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">AI</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline tracking-wider uppercase">
                  Your intelligent research workspace
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                isActive('/') ? 'text-gold-400 bg-navy-900' : 'text-slate-300 hover:text-white hover:bg-navy-900/50'
              }`}
            >
              Overview
            </Link>
            <Link
              href="/features"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                isActive('/features') ? 'text-gold-400 bg-navy-900' : 'text-slate-300 hover:text-white hover:bg-navy-900/50'
              }`}
            >
              Features
            </Link>

            {user && (
              <>
                <div className="h-4 w-px bg-navy-800 mx-2" />
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    isActive('/dashboard') ? 'text-gold-400 bg-navy-900' : 'text-slate-300 hover:text-white hover:bg-navy-900/50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  href="/research"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    isActive('/research') ? 'text-gold-400 bg-navy-900' : 'text-slate-300 hover:text-white hover:bg-navy-900/50'
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  My Research
                </Link>
                <Link
                  href="/library"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    isActive('/library') ? 'text-gold-400 bg-navy-900' : 'text-slate-300 hover:text-white hover:bg-navy-900/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Library
                </Link>
              </>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/research/create"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-semibold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 text-navy-950" />
                  <span>New Research</span>
                </Link>

                <div className="flex items-center gap-2 pl-2 border-l border-navy-800">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-sm text-slate-300 hover:text-white group"
                  >
                    <div className="w-8 h-8 rounded-full bg-navy-800 border border-gold-500/30 flex items-center justify-center text-xs font-bold text-gold-400 group-hover:border-gold-400 transition">
                      {user.first_name ? user.first_name[0] : 'U'}
                    </div>
                    <span className="max-w-[120px] truncate">{user.first_name || user.email}</span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-navy-900 transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-navy-900 transition"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 rounded-md text-sm font-semibold bg-gold-500 hover:bg-gold-600 text-navy-950 transition shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-navy-900 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-900 border-b border-navy-800 px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-gold-400 hover:bg-navy-950"
          >
            Overview
          </Link>
          <Link
            href="/features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-gold-400 hover:bg-navy-950"
          >
            Features
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-gold-400 hover:bg-navy-950"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
              <Link
                href="/research"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-gold-400 hover:bg-navy-950"
              >
                <FolderKanban className="w-4 h-4" /> My Research
              </Link>
              <Link
                href="/research/create"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-gold-400 bg-navy-950"
              >
                <PlusCircle className="w-4 h-4" /> New Research
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-gold-400 hover:bg-navy-950"
              >
                <UserIcon className="w-4 h-4" /> Profile ({user.email})
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-navy-950"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center block px-3 py-2 rounded-md text-base font-medium bg-navy-800 text-white"
              >
                Log In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center block px-3 py-2 rounded-md text-base font-semibold bg-gold-500 text-navy-950"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

