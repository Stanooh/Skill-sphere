'use client';

import Link from 'next/link';
import { Compass, Bookmark, CalendarDays, GraduationCap, BookOpen, ArrowRight, BarChart3, Sparkles, Wand2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar, EmptyState } from '@/components/ui';
import { MentorCard } from '@/components/mentors/MentorCard';
import { WorkshopCard } from '@/components/workshops/WorkshopCard';
import {
  getRecommendedMentors,
  getLearnerProfile,
  getRoadmap,
  getSessionsForLearner,
  getWorkshops,
  isMentorSaved,
  saveMentor,
  unsaveMentor,
  getProgress,
} from '@/services/dataService';
import { useState } from 'react';

export function LearnerDashboard() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const profile = getLearnerProfile(user.id);
  const recommendations = getRecommendedMentors(user.id);
  const roadmap = getRoadmap(user.id);
  const sessions = getSessionsForLearner(user.id);
  const upcomingSessions = sessions.filter((s) => s.status === 'accepted' || s.status === 'pending');
  const workshops = getWorkshops().filter((w) => w.status === 'published');
  const progress = getProgress(user.id);

  const handleSaveToggle = (mentorId: string) => {
    if (isMentorSaved(user.id, mentorId)) unsaveMentor(user.id, mentorId);
    else saveMentor(user.id, mentorId);
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Continue your learning journey where you left off." />

      {/* Continue learning */}
      {roadmap ? (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink mb-1">Continue your learning</h2>
              <p className="text-sm text-ink-400">{roadmap.goal}</p>
            </div>
            <Link href="/learner/roadmap">
              <Button variant="ghost" size="sm">View roadmap <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
          <ProgressBar value={progress.percentage} label="Roadmap progress" />
        </div>
      ) : (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-ink mb-1">Start your learning journey</h2>
          <p className="text-sm text-ink-400 mb-4">Generate a personalized roadmap based on your skills and goals.</p>
          <Link href="/learner/roadmap"><Button>Generate Roadmap</Button></Link>
        </div>
      )}

      {/* AI Career Advisor banner */}
      <div className="card p-5 mb-8 bg-brand-50 border-brand-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">AI Career Advisor</h2>
              <p className="text-sm text-ink-400">Have a question about your career or learning direction?</p>
            </div>
          </div>
          <Link href="/learner/career-advisor">
            <Button size="sm"><MessageSquare className="w-4 h-4" /> Ask Career Advisor</Button>
          </Link>
        </div>
      </div>

      {/* Recommended mentors */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Recommended Mentors</h2>
          <Link href="/learner/mentors"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        {recommendations.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Compass className="w-6 h-6" />}
              title="No recommendations yet"
              description="Complete your profile and select skills to get personalized mentor recommendations."
              action={<Link href="/learner/profile"><Button>Complete Profile</Button></Link>}
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec) => (
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
      </div>

      {/* AI Roadmap Generator banner */}
      <div className="card p-5 mb-8 border-brand-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">AI Roadmap Generator</h2>
              <p className="text-sm text-ink-400">Generate a detailed learning plan with phases, projects, and milestones.</p>
            </div>
          </div>
          <Link href="/learner/roadmap/create">
            <Button size="sm" variant="secondary"><Wand2 className="w-4 h-4" /> Generate AI Roadmap</Button>
          </Link>
        </div>
      </div>

      {/* Upcoming sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Upcoming Sessions</h2>
          <Link href="/learner/sessions"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        {upcomingSessions.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="No upcoming sessions"
              description="Request a mentorship session with a mentor to get started."
              action={<Link href="/learner/mentors"><Button>Find Mentors</Button></Link>}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-ink">{session.title}</h3>
                  <p className="text-sm text-ink-400 mt-0.5">{new Date(session.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} • {session.durationMinutes} min</p>
                </div>
                <Badge variant={session.status === 'accepted' ? 'green' : 'amber'}>
                  {session.status === 'accepted' ? 'Confirmed' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended workshops */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Recommended Workshops</h2>
          <Link href="/learner/workshops"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.slice(0, 3).map((w) => (
            <WorkshopCard
              key={w.id}
              workshop={w}
              isRegistered={w.registeredLearnerIds.includes(user.id)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
