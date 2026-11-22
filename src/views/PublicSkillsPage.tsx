'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Users, Sparkles } from 'lucide-react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { getDynamicSkillsWithMentorCounts, type SkillWithMentorCount } from '@/services/skillService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function PublicSkillsPage() {
  const [skillsWithCounts, setSkillsWithCounts] = useState<SkillWithMentorCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    let active = true;
    void getDynamicSkillsWithMentorCounts().then((data) => {
      if (!active) return;
      setSkillsWithCounts(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const categories = ['All', ...new Set(skillsWithCounts.map((s) => s.category))];

  const filteredSkills =
    selectedCategory === 'All'
      ? skillsWithCounts
      : skillsWithCounts.filter((s) => s.category === selectedCategory);

  const displayedCategories =
    selectedCategory === 'All'
      ? [...new Set(filteredSkills.map((s) => s.category))]
      : [selectedCategory];

  return (
    <PublicBrowseLayout
      title="Explore Skills"
      description="Browse the high-demand technical and professional skills our approved mentors can help you master."
    >
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              selectedCategory === cat
                ? 'bg-brand text-white'
                : 'bg-ink-800 text-ink-300 border border-ink-200 hover:border-ink-100 hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-3" />
          <p className="text-sm">Loading skills directory & mentor counts...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {displayedCategories.map((cat) => {
            const catSkills = filteredSkills.filter((s) => s.category === cat);
            if (catSkills.length === 0) return null;

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-ink">{cat}</h2>
                  <span className="text-xs text-ink-400">
                    ({catSkills.length} {catSkills.length === 1 ? 'skill' : 'skills'})
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {catSkills.map((skill) => {
                    const count = skill.mentorCount;
                    return (
                      <Link
                        key={skill.id}
                        href={`/mentors`}
                        className="card p-4 flex items-center justify-between hover:border-brand/50 hover:shadow-card-hover transition-all group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-ink group-hover:text-brand transition-colors truncate">
                            {skill.name}
                          </p>
                          <p className="text-xs text-ink-400 mt-1 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-ink-400" />
                            {count > 0 ? (
                              <span className="text-brand font-medium">
                                {count} {count === 1 ? 'mentor' : 'mentors'} available
                              </span>
                            ) : (
                              <span>0 mentors currently</span>
                            )}
                          </p>
                        </div>
                        <Badge variant="gray" className="shrink-0">
                          {skill.category}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA Box */}
      <div className="mt-14 card p-8 sm:p-10 text-center bg-gradient-to-b from-brand-950/20 to-transparent border border-brand/20">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2">Ready to master new skills?</h2>
        <p className="text-ink-400 mb-6 max-w-xl mx-auto text-sm sm:text-base">
          Create a free learner profile, select your target skills, and get automatically matched with experienced mentors.
        </p>
        <Link href="/register">
          <Button size="lg" className="inline-flex items-center gap-2">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </PublicBrowseLayout>
  );
}
