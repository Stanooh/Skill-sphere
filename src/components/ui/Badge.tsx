import { type ReactNode } from 'react';

type BadgeVariant = 'brand' | 'gray' | 'green' | 'amber' | 'red' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  brand: 'bg-brand-50 text-brand-700',
  gray: 'bg-ink-100 text-ink-600',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  outline: 'border border-ink-200 text-ink-600 bg-white',
};

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return <span className={`badge ${variantClasses[variant]} ${className}`}>{children}</span>;
}
