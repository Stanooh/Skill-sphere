'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { WorkshopCard } from '@/components/workshops/WorkshopCard';
import { Tabs, EmptyState } from '@/components/ui';
import { BookOpen } from 'lucide-react';
import { getLearnerWorkshops, leaveLearnerWorkshop, registerLearnerForWorkshop } from '@/services/workshopService';

export function LearnerWorkshopsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = useState('upcoming');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const workshops = getLearnerWorkshops();
  const registered = workshops.filter((w) => w.registeredLearnerIds.includes(user.id));
  const upcoming = workshops.filter((w) => w.status === 'published');
  const completed = workshops.filter((w) => w.status === 'completed');

  const displayed = tab === 'upcoming' ? upcoming : tab === 'registered' ? registered : completed;

  const handleRegisterToggle = (workshopId: string) => {
    try {
      if (workshops.find((w) => w.id === workshopId)?.registeredLearnerIds.includes(user.id)) {
        leaveLearnerWorkshop(user.id, workshopId);
        show('Unregistered from workshop.', 'info');
      } else {
        registerLearnerForWorkshop(user.id, workshopId);
        show('Registered for workshop!', 'success');
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update your registration.', 'error');
    }
  };

  return (
    <DashboardLayout key={refreshKey}>
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

      {displayed.length === 0 ? (
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
