'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { MentorCard } from '@/components/mentors/MentorCard';
import { EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { getSavedMentors, getMentor, unsaveMentor } from '@/services/dataService';

export function LearnerSavedPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const saved = getSavedMentors(user.id);
  const savedMentors = saved
    .map((s) => getMentor(s.mentorId))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  const handleUnsave = (mentorId: string) => {
    unsaveMentor(user.id, mentorId);
    show('Mentor removed from saved.', 'info');
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title="Saved Mentors" description="Mentors you've bookmarked for later." />

      {savedMentors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bookmark className="w-6 h-6" />}
            title="No saved mentors yet"
            description="Save mentors you're interested in and they'll appear here."
            action={<Link href="/learner/mentors"><Button>Explore Mentors</Button></Link>}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedMentors.map((mentor) => (
            <MentorCard
              key={mentor.user.id}
              mentor={mentor}
              isSaved={true}
              onSaveToggle={() => handleUnsave(mentor.user.id)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
