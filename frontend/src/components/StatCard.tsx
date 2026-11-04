import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  color?: 'navy' | 'gold' | 'emerald' | 'slate';
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color = 'navy',
}: StatCardProps) {
  const colorMap = {
    navy: 'bg-navy-900/10 text-navy-800 border-navy-200',
    gold: 'bg-amber-500/10 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold font-serif text-slate-900 mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
