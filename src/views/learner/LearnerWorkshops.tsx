'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { WorkshopCard } from '@/components/workshops/WorkshopCard';
import { Tabs, EmptyState } from '@/components/ui';
import { BookOpen } from 'lucide-react';
import { getLearnerWorkshops, leaveLearnerWorkshop, registerLearnerForWorkshop } from '@/services/workshopService';
import type { Workshop } from '@/types';

export function LearnerWorkshopsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = useState('upcoming');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkshops = useCallback(async () => {
    const list = await getLearnerWorkshops();
    setWorkshops(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await loadWorkshops();
    };
    void run();
    return () => {
      active = false;
    };
  }, [loadWorkshops]);

  if (!user) return null;

  const registered = workshops.filter((w) => w.registeredLearnerIds.includes(user.id));
  const upcoming = workshops.filter((w) => w.status === 'published');
  const completed = workshops.filter((w) => w.status === 'completed');

  const displayed = tab === 'upcoming' ? upcoming : tab === 'registered' ? registered : completed;

  const handleRegisterToggle = async (workshopId: string) => {
    try {
      if (workshops.find((w) => w.id === workshopId)?.registeredLearnerIds.includes(user.id)) {
        await leaveLearnerWorkshop(user.id, workshopId);
        show('Unregistered from workshop.', 'info');
      } else {
        await registerLearnerForWorkshop(user.id, workshopId);
        show('Registered for workshop!', 'success');
      }
      await loadWorkshops();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update your registration.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Workshops" description="Discover and register for workshops hosted by mentors." />
      <div className="mb-6">
        <Tabs
          tabs={[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'registered', label: 'My Registrations' },
            { id: 'completed', label: 'Completed' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading workshops...</div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen className="w-6 h-6" />}
            title={tab === 'registered' ? 'No registrations yet' : tab === 'completed' ? 'No completed workshops' : 'No upcoming workshops'}
            description={tab === 'registered' ? 'Register for a workshop to see it here.' : 'Check back later for new workshops.'}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((w) => (
            <WorkshopCard
              key={w.id}
              workshop={w}
              isRegistered={w.registeredLearnerIds.includes(user.id)}
              onRegisterToggle={() => handleRegisterToggle(w.id)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
