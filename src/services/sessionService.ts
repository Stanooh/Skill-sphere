import { createClient } from '@/lib/supabase/client';
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

function mapSession(row: DbSession): Session {
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
  };
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
  return (data as DbSession[]).map(mapSession);
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
  return (data as DbSession[]).map(mapSession);
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
  return (data as DbSession[]).map(mapSession);
}

export async function requestSession(input: {
  learnerId: string;
  mentorId: string;
  title: string;
  description?: string;
  scheduledDate: string;
  durationMinutes?: number;
}): Promise<Session> {
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
  return mapSession(data as DbSession);
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
  return mapSession(data as DbSession);
}
