'use client';

import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui';
import { Users, GraduationCap, Compass, CalendarDays, BookOpen, ClipboardList, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { getPlatformStats, getAllMentors, getWorkshops, getSessionsForMentor } from '@/services/dataService';

export function AdminDashboard() {
  const stats = getPlatformStats();
  const mentors = getAllMentors();
  const workshops = getWorkshops();

  // Recent activity: latest sessions across mentors
  const recentSessions = mentors
    .flatMap((m) => getSessionsForMentor(m.user.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <DashboardLayout>
      <PageHeader title="Platform Overview" description="Monitor SkillSphere activity and key metrics." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Learners" value={stats.totalLearners} icon={<GraduationCap className="w-5 h-5" />} />
        <StatCard label="Total Mentors" value={stats.totalMentors} icon={<Compass className="w-5 h-5" />} />
        <StatCard label="Active Sessions" value={stats.activeSessions} icon={<CalendarDays className="w-5 h-5" />} sublabel={`${stats.pendingRequests} pending`} />
        <StatCard label="Workshops" value={stats.totalWorkshops} icon={<BookOpen className="w-5 h-5" />} sublabel={`${stats.upcomingWorkshops} upcoming`} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Completed Sessions" value={stats.completedSessions} icon={<ClipboardList className="w-5 h-5" />} />
        <StatCard label="Total Skills" value={stats.totalSkills} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Avg Mentor Rating" value={stats.avgMentorRating} icon={<Star className="w-5 h-5" />} />
        <StatCard label="Total Users" value={stats.totalLearners + stats.totalMentors + 1} icon={<Users className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top mentors */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Top Rated Mentors</h2>
          <div className="space-y-3">
            {mentors
              .sort((a, b) => b.profile.rating - a.profile.rating)
              .slice(0, 5)
              .map((m) => (
                <div key={m.user.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-3">
                    {m.user.avatar && (
                      <Image
                        src={m.user.avatar}
                        alt={m.user.name}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink">{m.user.name}</p>
                      <p className="text-xs text-ink-400">{m.profile.professionalTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-ink">{m.profile.rating}</span>
                    <span className="text-ink-400">({m.profile.reviewCount})</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Recent Activity</h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-ink-400">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-ink-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${s.status === 'accepted' ? 'bg-green-50 text-green-700' : s.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-ink-100 text-ink-600'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming workshops */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Upcoming Workshops</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.filter((w) => w.status === 'published').slice(0, 3).map((w) => {
            const mentor = mentors.find((m) => m.user.id === w.mentorId);
            return (
              <div key={w.id} className="card p-5">
                <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                <p className="text-sm text-ink-400 mb-2">{mentor?.user.name}</p>
                <p className="text-xs text-ink-400">{new Date(w.date).toLocaleDateString()} • {w.registeredLearnerIds.length}/{w.capacity} registered</p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
