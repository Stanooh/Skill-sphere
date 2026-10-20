import { type ReactNode } from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PublicBrowseLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">SkillSphere</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 mr-2">
              <Link href="/skills" className="btn-ghost text-sm">Explore Skills</Link>
              <Link href="/mentors" className="btn-ghost text-sm">Find Mentors</Link>
              <Link href="/workshops" className="btn-ghost text-sm">Workshops</Link>
              <Link href="/roadmaps" className="btn-ghost text-sm">Roadmaps</Link>
              <Link href="/about" className="btn-ghost text-sm">About</Link>
            </div>
            <Link href="/login"><Button variant="secondary" size="sm">Sign In</Button></Link>
            <Link href="/register"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 pt-10 lg:pt-14 pb-6">
        <h1 className="text-3xl font-bold text-ink mb-2">{title}</h1>
        {description && <p className="text-ink-400 max-w-2xl">{description}</p>}
      </section>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 pb-20">{children}</main>

      <footer className="bg-ink-900 py-10">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-ink-200">SkillSphere</span>
          </div>
          <p className="text-sm text-ink-400">Skill-sharing, mentorship, and personalized learning.</p>
        </div>
      </footer>
    </div>
  );
}
