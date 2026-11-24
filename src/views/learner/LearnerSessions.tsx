'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState, Tabs } from '@/components/ui';
import { CalendarDays, Clock, Video, X } from 'lucide-react';
import { getSessionsForLearner, updateSessionStatus } from '@/services/sessionService';
import type { Session, SessionStatus } from '@/types';
import Link from 'next/link';

const statusConfig: Record<SessionStatus, { label: string; variant: 'amber' | 'green' | 'red' | 'gray' }> = {
  pending: { label: 'Pending', variant: 'amber' },
  accepted: { label: 'Accepted', variant: 'green' },
  declined: { label: 'Rejected', variant: 'red' },
  completed: { label: 'Completed', variant: 'gray' },
  cancelled: { label: 'Cancelled', variant: 'red' },
};

export function LearnerSessionsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = useState('upcoming');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    const data = await getSessionsForLearner(user.id);
    setSessions(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await loadSessions();
    };
    void run();
    return () => {
      active = false;
    };
  }, [loadSessions]);

  if (!user) return null;

  const handleCancel = async (sessionId: string) => {
    setCancellingId(sessionId);
    try {
      await updateSessionStatus(sessionId, 'cancelled');
      show('Mentorship request cancelled.', 'info');
      await loadSessions();
    } catch (err) {
      console.error(err);
      show('Failed to cancel request.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const upcoming = sessions.filter((s) => s.status === 'pending' || s.status === 'accepted');
  const completed = sessions.filter((s) => s.status === 'completed');
  const cancelled = sessions.filter((s) => s.status === 'declined' || s.status === 'cancelled');

  const displayed = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : cancelled;

  return (
    <DashboardLayout>
      <PageHeader title="My Sessions" description="View and manage your mentorship requests and sessions." />
      <div className="mb-6 overflow-x-auto">
        <Tabs
          tabs={[
            { id: 'upcoming', label: `Active (${upcoming.length})` },
            { id: 'completed', label: `Completed (${completed.length})` },
            { id: 'cancelled', label: `Declined / Cancelled (${cancelled.length})` },
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
            title="No sessions here"
            description="Request a mentorship session with a mentor to get started."
            action={<Link href="/learner/mentors"><Button>Find Mentors</Button></Link>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((session) => {
            const mentorName = session.mentorName || 'SkillSphere Mentor';
            const cfg = statusConfig[session.status];
            return (
              <div key={session.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Link href={`/learner/mentors/${session.mentorId}`} className="shrink-0">
                      <Avatar src={session.mentorAvatar} name={mentorName} size="md" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">{session.title}</h3>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-ink-400 mt-0.5 break-words">{session.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-ink-400">
                        <Link href={`/learner/mentors/${session.mentorId}`} className="hover:text-brand font-medium">
                          with {mentorName}
                        </Link>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(session.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {session.durationMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {session.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={cancellingId === session.id}
                        onClick={() => handleCancel(session.id)}
                      >
                        <X className="w-4 h-4" /> Cancel Request
                      </Button>
                    )}
                    {session.status === 'accepted' && (
                      <>
                        <Link href={`/learner/mentors/${session.mentorId}`}>
                          <Button size="sm" variant="secondary">Rate Mentor</Button>
                        </Link>
                        <Link href={`/learner/messages?mentorId=${session.mentorId}`}>
                          <Button size="sm" variant="secondary" className="gap-1.5">
                            <Video className="w-4 h-4" />
                            Message
                          </Button>
                        </Link>
                      </>
                    )}
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
