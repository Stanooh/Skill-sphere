'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { MentorCard } from '@/components/mentors/MentorCard';
import { EmptyState } from '@/components/ui';
import { Search, Compass } from 'lucide-react';
import {
  getAllMentors,
  getRecommendedMentors,
  isMentorSaved,
  saveMentor,
  unsaveMentor,
} from '@/services/dataService';

export function LearnerMentorsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'recommended' | 'all'>('recommended');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const recommendations = getRecommendedMentors(user.id);
  const allMentors = getAllMentors();

  const handleSaveToggle = (mentorId: string) => {
    if (isMentorSaved(user.id, mentorId)) unsaveMentor(user.id, mentorId);
    else saveMentor(user.id, mentorId);
    setRefreshKey((k) => k + 1);
  };

  const filterFn = (mentor: typeof allMentors[0]) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      mentor.user.name.toLowerCase().includes(q) ||
      mentor.profile.professionalTitle.toLowerCase().includes(q) ||
      mentor.skills.some((s) => s.name.toLowerCase().includes(q))
    );
  };

  const filteredMentors = view === 'recommended' ? recommendations.map((r) => r) : allMentors.map((m) => ({ mentor: m, matchPercentage: undefined, matchingSkills: [], matchScore: 0 }));
  const displayed = filteredMentors.filter((r) => filterFn(r.mentor));

  return (
    <DashboardLayout key={refreshKey}>
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
        <div className="flex gap-1 bg-ink-50 rounded-lg p-1">
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

      {displayed.length === 0 ? (
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
              isSaved={isMentorSaved(user.id, rec.mentor.user.id)}
              onSaveToggle={() => handleSaveToggle(rec.mentor.user.id)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
