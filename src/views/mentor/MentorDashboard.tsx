'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard, EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { CalendarDays, ClipboardList, BookOpen, Users, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  getSessionsForMentor,
  getWorkshopsForMentor,
  getMentorProfile,
  isMentorProfileComplete,
} from '@/services/dataService';
import { getVerificationApplication } from '@/services/verificationService';
import { VerificationProgress, VerificationStatusBadge } from '@/components/verification/VerificationComponents';

export function MentorDashboard() {
  const { user } = useAuth();
  const [refreshKey] = useState(0);

  if (!user) return null;

  const profile = getMentorProfile(user.id);
  const profileReady = profile ? isMentorProfileComplete(profile) : false;
  const sessions = getSessionsForMentor(user.id);
  const pendingRequests = sessions.filter((s) => s.status === 'pending');
  const acceptedSessions = sessions.filter((s) => s.status === 'accepted');
  const workshops = getWorkshopsForMentor(user.id);
  const verification = getVerificationApplication(user.id);

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} description="Manage your mentorship requests, sessions, and workshops." />

      {!profileReady && (
        <div className="card p-5 mb-6 border-l-4 border-amber-500 bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-ink">Your profile is not visible to learners yet</p>
              <p className="text-sm text-ink-400 mt-1">Complete your profile with a professional title, bio, at least one skill, and availability to appear in mentor search results.</p>
              <Link href="/mentor/profile" className="inline-block mt-3">
                <Button size="sm" variant="secondary">
                  Complete your profile <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Requests" value={pendingRequests.length} icon={<ClipboardList className="w-5 h-5" />} />
        <StatCard label="Confirmed Sessions" value={acceptedSessions.length} icon={<CalendarDays className="w-5 h-5" />} />
        <StatCard label="Active Workshops" value={workshops.filter((w) => w.status === 'upcoming').length} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard label="Rating" value={profile?.rating ?? 'N/A'} icon={<Users className="w-5 h-5" />} sublabel={`${profile?.reviewCount ?? 0} reviews`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm text-ink-400">Trust centre</p><h2 className="mt-1 text-lg font-semibold text-ink">Build confidence with learners</h2><p className="mt-2 max-w-xl text-sm text-ink-400">Identity and competency are reviewed separately. Choose the skills you want assessed and keep private identity evidence off your public profile.</p></div>
            <ShieldCheck className="h-7 w-7 text-brand-800" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3"><VerificationStatusBadge status={verification.identity.status} compact /><VerificationStatusBadge status={verification.skills.some((skill) => skill.status === 'verified') ? 'verified' : verification.overallStatus} compact /><Link href="/mentor/verification"><Button size="sm">Open verification centre <ArrowRight className="h-4 w-4" /></Button></Link></div>
        </div>
        <VerificationProgress application={verification} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending requests */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Pending Requests</h2>
            <Link href="/mentor/requests"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
          {pendingRequests.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-6 h-6" />}
              title="No pending requests"
              description="New mentorship requests will appear here."
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-400">{new Date(s.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <Link href="/mentor/requests"><Button size="sm">Review</Button></Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming sessions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ink">Upcoming Sessions</h2>
            <Link href="/mentor/sessions"><Button variant="ghost" size="sm">View all <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
          {acceptedSessions.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="No upcoming sessions"
              description="Accepted sessions will appear here."
            />
          ) : (
            <div className="space-y-3">
              {acceptedSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-400">{new Date(s.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-green-700">Confirmed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workshops */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Your Workshops</h2>
          <Link href="/mentor/workshops"><Button variant="ghost" size="sm">Manage <ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
        {workshops.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<BookOpen className="w-6 h-6" />}
              title="No workshops yet"
              description="Create a workshop to share your expertise with learners."
              action={<Link href="/mentor/workshops"><Button>Create Workshop</Button></Link>}
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workshops.slice(0, 3).map((w) => (
              <div key={w.id} className="card p-5">
                <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                <p className="text-sm text-ink-400 mb-3">{new Date(w.date).toLocaleDateString()}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-400">{w.registeredLearnerIds.length}/{w.capacity} registered</span>
                  <span className="text-ink-400">{w.durationMinutes} min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
