'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { getSkillById, getMentor } from '@/services/dataService';
import { getLearnerWorkshops } from '@/services/workshopService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Workshop } from '@/types';

export function PublicWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getLearnerWorkshops().then((data) => {
      if (active) {
        setWorkshops(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PublicBrowseLayout
      title="Workshops"
      description="Upcoming and past workshops led by our mentors. Sign up to register and attend."
    >
      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading workshops...</div>
      ) : workshops.length === 0 ? (
        <div className="card p-12 text-center text-sm text-ink-300">No public workshops available at this time.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.map((w) => {
            const skill = getSkillById(w.skillId);
            const mentor = getMentor(w.mentorId);
            return (
              <div key={w.id} className="card p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  {skill && <Badge variant="brand">{skill.name}</Badge>}
                  {w.status === 'published' && <Badge variant="green">Upcoming</Badge>}
                  {w.status === 'completed' && <Badge variant="gray">Completed</Badge>}
                </div>
                <h3 className="font-semibold text-ink mb-2">{w.title}</h3>
                <p className="text-sm text-ink-400 mb-4 line-clamp-2">{w.description}</p>
                {mentor && (
                  <div className="flex items-center gap-2 mb-3">
                    {mentor.user.avatar && (
                      <Image
                        src={mentor.user.avatar}
                        alt={mentor.user.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <span className="text-sm text-ink-500">{mentor.user.name}</span>
                  </div>
                )}
                <div className="space-y-1.5 mb-4 text-sm text-ink-400">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {w.durationMinutes} minutes</div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4" /> {w.registeredLearnerIds.length}/{w.capacity} registered</div>
                </div>
                <div className="mt-auto">
                  <Link href="/register"><Button variant="secondary" fullWidth>Sign up to register</Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PublicBrowseLayout>
  );
}
