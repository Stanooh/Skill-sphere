'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { MentorCard } from '@/components/mentors/MentorCard';
import { EmptyState } from '@/components/ui';
import { Search, Compass } from 'lucide-react';
import { getSavedMentorIds, saveMentor, unsaveMentor } from '@/services/savedMentorService';
import { getEligibleMentors, getRecommendedEligibleMentors } from '@/services/mentorProfileService';
import type { Mentor, MentorRecommendation } from '@/types';

export function LearnerMentorsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'recommended' | 'all'>('recommended');
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);
  const [recommendations, setRecommendations] = useState<MentorRecommendation[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [eligible, recommended, saved] = await Promise.all([
        getEligibleMentors(),
        getRecommendedEligibleMentors(user.id),
        getSavedMentorIds(user.id),
      ]);
      if (!active) return;
      setAllMentors(eligible);
      setRecommendations(recommended);
      setSavedIds(new Set(saved));
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const handleSaveToggle = async (mentorId: string) => {
    if (savingId === mentorId) return;
    setSavingId(mentorId);
    const wasSaved = savedIds.has(mentorId);

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(mentorId);
      else next.add(mentorId);
      return next;
    });

    try {
      if (wasSaved) {
        await unsaveMentor(user.id, mentorId);
        show('Mentor removed from saved.', 'info');
      } else {
        await saveMentor(user.id, mentorId);
        show('Mentor saved!', 'success');
      }
    } catch (err) {
      console.error(err);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(mentorId);
        else next.delete(mentorId);
        return next;
      });
      show('Could not update saved mentors.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filterFn = (mentor: Mentor) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      mentor.user.name.toLowerCase().includes(q) ||
      mentor.profile.professionalTitle.toLowerCase().includes(q) ||
      mentor.skills.some((s) => s.name.toLowerCase().includes(q))
    );
  };

  const filteredMentors = view === 'recommended' ? recommendations : allMentors.map((m) => ({ mentor: m, matchPercentage: undefined, matchingSkills: [], matchScore: 0 }));
  const displayed = filteredMentors.filter((r) => filterFn(r.mentor));

  return (
    <DashboardLayout>
      <PageHeader title="Find Mentors" description="Browse recommended mentors or search the full directory." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            className="input pl-10"
            placeholder="Search by name, title, or skill..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setView('recommended')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'recommended' ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}
          >
            Recommended
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'all' ? 'bg-white text-ink shadow-sm' : 'text-ink-400'}`}
          >
            All Mentors
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-400">Loading mentors...</div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Compass className="w-6 h-6" />}
            title={view === 'recommended' ? 'No recommendations yet' : 'No mentors found'}
            description={view === 'recommended' ? 'Complete your profile and select skills to get personalized recommendations.' : 'Try a different search term.'}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((rec) => (
            <MentorCard
              key={rec.mentor.user.id}
              mentor={rec.mentor}
              matchPercentage={rec.matchPercentage}
              matchingSkills={rec.matchingSkills}
              isSaved={savedIds.has(rec.mentor.user.id)}
              onSaveToggle={() => handleSaveToggle(rec.mentor.user.id)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
