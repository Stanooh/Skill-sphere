'use client';

import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui';
import { Compass, MapPin, Star } from 'lucide-react';
import { getAllMentors, getWorkshopsForMentor, getSessionsForMentor } from '@/services/dataService';

export function AdminMentorsPage() {
  const mentors = getAllMentors();

  return (
    <DashboardLayout>
      <PageHeader title="Mentors" description="View all mentor profiles and activity." />

      {mentors.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Compass className="w-6 h-6" />} title="No mentors yet" description="Mentors will appear here once they register." />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {mentors.map((m) => {
            const workshops = getWorkshopsForMentor(m.user.id);
            const sessions = getSessionsForMentor(m.user.id);
            return (
              <div key={m.user.id} className="card p-5">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar src={m.user.avatar} name={m.user.name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">{m.user.name}</h3>
                    <p className="text-sm text-ink-400 truncate">{m.profile.professionalTitle}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.profile.location}</span>
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {m.profile.rating} ({m.profile.reviewCount})</span>
                    </div>
                  </div>
                  <Badge variant={m.profile.availability === 'available' ? 'green' : m.profile.availability === 'limited' ? 'amber' : 'red'}>
                    {m.profile.availability}
                  </Badge>
                </div>

                <p className="text-sm text-ink-400 mb-3 line-clamp-2">{m.profile.bio}</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {m.skills.slice(0, 5).map((s) => (
                    <Badge key={s.id} variant="brand">{s.name}</Badge>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-ink-50 text-center">
                  <div>
                    <p className="text-lg font-bold text-ink">{sessions.length}</p>
                    <p className="text-xs text-ink-400">Sessions</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink">{workshops.length}</p>
                    <p className="text-xs text-ink-400">Workshops</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ink">{m.profile.experienceYears}y</p>
                    <p className="text-xs text-ink-400">Experience</p>
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
