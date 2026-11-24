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
import { getSavedMentorProfiles, unsaveMentor } from '@/services/savedMentorService';
import type { Mentor } from '@/types';

export function LearnerSavedPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [savedMentors, setSavedMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    try {
      const mentors = await getSavedMentorProfiles(user.id);
      setSavedMentors(mentors);
    } catch (err) {
      console.error(err);
      show('Failed to load saved mentors.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, show]);

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
    const previous = savedMentors;
    setSavedMentors((curr) => curr.filter((m) => m.user.id !== mentorId));
    try {
      await unsaveMentor(user.id, mentorId);
      show('Mentor removed from saved.', 'info');
    } catch (err) {
      console.error(err);
      setSavedMentors(previous);
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
