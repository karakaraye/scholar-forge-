'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  BookOpen,
  User,
  Settings,
  Sparkles,
  ExternalLink,
  Users,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/research', label: 'My Research', icon: FolderKanban },
    { href: '/research/create', label: 'Create Research', icon: PlusCircle, highlight: true },
    { href: '/supervisor', label: 'Supervisor Review', icon: Users },
    { href: '/library', label: 'Research Library', icon: BookOpen },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`w-64 bg-navy-950 border-r border-navy-900 flex flex-col justify-between shrink-0 p-4 ${className}`}>
      <div className="space-y-6">
        {/* Navigation Group */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-navy-900 text-gold-400 border border-gold-500/20 shadow-sm'
                      : item.highlight
                      ? 'text-gold-400 hover:bg-navy-900/60 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-navy-900/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : item.highlight ? 'text-gold-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Stage 1 Foundation Notice */}
        <div className="p-3.5 rounded-lg bg-navy-900/60 border border-navy-800 text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-gold-400 font-semibold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ScholarForge Stage 1</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Multi-discipline project configuration, dynamic chapter scaffolding, and PostgreSQL workspace storage are active.
          </p>
          <div className="pt-1 border-t border-navy-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>AI Engine</span>
            <span className="text-amber-400/90 font-medium">Stage 2 Horizon</span>
          </div>
        </div>
      </div>

      {/* Quick Status */}
      <div className="pt-4 border-t border-navy-900 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          REST API Online
        </span>
        <span className="text-slate-400">v1.0.0</span>
      </div>
    </aside>
  );
}

