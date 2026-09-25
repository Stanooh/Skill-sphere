import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui';
import { Check, X, ClipboardList, CalendarDays, Clock } from 'lucide-react';
import { getSessionsForMentor, updateSessionStatus, getUserById } from '@/services/dataService';
import type { Session } from '@/types';

export function MentorRequestsPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) return null;

  const sessions = getSessionsForMentor(user.id);
  const pending = sessions.filter((s) => s.status === 'pending');
  const history = sessions.filter((s) => s.status !== 'pending');

  const handleAction = (session: Session, action: 'accepted' | 'declined') => {
    updateSessionStatus(session.id, action);
    show(`Session ${action === 'accepted' ? 'accepted' : 'declined'}.`, action === 'accepted' ? 'success' : 'info');
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout key={refreshKey}>
      <PageHeader title="Mentorship Requests" description="Review and respond to learner mentorship requests." />

      {pending.length === 0 ? (
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
            const learner = getUserById(session.learnerId);
            return (
              <div key={session.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {learner && <img src={learner.avatar} alt={learner.name} className="w-12 h-12 rounded-full" />}
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink">{session.title}</h3>
                      <p className="text-sm text-ink-400 mt-0.5">{session.description}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-ink-400">
                        {learner && <span>From {learner.name}</span>}
                        <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {new Date(session.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {session.durationMinutes} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleAction(session, 'accepted')}><Check className="w-4 h-4" /> Accept</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleAction(session, 'declined')}><X className="w-4 h-4" /> Decline</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ink mb-4">History</h2>
          <div className="space-y-3">
            {history.map((session) => {
              const learner = getUserById(session.learnerId);
              return (
                <div key={session.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-ink">{session.title}</h3>
                    <p className="text-sm text-ink-400">{learner?.name} • {new Date(session.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={session.status === 'accepted' ? 'green' : session.status === 'completed' ? 'gray' : 'red'}>
                    {session.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
