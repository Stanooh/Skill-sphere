'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Users, GraduationCap, Compass, CalendarDays, BookOpen,
  ClipboardList, Star, TrendingUp, AlertTriangle, Loader2,
} from 'lucide-react';
import { getAdminDashboardData } from '@/services/adminService';
import type { AdminDashboardData } from '@/services/adminService';

export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await getAdminDashboardData();
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Platform Overview" description="Monitor SkillSphere activity and key metrics." />
        <div className="flex items-center justify-center py-24 text-ink-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading dashboard data…
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <PageHeader title="Platform Overview" description="Monitor SkillSphere activity and key metrics." />
        <div className="card p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-ink">Failed to load dashboard</p>
              <p className="text-sm text-ink-400 mt-1">{error ?? 'Unknown error. Check your Supabase connection and admin permissions.'}</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, topMentors, recentSessions, upcomingWorkshops } = data;

  return (
    <DashboardLayout>
      <PageHeader title="Platform Overview" description="Monitor SkillSphere activity and key metrics." />

      {/* Row 1: User stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Learners" value={stats.totalLearners} icon={<GraduationCap className="w-5 h-5" />} />
        <StatCard label="Mentors" value={stats.totalMentors} icon={<Compass className="w-5 h-5" />} sublabel={`${stats.activatedMentors} activated`} />
        <StatCard label="Pending Applications" value={stats.pendingApplications} icon={<ClipboardList className="w-5 h-5" />} sublabel={`${stats.totalApplications} total`} />
      </div>

      {/* Row 2: Activity stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Sessions" value={stats.totalSessions} icon={<CalendarDays className="w-5 h-5" />} sublabel={`${stats.pendingSessions} pending`} />
        <StatCard label="Active Sessions" value={stats.activeSessions} icon={<CalendarDays className="w-5 h-5" />} sublabel={`${stats.completedSessions} completed`} />
        <StatCard label="Workshops" value={stats.totalWorkshops} icon={<BookOpen className="w-5 h-5" />} sublabel={`${stats.publishedWorkshops} published`} />
        <StatCard label="Total Skills" value={stats.totalSkills} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Rated Mentors */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Top Rated Mentors</h2>
          {topMentors.length === 0 ? (
            <EmptyState
              icon={<Star className="w-5 h-5" />}
              title="No rated mentors yet"
              description="Mentor ratings will appear here once learners submit reviews."
            />
          ) : (
            <div className="space-y-3">
              {topMentors.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Avatar src={m.avatarUrl ?? undefined} name={m.fullName ?? undefined} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink">{m.fullName}</p>
                      <p className="text-xs text-ink-400">{m.professionalTitle || 'Mentor'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-ink">{m.rating.toFixed(1)}</span>
                    <span className="text-ink-400">({m.reviewCount})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-5 h-5" />}
              title="No sessions yet"
              description="Mentorship sessions will appear here once learners request them."
            />
          ) : (
            <div className="space-y-3">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-400">{s.learnerName} → {s.mentorName}</p>
                    <p className="text-xs text-ink-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge
                    variant={
                      s.status === 'accepted' ? 'green'
                      : s.status === 'pending' ? 'amber'
                      : s.status === 'completed' ? 'brand'
                      : 'gray'
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Workshops */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Upcoming Workshops</h2>
        {upcomingWorkshops.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<BookOpen className="w-5 h-5" />}
              title="No published workshops"
              description="Workshops created and published by mentors will appear here."
            />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingWorkshops.map((w) => (
              <div key={w.id} className="card p-5">
                <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                <p className="text-sm text-ink-400 mb-2">{w.mentorName}</p>
                <p className="text-xs text-ink-400">
                  {new Date(w.date).toLocaleDateString()} • {w.registrationCount}/{w.capacity} registered
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
