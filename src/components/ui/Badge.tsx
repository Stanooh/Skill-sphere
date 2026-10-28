import { type ReactNode } from 'react';

type BadgeVariant = 'brand' | 'gray' | 'green' | 'amber' | 'red' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  brand: 'bg-brand-900 text-brand-200',
  gray: 'bg-ink-100 text-ink-600',
  green: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
  amber: 'bg-amber-950 text-amber-300 border border-amber-800',
  red: 'bg-red-950 text-red-300 border border-red-800',
  outline: 'border border-ink-200 text-ink-600 bg-transparent',
};

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return <span className={`badge ${variantClasses[variant]} ${className}`}>{children}</span>;
}
