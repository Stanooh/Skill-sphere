'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const publicNavigation = [
  ['/', 'Home'],
  ['/skills', 'Explore Skills'],
  ['/mentors', 'Find Mentors'],
  ['/talent', 'Find Talent'],
  ['/workshops', 'Workshops'],
  ['/roadmaps', 'Roadmaps'],
  ['/about', 'About'],
];

export function PublicNavigation() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-30 border-b border-ink-200 bg-ink-800/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
            <GraduationCap className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">SkillSphere</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="mr-2 hidden items-center gap-1 md:flex">
            {publicNavigation.map(([href, label]) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`nav-underline-link btn-ghost text-sm ${active ? 'text-brand' : ''}`}
                >
                  <span className="nav-label-underline">{label}</span>
                </Link>
              );
            })}
          </div>
          <Link href="/login"><Button variant="secondary" size="sm">Sign In</Button></Link>
          <Link href="/register"><Button size="sm">Get Started</Button></Link>
        </div>
      </div>
    </nav>
  );
}
