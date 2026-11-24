'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Tabs } from '@/components/ui';
import { CalendarDays, Clock } from 'lucide-react';
import { getSessionsForMentor } from '@/services/sessionService';
import type { Session, SessionStatus } from '@/types';

const statusConfig: Record<SessionStatus, { label: string; variant: 'amber' | 'green' | 'red' | 'gray' }> = {
  pending: { label: 'Pending', variant: 'amber' },
  accepted: { label: 'Confirmed', variant: 'green' },
  declined: { label: 'Declined', variant: 'red' },
  completed: { label: 'Completed', variant: 'gray' },
  cancelled: { label: 'Cancelled', variant: 'red' },
};

export function MentorSessionsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getSessionsForMentor(user.id).then((data) => {
      if (active) {
        setSessions(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const upcoming = sessions.filter((s) => s.status === 'accepted' || s.status === 'pending');
  const completed = sessions.filter((s) => s.status === 'completed');
  const cancelled = sessions.filter((s) => s.status === 'declined' || s.status === 'cancelled');

  const displayed = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : cancelled;

  return (
    <DashboardLayout>
      <PageHeader title="Sessions" description="View all your mentorship sessions." />
      <div className="mb-6 overflow-x-auto">
        <Tabs
          tabs={[
            { id: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { id: 'completed', label: `Completed (${completed.length})` },
            { id: 'cancelled', label: `Cancelled (${cancelled.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading sessions...</div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CalendarDays className="w-6 h-6" />}
            title="No sessions"
            description="Sessions will appear here once they're scheduled."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((session) => {
            const learnerName = session.learnerName || 'SkillSphere Learner';
            const cfg = statusConfig[session.status];
            return (
              <div key={session.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar src={session.learnerAvatar} name={learnerName} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ink">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-ink-400 mt-0.5 break-words">{session.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-ink-400">
                        <span>with <strong className="font-medium text-ink">{learnerName}</strong></span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4" />{' '}
                          {new Date(session.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {session.durationMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
