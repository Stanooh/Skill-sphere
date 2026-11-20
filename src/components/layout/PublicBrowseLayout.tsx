import { type ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { PublicNavigation } from '@/components/layout/PublicNavigation';

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
      <PublicNavigation />

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
            <span className="text-sm font-semibold text-ink-400">SkillSphere</span>
          </div>
          <p className="text-sm text-ink-400">Skill-sharing, mentorship, and personalized learning.</p>
        </div>
      </footer>
    </div>
  );
}
