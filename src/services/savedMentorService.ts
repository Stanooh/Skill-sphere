import { createClient } from '@/lib/supabase/client';
import type { SavedMentor } from '@/types';

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
    .insert({
      learner_id: learnerId,
      mentor_id: mentorId,
    })
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
