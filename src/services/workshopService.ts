import { createClient } from '@/lib/supabase/client';
import type { Workshop, WorkshopStatus } from '@/types';

export type WorkshopInput = Omit<Workshop, 'id' | 'mentorId' | 'registeredLearnerIds' | 'status'>;

type DbWorkshop = {
  id: string;
  mentor_id: string;
  skill_id: string | null;
  title: string;
  description: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  capacity: number;
  status: WorkshopStatus;
  cover_image: string | null;
  format: 'online' | 'in_person' | undefined;
  meeting_link: string | null;
  workshop_registrations?: Array<{ learner_id: string }>;
};

function mapWorkshop(row: DbWorkshop): Workshop {
  const regIds = (row.workshop_registrations ?? []).map((r) => r.learner_id);
  return {
    id: row.id,
    mentorId: row.mentor_id,
    skillId: row.skill_id ?? '',
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    registeredLearnerIds: regIds,
    status: row.status,
    coverImage: row.cover_image ?? undefined,
    format: row.format ?? 'online',
    meetingLink: row.meeting_link ?? undefined,
  };
}

export async function getMentorWorkshops(mentorId: string): Promise<Workshop[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*, workshop_registrations(learner_id)')
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[workshopService] getMentorWorkshops failed', error);
    return [];
  }
  return (data as DbWorkshop[]).map(mapWorkshop);
}

export async function getLearnerWorkshops(): Promise<Workshop[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*, workshop_registrations(learner_id)')
    .in('status', ['published', 'completed'])
    .order('date', { ascending: true });

  if (error) {
    console.error('[workshopService] getLearnerWorkshops failed', error);
    return [];
  }
  return (data as DbWorkshop[]).map(mapWorkshop);
}

export async function getAllWorkshops(): Promise<Workshop[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*, workshop_registrations(learner_id)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[workshopService] getAllWorkshops failed', error);
    return [];
  }
  return (data as DbWorkshop[]).map(mapWorkshop);
}

export async function getWorkshopById(workshopId: string): Promise<Workshop | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workshops')
    .select('*, workshop_registrations(learner_id)')
    .eq('id', workshopId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapWorkshop(data as DbWorkshop);
}

export async function saveMentorWorkshop(
  mentorId: string,
  input: WorkshopInput,
  workshopId?: string
): Promise<Workshop> {
  const supabase = createClient();

  const payload = {
    mentor_id: mentorId,
    title: input.title,
    description: input.description,
    skill_id: input.skillId || null,
    date: input.date.includes('T') ? input.date.split('T')[0] : input.date,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    duration_minutes: input.durationMinutes || 60,
    capacity: input.capacity || 10,
    cover_image: input.coverImage || null,
    format: input.format || 'online',
    meeting_link: input.meetingLink || null,
    updated_at: new Date().toISOString(),
  };

  if (workshopId) {
    const { data, error } = await supabase
      .from('workshops')
      .update(payload)
      .eq('id', workshopId)
      .eq('mentor_id', mentorId)
      .select('*, workshop_registrations(learner_id)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update workshop.');
    }
    return mapWorkshop(data as DbWorkshop);
  } else {
    const { data, error } = await supabase
      .from('workshops')
      .insert({
        ...payload,
        status: 'draft',
      })
      .select('*, workshop_registrations(learner_id)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create workshop. Only approved mentors can create workshops.');
    }
    return mapWorkshop(data as DbWorkshop);
  }
}

export async function setMentorWorkshopStatus(
  mentorId: string,
  workshopId: string,
  status: Extract<WorkshopStatus, 'draft' | 'published' | 'cancelled'>
): Promise<Workshop> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workshops')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', workshopId)
    .eq('mentor_id', mentorId)
    .select('*, workshop_registrations(learner_id)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update workshop status.');
  }
  return mapWorkshop(data as DbWorkshop);
}

export async function removeMentorWorkshop(mentorId: string, workshopId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('workshops')
    .delete()
    .eq('id', workshopId)
    .eq('mentor_id', mentorId);

  if (error) {
    throw new Error(error.message || 'Failed to delete workshop.');
  }
}

export async function registerLearnerForWorkshop(
  learnerId: string,
  workshopId: string
): Promise<Workshop> {
  const supabase = createClient();
  const { error: regError } = await supabase
    .from('workshop_registrations')
    .insert({
      workshop_id: workshopId,
      learner_id: learnerId,
    });

  if (regError && !regError.message.includes('duplicate key')) {
    throw new Error(regError.message || 'Could not register for this workshop.');
  }

  const updated = await getWorkshopById(workshopId);
  if (!updated) throw new Error('Workshop not found.');
  return updated;
}

export async function leaveLearnerWorkshop(
  learnerId: string,
  workshopId: string
): Promise<Workshop> {
  const supabase = createClient();
  const { error: delError } = await supabase
    .from('workshop_registrations')
    .delete()
    .eq('workshop_id', workshopId)
    .eq('learner_id', learnerId);

  if (delError) {
    throw new Error(delError.message || 'Could not leave this workshop.');
  }

  const updated = await getWorkshopById(workshopId);
  if (!updated) throw new Error('Workshop not found.');
  return updated;
}
