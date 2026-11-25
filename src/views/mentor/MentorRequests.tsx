'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui';
import { Check, X, ClipboardList, CalendarDays, Clock } from 'lucide-react';
import { getSessionsForMentor, subscribeToSessions, updateSessionStatus } from '@/services/sessionService';
import type { Session } from '@/types';

function MentorRequestsInner() {
  const { user } = useAuth();
  const { show } = useToast();
  const searchParams = useSearchParams();
  const targetRequestId = searchParams.get('requestId');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    const data = await getSessionsForMentor(user.id);
    setSessions(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const run = async () => {
      if (active) await loadRequests();
    };
    void run();

    const unsubscribe = subscribeToSessions('mentor_id', user.id, () => {
      void loadRequests();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, loadRequests]);

  if (!user) return null;

  const pending = sessions.filter((s) => s.status === 'pending');
  const referencedSession = targetRequestId
    ? sessions.find((s) => s.id === targetRequestId) ?? null
    : null;

  const handleAction = async (session: Session, action: 'accepted' | 'declined') => {
    setActingId(session.id);
    try {
      await updateSessionStatus(session.id, action);
      show(`Session ${action === 'accepted' ? 'accepted' : 'declined'}.`, action === 'accepted' ? 'success' : 'info');
      await loadRequests();
    } catch (err) {
      console.error(err);
      show('Failed to update session.', 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Mentorship Requests" description="Review and respond to learner mentorship requests." />

      {!loading && targetRequestId && (!referencedSession || referencedSession.status !== 'pending') && (
        <div className="card p-4 mb-6 border-brand/30 bg-brand-50/20 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-500">
            {!referencedSession
              ? 'The referenced mentorship request could not be found or is no longer available.'
              : `Referenced request "${referencedSession.title}" is already ${referencedSession.status}.`}
          </p>
          {referencedSession && <Badge variant="gray">{referencedSession.status}</Badge>}
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-sm text-ink-300">Loading requests...</div>
      ) : pending.length === 0 ? (
        <div className="card mb-8">
          <EmptyState
            icon={<ClipboardList className="w-6 h-6" />}
            title="No pending requests"
            description="When learners request mentorship sessions, they'll appear here for you to review."
          />
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-ink">Pending ({pending.length})</h2>
          {pending.map((session) => {
            const learnerName = session.learnerName || 'SkillSphere Learner';
            const isActing = actingId === session.id;
            const isHighlighted = targetRequestId === session.id;
            return (
              <div
                key={session.id}
                className={`card p-5 transition-all ${
                  isHighlighted ? 'ring-2 ring-brand border-brand' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <Avatar src={session.learnerAvatar} name={learnerName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">{session.title}</h3>
                        {isHighlighted && <Badge variant="brand">Selected</Badge>}
                      </div>
                      {session.description && (
                        <p className="text-sm text-ink-400 mt-0.5 break-words">{session.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-ink-400">
                        <span>From <strong className="font-medium text-ink">{learnerName}</strong></span>
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
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" disabled={isActing} onClick={() => handleAction(session, 'accepted')}>
                      <Check className="w-4 h-4" /> Accept
                    </Button>
                    <Button variant="secondary" size="sm" disabled={isActing} onClick={() => handleAction(session, 'declined')}>
                      <X className="w-4 h-4" /> Decline
                    </Button>
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

export function MentorRequestsPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="card p-12 text-center text-sm text-ink-300">Loading requests...</div></DashboardLayout>}>
      <MentorRequestsInner />
    </Suspense>
  );
}
