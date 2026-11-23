'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';
import { Search, GraduationCap, MapPin, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { getAdminLearners } from '@/services/adminService';
import type { AdminLearnerRow } from '@/services/adminService';
import { getAdminSkills } from '@/services/adminService';
import type { AdminSkillRow } from '@/services/adminService';

export function AdminLearnersPage() {
  const [learners, setLearners] = useState<AdminLearnerRow[]>([]);
  const [skills, setSkills] = useState<AdminSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [learnersData, skillsData] = await Promise.all([getAdminLearners(), getAdminSkills()]);
        if (active) {
          setLearners(learnersData);
          setSkills(skillsData);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load learner data');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [reloadKey]);

  const skillMap = new Map(skills.map((s) => [s.id, s.name]));

  const filtered = learners
    .filter((l) => {
      if (visibilityFilter === 'visible') return l.employerVisibility;
      if (visibilityFilter === 'hidden') return !l.employerVisibility;
      return true;
    })
    .filter((l) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.location && l.location.toLowerCase().includes(q)) ||
        (l.learningGoal && l.learningGoal.toLowerCase().includes(q))
      );
    });

  return (
    <DashboardLayout>
      <PageHeader title="Learner Talent Pool" description="Browse learner profiles and progress." />

      {error && (
        <div className="card p-5 border-l-4 border-red-500 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-ink-400">{error}</p>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            className="input pl-10"
            placeholder="Search by name, email, location, or goal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1">
          {(['all', 'visible', 'hidden'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisibilityFilter(v)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${visibilityFilter === v ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}
            >
              {v === 'all' ? 'All' : v === 'visible' ? 'Talent Visible' : 'Private'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading learners…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<GraduationCap className="w-6 h-6" />}
            title="No learners found"
            description={query ? 'Try a different search.' : 'No learners have registered yet.'}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((learner) => {
            const learnerSkills = learner.skillIds
              .map((id) => skillMap.get(id))
              .filter(Boolean) as string[];

            return (
              <div key={learner.id} className="card p-5">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar src={learner.avatarUrl ?? undefined} name={learner.fullName ?? undefined} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">{learner.fullName}</h3>
                    <p className="text-sm text-ink-400 truncate">{learner.education || 'No education listed'}</p>
                    {learner.location && (
                      <p className="text-xs text-ink-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {learner.location}
                      </p>
                    )}
                  </div>
                  <div title={learner.employerVisibility ? 'Talent visible to employers' : 'Profile private'}>
                    {learner.employerVisibility
                      ? <Eye className="w-4 h-4 text-brand" />
                      : <EyeOff className="w-4 h-4 text-ink-300" />}
                  </div>
                </div>

                {learner.learningGoal && (
                  <div className="bg-ink-50 rounded-lg px-3 py-2 mb-3">
                    <p className="text-xs text-ink-400">Goal</p>
                    <p className="text-sm font-medium text-ink">{learner.learningGoal}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {learnerSkills.slice(0, 4).map((name) => (
                    <Badge key={name} variant="gray">{name}</Badge>
                  ))}
                  {learnerSkills.length > 4 && (
                    <Badge variant="outline">+{learnerSkills.length - 4}</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-ink-50 text-xs text-ink-400">
                  <span>
                    Profile:{' '}
                    <Badge variant={learner.profileComplete ? 'green' : 'amber'} className="text-[10px]">
                      {learner.profileComplete ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </span>
                  <span>Joined {new Date(learner.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !error && (
        <p className="text-xs text-ink-400 mt-4 text-right">
          Showing {filtered.length} of {learners.length} learners
        </p>
      )}
    </DashboardLayout>
  );
}
