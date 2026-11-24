import { createClient } from '@/lib/supabase/client';
import { getEligibleMentors } from '@/services/mentorProfileService';
import type { Mentor, SavedMentor } from '@/types';

type DbSavedMentor = {
  id: string;
  learner_id: string;
  mentor_id: string;
  created_at: string;
};

function mapSavedMentor(row: DbSavedMentor): SavedMentor {
  return {
    id: row.id,
    learnerId: row.learner_id,
    mentorId: row.mentor_id,
    savedAt: row.created_at,
  };
}

export async function getSavedMentors(learnerId: string): Promise<SavedMentor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('saved_mentors')
    .select('*')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[savedMentorService] getSavedMentors failed', error);
    return [];
  }
  return (data as DbSavedMentor[]).map(mapSavedMentor);
}

export async function getSavedMentorIds(learnerId: string): Promise<string[]> {
  const records = await getSavedMentors(learnerId);
  return records.map((r) => r.mentorId);
}

export async function getSavedMentorProfiles(learnerId: string): Promise<Mentor[]> {
  const [records, eligibleMentors] = await Promise.all([
    getSavedMentors(learnerId),
    getEligibleMentors(),
  ]);
  if (records.length === 0) return [];
  const byId = new Map(eligibleMentors.map((m) => [m.user.id, m]));
  return records
    .map((r) => byId.get(r.mentorId))
    .filter((m): m is Mentor => m !== undefined);
}

export async function isMentorSaved(learnerId: string, mentorId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('saved_mentors')
    .select('id')
    .eq('learner_id', learnerId)
    .eq('mentor_id', mentorId)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function saveMentor(learnerId: string, mentorId: string): Promise<SavedMentor> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('saved_mentors')
    .upsert(
      {
        learner_id: learnerId,
        mentor_id: mentorId,
      },
      { onConflict: 'learner_id,mentor_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to save mentor.');
  }
  return mapSavedMentor(data as DbSavedMentor);
}

export async function unsaveMentor(learnerId: string, mentorId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('saved_mentors')
    .delete()
    .eq('learner_id', learnerId)
    .eq('mentor_id', mentorId);

  if (error) {
    throw new Error(error.message || 'Failed to remove saved mentor.');
  }
}
