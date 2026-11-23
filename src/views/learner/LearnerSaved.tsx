'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { MentorCard } from '@/components/mentors/MentorCard';
import { EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { getSavedMentors, unsaveMentor } from '@/services/savedMentorService';
import { getMentor } from '@/services/dataService';
import type { Mentor } from '@/types';

export function LearnerSavedPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [savedMentors, setSavedMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    const records = await getSavedMentors(user.id);
    const mentors = records
      .map((s) => getMentor(s.mentorId))
      .filter((m): m is NonNullable<typeof m> => m !== undefined);
    setSavedMentors(mentors);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await loadSaved();
    };
    void run();
    return () => {
      active = false;
    };
  }, [loadSaved]);

  if (!user) return null;

  const handleUnsave = async (mentorId: string) => {
    try {
      await unsaveMentor(user.id, mentorId);
      show('Mentor removed from saved.', 'info');
      await loadSaved();
    } catch (err) {
      console.error(err);
      show('Failed to remove saved mentor.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Saved Mentors" description="Mentors you've bookmarked for later." />

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading saved mentors...</div>
      ) : savedMentors.length === 0 ? (
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
