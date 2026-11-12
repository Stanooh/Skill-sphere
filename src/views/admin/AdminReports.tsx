'use client';

import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui';
import { Users, CalendarDays, BookOpen, TrendingUp, Star, ClipboardList, GraduationCap, Compass } from 'lucide-react';
import { getPlatformStats, getAllMentors, getWorkshops, getSkills } from '@/services/dataService';

export function AdminReportsPage() {
  const stats = getPlatformStats();
  const mentors = getAllMentors();
  const workshops = getWorkshops();
  const skills = getSkills();

  // Sessions per mentor
  const mentorSessionCounts = mentors.map((m) => ({
    name: m.user.name,
    rating: m.profile.rating,
    workshops: getWorkshops().filter((w) => w.mentorId === m.user.id).length,
  reviewCount: m.profile.reviewCount,
  experience: m.profile.experienceYears,
  title: m.profile.professionalTitle,
  location: m.profile.location,
  skills: m.skills.length,
  availability: m.profile.availability,
  mentorshipAreas: m.profile.mentorshipAreas,
  })).sort((a, b) => b.rating - a.rating);

  // Skills distribution
  const skillUsage = skills.map((skill) => {
    const mentorCount = mentors.filter((m) => m.skills.some((s) => s.id === skill.id)).length;
    return { name: skill.name, category: skill.category, mentorCount };
  }).sort((a, b) => b.mentorCount - a.mentorCount);

  // Workshop registrations
  const workshopRegs = workshops.map((w) => ({
    title: w.title,
    registrations: w.registeredLearnerIds.length,
    capacity: w.capacity,
    fillRate: Math.round((w.registeredLearnerIds.length / w.capacity) * 100),
    status: w.status,
  })).sort((a, b) => b.registrations - a.registrations);

  const maxMentorCount = Math.max(...skillUsage.map((s) => s.mentorCount), 1);

  return (
    <DashboardLayout>
      <PageHeader title="Reports & Activity" description="Platform analytics and insights." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.totalLearners + stats.totalMentors + 1} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Total Sessions" value={stats.totalSessions} icon={<CalendarDays className="w-5 h-5" />} sublabel={`${stats.completedSessions} completed`} />
        <StatCard label="Total Workshops" value={stats.totalWorkshops} icon={<BookOpen className="w-5 h-5" />} sublabel={`${stats.upcomingWorkshops} upcoming`} />
        <StatCard label="Avg Rating" value={stats.avgMentorRating} icon={<Star className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Mentor performance */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2"><Compass className="w-5 h-5 text-brand" /> Mentor Performance</h2>
          <div className="space-y-3">
            {mentorSessionCounts.slice(0, 5).map((m, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-ink-50 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-ink-400 w-5">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-ink-400">{m.title} • {m.workshops} workshops</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-semibold text-ink">{m.rating}</span>
                  <span className="text-xs text-ink-400">({m.reviewCount})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill popularity */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand" /> Skill Popularity</h2>
          <div className="space-y-3">
            {skillUsage.slice(0, 6).map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink">{s.name}</span>
                  <span className="text-xs text-ink-400">{s.mentorCount} mentors</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(s.mentorCount / maxMentorCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workshop fill rates */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-brand" /> Workshop Registration Rates</h2>
        <div className="space-y-4">
          {workshopRegs.map((w) => (
            <div key={w.title}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-ink">{w.title}</span>
                <span className="text-xs text-ink-400">{w.registrations}/{w.capacity} ({w.fillRate}%)</span>
              </div>
              <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${w.fillRate >= 80 ? 'bg-green-500' : w.fillRate >= 40 ? 'bg-brand' : 'bg-ink-300'}`} style={{ width: `${w.fillRate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform health */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-brand" /></div>
            <div>
              <p className="text-sm text-ink-400">Learners</p>
              <p className="text-xl font-bold text-ink">{stats.totalLearners}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center"><Compass className="w-5 h-5 text-brand" /></div>
            <div>
              <p className="text-sm text-ink-400">Mentors</p>
              <p className="text-xl font-bold text-ink">{stats.totalMentors}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-brand" /></div>
            <div>
              <p className="text-sm text-ink-400">Pending Requests</p>
              <p className="text-xl font-bold text-ink">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
