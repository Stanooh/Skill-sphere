'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Users, CalendarDays, BookOpen, TrendingUp, Star,
  ClipboardList, GraduationCap, Compass, Loader2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getAdminReportData } from '@/services/adminService';
import type { AdminReportData } from '@/services/adminService';

export function AdminReportsPage() {
  const [data, setData] = useState<AdminReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getAdminReportData();
        if (active) setData(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load reports');
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
  }, [reloadKey]);

  if (loading) {
    return (
      <DashboardLayout>
        <PageHeader title="Reports & Activity" description="Platform analytics and insights." />
        <div className="flex items-center justify-center py-24 text-ink-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading reports…
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <PageHeader title="Reports & Activity" description="Platform analytics and insights." />
        <div className="card p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-ink">Failed to load reports</p>
              <p className="text-sm text-ink-400">{error}</p>
            </div>
            <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, mentors, skills, workshops, recentSessions } = data;

  // Compute derived data for charts from real records
  const topMentors = [...mentors]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 5);

  // Skill popularity: count how many mentor_profiles list each skill
  const skillUsage = skills
    .map((s) => ({
      name: s.name,
      category: s.category,
      mentorCount: s.mentorCount,
    }))
    .sort((a, b) => b.mentorCount - a.mentorCount);

  const maxMentorCount = Math.max(...skillUsage.map((s) => s.mentorCount), 1);

  // Workshop fill rates
  const workshopRegs = workshops
    .map((w) => ({
      title: w.title,
      registrations: w.registrationCount,
      capacity: w.capacity,
      fillRate: w.capacity > 0 ? Math.round((w.registrationCount / w.capacity) * 100) : 0,
      status: w.status,
    }))
    .sort((a, b) => b.registrations - a.registrations);

  const avgMentorRating =
    mentors.filter((m) => m.reviewCount > 0).length > 0
      ? (
          mentors
            .filter((m) => m.reviewCount > 0)
            .reduce((sum, m) => sum + m.rating, 0) /
          mentors.filter((m) => m.reviewCount > 0).length
        ).toFixed(1)
      : '—';

  return (
    <DashboardLayout>
      <PageHeader title="Reports & Activity" description="Platform analytics and insights — all data from Supabase." />

      {/* Summary stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<Users className="w-5 h-5" />} />
        <StatCard
          label="Total Sessions"
          value={stats.totalSessions}
          icon={<CalendarDays className="w-5 h-5" />}
          sublabel={`${stats.completedSessions} completed`}
        />
        <StatCard
          label="Total Workshops"
          value={stats.totalWorkshops}
          icon={<BookOpen className="w-5 h-5" />}
          sublabel={`${stats.publishedWorkshops} published`}
        />
        <StatCard
          label="Avg Rating"
          value={avgMentorRating}
          icon={<Star className="w-5 h-5" />}
          sublabel="rated mentors"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Mentor performance */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand" /> Mentor Performance
          </h2>
          {topMentors.length === 0 ? (
            <EmptyState
              icon={<Compass className="w-5 h-5" />}
              title="No mentor data"
              description="Mentor profiles will appear here once approved."
            />
          ) : (
            <div className="space-y-3">
              {topMentors.map((m, idx) => (
                <div key={m.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink-400 w-5">{idx + 1}</span>
                    <Avatar src={m.avatarUrl ?? undefined} name={m.fullName ?? undefined} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-ink">{m.fullName}</p>
                      <p className="text-xs text-ink-400">
                        {m.professionalTitle || 'Mentor'} • {m.workshopCount} workshop{m.workshopCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    {m.reviewCount > 0 ? (
                      <>
                        <span className="text-sm font-semibold text-ink">{m.rating.toFixed(1)}</span>
                        <span className="text-xs text-ink-400">({m.reviewCount})</span>
                      </>
                    ) : (
                      <span className="text-xs text-ink-400">No ratings</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skill popularity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand" /> Skill Popularity
          </h2>
          {skillUsage.length === 0 ? (
            <EmptyState icon={<TrendingUp className="w-5 h-5" />} title="No skills data" description="Skills will appear here once added." />
          ) : (
            <div className="space-y-3">
              {skillUsage.slice(0, 8).map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-ink">{s.name}</span>
                    <span className="text-xs text-ink-400">{s.mentorCount} mentor{s.mentorCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${(s.mentorCount / maxMentorCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Workshop fill rates */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand" /> Workshop Registration Rates
        </h2>
        {workshopRegs.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-5 h-5" />} title="No workshops yet" description="Workshops created by mentors will appear here." />
        ) : (
          <div className="space-y-4">
            {workshopRegs.map((w, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink truncate max-w-xs">{w.title}</span>
                    <Badge variant={w.status === 'published' ? 'green' : w.status === 'completed' ? 'brand' : 'gray'}>
                      {w.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-ink-400 shrink-0 ml-2">
                    {w.registrations}/{w.capacity} ({w.fillRate}%)
                  </span>
                </div>
                <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      w.fillRate >= 80 ? 'bg-green-500' : w.fillRate >= 40 ? 'bg-brand' : 'bg-ink-300'
                    }`}
                    style={{ width: `${Math.min(w.fillRate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand" /> Recent Sessions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100">
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider pb-2">Session</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider pb-2">Learner</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider pb-2">Mentor</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider pb-2">Status</th>
                  <th className="text-left text-xs font-semibold text-ink-400 uppercase tracking-wider pb-2 hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2 font-medium text-ink">{s.title}</td>
                    <td className="py-2 text-ink-400">{s.learnerName}</td>
                    <td className="py-2 text-ink-400">{s.mentorName}</td>
                    <td className="py-2">
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
                    </td>
                    <td className="py-2 text-ink-400 hidden md:table-cell">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform health summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-ink-400">Learners</p>
              <p className="text-xl font-bold text-ink">{stats.totalLearners}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
              <Compass className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-ink-400">Mentors</p>
              <p className="text-xl font-bold text-ink">{stats.totalMentors}</p>
              <p className="text-xs text-ink-400">{stats.activatedMentors} activated</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-brand" />
            </div>
            <div>
              <p className="text-sm text-ink-400">Pending Applications</p>
              <p className="text-xl font-bold text-ink">{stats.pendingApplications}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
