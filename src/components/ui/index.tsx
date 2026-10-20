'use client';

import { type ReactNode } from 'react';

export function ProgressBar({ value, className = '', label }: { value: number; className?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-ink-600">{label}</span>
          <span className="text-sm font-semibold text-ink">{clamped}%</span>
        </div>
      )}
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-ink-100 overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            active === tab.id
              ? 'border-brand text-brand-700'
              : 'border-transparent text-ink-400 hover:text-ink-600 hover:border-ink-200'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-ink-50 flex items-center justify-center text-ink-300 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink-400 max-w-sm mb-5">{description}</p>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  sublabel?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-ink mt-1">{value}</p>
          {sublabel && <p className="text-xs text-ink-400 mt-1">{sublabel}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand">
          {icon}
        </div>
      </div>
    </div>
  );
}
