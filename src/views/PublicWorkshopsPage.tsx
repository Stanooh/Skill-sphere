'use client';

import { useEffect, useState } from 'react';
import { PublicBrowseLayout } from '@/components/layout/PublicBrowseLayout';
import { WorkshopCard } from '@/components/workshops/WorkshopCard';
import { getLearnerWorkshops } from '@/services/workshopService';
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {workshops.map((w) => (
            <WorkshopCard key={w.id} workshop={w} publicView={true} />
          ))}
        </div>
      )}
    </PublicBrowseLayout>
  );
}
