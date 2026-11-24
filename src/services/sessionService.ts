import { createClient } from '@/lib/supabase/client';
import { createNotification } from '@/services/notificationService';
import type { Session, SessionStatus } from '@/types';

type DbSession = {
  id: string;
  learner_id: string;
  mentor_id: string;
  title: string;
  description: string;
  scheduled_date: string;
  duration_minutes: number;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
};

type DbProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function mapSession(row: DbSession, profilesById?: Map<string, DbProfileMini>): Session {
  const learner = profilesById?.get(row.learner_id);
  const mentor = profilesById?.get(row.mentor_id);
  return {
    id: row.id,
    learnerId: row.learner_id,
    mentorId: row.mentor_id,
    title: row.title,
    description: row.description,
    scheduledDate: row.scheduled_date,
    durationMinutes: row.duration_minutes,
    status: row.status,
    createdAt: row.created_at,
    learnerName: learner?.full_name || undefined,
    learnerAvatar: learner?.avatar_url || undefined,
    mentorName: mentor?.full_name || undefined,
    mentorAvatar: mentor?.avatar_url || undefined,
  };
}

async function enrichSessions(rows: DbSession[]): Promise<Session[]> {
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.flatMap((r) => [r.learner_id, r.mentor_id])));
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', ids);

  const map = new Map<string, DbProfileMini>();
  for (const p of (profiles ?? []) as DbProfileMini[]) {
    map.set(p.id, p);
  }
  return rows.map((row) => mapSession(row, map));
}

export async function getSessionsForLearner(learnerId: string): Promise<Session[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('learner_id', learnerId)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('[sessionService] getSessionsForLearner failed', error);
    return [];
  }
  return enrichSessions(data as DbSession[]);
}

export async function getSessionsForMentor(mentorId: string): Promise<Session[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('mentor_id', mentorId)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('[sessionService] getSessionsForMentor failed', error);
    return [];
  }
  return enrichSessions(data as DbSession[]);
}

export async function getAllSessions(): Promise<Session[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('scheduled_date', { ascending: false });

  if (error) {
    console.error('[sessionService] getAllSessions failed', error);
    return [];
  }
  return enrichSessions(data as DbSession[]);
}

export async function getActiveSessionWithMentor(
  learnerId: string,
  mentorId: string
): Promise<Session | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('learner_id', learnerId)
    .eq('mentor_id', mentorId)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapSession(data as DbSession);
}

export async function requestSession(input: {
  learnerId: string;
  mentorId: string;
  title: string;
  description?: string;
  scheduledDate: string;
  durationMinutes?: number;
  learnerName?: string;
}): Promise<Session> {
  const existing = await getActiveSessionWithMentor(input.learnerId, input.mentorId);
  if (existing) {
    throw new Error(
      existing.status === 'pending'
        ? 'You already have a pending mentorship request with this mentor.'
        : 'You already have an accepted mentorship session with this mentor.'
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      learner_id: input.learnerId,
      mentor_id: input.mentorId,
      title: input.title,
      description: input.description || '',
      scheduled_date: input.scheduledDate,
      duration_minutes: input.durationMinutes || 45,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not request mentorship session.');
  }

  const session = mapSession(data as DbSession);

  // Non-blocking notification to mentor
  try {
    const sender = input.learnerName ? `${input.learnerName} ` : 'A learner ';
    await createNotification({
      userId: input.mentorId,
      type: 'mentorship_request',
      title: 'New Mentorship Request',
      message: `${sender}requested a session: "${input.title}".`,
      entityId: session.id,
    });
  } catch {
    // Non-blocking
  }

  return session;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<Session> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update session status.');
  }

  const session = mapSession(data as DbSession);

  if (status === 'accepted' || status === 'declined') {
    try {
      await createNotification({
        userId: session.learnerId,
        type: status === 'accepted' ? 'session_accepted' : 'session_declined',
        title: status === 'accepted' ? 'Mentorship Request Accepted' : 'Mentorship Request Declined',
        message:
          status === 'accepted'
            ? `Your mentorship request "${session.title}" was accepted.`
            : `Your mentorship request "${session.title}" was declined.`,
        entityId: session.id,
      });
    } catch {
      // Non-blocking
    }
  }

  return session;
}
