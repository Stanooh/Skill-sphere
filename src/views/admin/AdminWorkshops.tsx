'use client';

import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui';
import { BookOpen, CalendarDays, Clock, Users } from 'lucide-react';
import { getWorkshops, getMentor, getSkillById } from '@/services/dataService';

export function AdminWorkshopsPage() {
  const workshops = getWorkshops();

  return (
    <DashboardLayout>
      <PageHeader title="Workshops" description="View all workshops on the platform." />

      {workshops.length === 0 ? (
        <div className="card">
          <EmptyState icon={<BookOpen className="w-6 h-6" />} title="No workshops" description="Workshops will appear here once mentors create them." />
        </div>
      ) : (
        <div className="space-y-4">
          {workshops.map((w) => {
            const mentor = getMentor(w.mentorId);
            const skill = getSkillById(w.skillId);
            return (
              <div key={w.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {skill && <Badge variant="brand">{skill.name}</Badge>}
                      <Badge variant={w.status === 'published' ? 'green' : 'gray'}>{w.status}</Badge>
                    </div>
                    <h3 className="font-semibold text-ink mb-1">{w.title}</h3>
                    <p className="text-sm text-ink-400 mb-3">{w.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-ink-400">
                      {mentor && <span>By {mentor.user.name}</span>}
                      <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {w.durationMinutes} min</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {w.registeredLearnerIds.length}/{w.capacity}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
