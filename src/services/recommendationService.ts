import { createClient } from '@/lib/supabase/client';
import type { StudentRecommendation, RecommendationApprovalStatus } from '@/types';

type DbRecommendation = {
  id: string;
  mentor_id: string;
  student_id: string;
  strengths: string[];
  technical_skills: string[];
  communication_assessment: string;
  problem_solving_assessment: string;
  achievements: string[];
  career_areas: string[];
  recommendation: string;
  student_approval_status: RecommendationApprovalStatus;
  admin_action: 'none' | 'endorsed' | 'hidden' | 'flagged';
  created_at: string;
  updated_at: string;
};

function mapRec(row: DbRecommendation): StudentRecommendation {
  return {
    id: row.id,
    mentorId: row.mentor_id,
    studentId: row.student_id,
    strengths: row.strengths ?? [],
    technicalSkills: row.technical_skills ?? [],
    communicationAssessment: row.communication_assessment,
    problemSolvingAssessment: row.problem_solving_assessment,
    achievements: row.achievements ?? [],
    careerAreas: row.career_areas ?? [],
    recommendation: row.recommendation,
    studentApprovalStatus: row.student_approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const recCache = new Map<string, StudentRecommendation>();
let initialLoaded = false;

async function syncAllRecommendations(): Promise<void> {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_recommendations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return;
  for (const row of data as DbRecommendation[]) {
    recCache.set(row.id, mapRec(row));
  }
  initialLoaded = true;
}

function ensureSyncStarted() {
  if (!initialLoaded && typeof window !== 'undefined') {
    initialLoaded = true;
    void syncAllRecommendations();
  }
}

export function getRecommendationsForStudent(studentId: string): StudentRecommendation[] {
  ensureSyncStarted();
  return Array.from(recCache.values()).filter((r) => r.studentId === studentId);
}

export async function fetchRecommendationsForStudent(studentId: string): Promise<StudentRecommendation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_recommendations')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error || !data) return getRecommendationsForStudent(studentId);
  const list = (data as DbRecommendation[]).map(mapRec);
  for (const item of list) recCache.set(item.id, item);
  return list;
}

export function getRecommendationsForMentor(mentorId: string): StudentRecommendation[] {
  ensureSyncStarted();
  return Array.from(recCache.values()).filter((r) => r.mentorId === mentorId);
}

export async function fetchRecommendationsForMentor(mentorId: string): Promise<StudentRecommendation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_recommendations')
    .select('*')
    .eq('mentor_id', mentorId)
    .order('created_at', { ascending: false });

  if (error || !data) return getRecommendationsForMentor(mentorId);
  const list = (data as DbRecommendation[]).map(mapRec);
  for (const item of list) recCache.set(item.id, item);
  return list;
}

export function getAcceptedRecommendationsForStudent(studentId: string): StudentRecommendation[] {
  ensureSyncStarted();
  return Array.from(recCache.values()).filter(
    (r) => r.studentId === studentId && r.studentApprovalStatus === 'accepted'
  );
}

export async function fetchAcceptedRecommendationsForStudent(studentId: string): Promise<StudentRecommendation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_recommendations')
    .select('*')
    .eq('student_id', studentId)
    .eq('student_approval_status', 'accepted')
    .neq('admin_action', 'hidden')
    .order('created_at', { ascending: false });

  if (error || !data) return getAcceptedRecommendationsForStudent(studentId);
  const list = (data as DbRecommendation[]).map(mapRec);
  for (const item of list) recCache.set(item.id, item);
  return list;
}

export function getAllRecommendations(): StudentRecommendation[] {
  ensureSyncStarted();
  return Array.from(recCache.values());
}

export async function fetchAllRecommendations(): Promise<StudentRecommendation[]> {
  await syncAllRecommendations();
  return getAllRecommendations();
}

export function createRecommendation(
  data: Omit<StudentRecommendation, 'id' | 'createdAt' | 'updatedAt' | 'studentApprovalStatus'>
): StudentRecommendation | { error: string } {
  const tempId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newRec: StudentRecommendation = {
    ...data,
    id: tempId,
    studentApprovalStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  recCache.set(newRec.id, newRec);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void (async () => {
      try {
        const { data: inserted, error } = await supabase
          .from('student_recommendations')
          .insert({
            mentor_id: data.mentorId,
            student_id: data.studentId,
            strengths: data.strengths,
            technical_skills: data.technicalSkills,
            communication_assessment: data.communicationAssessment,
            problem_solving_assessment: data.problemSolvingAssessment,
            achievements: data.achievements,
            career_areas: data.careerAreas,
            recommendation: data.recommendation,
            student_approval_status: 'pending',
            admin_action: 'none',
          })
          .select('*')
          .single();

        if (inserted && !error) {
          recCache.delete(tempId);
          recCache.set(inserted.id, mapRec(inserted as DbRecommendation));

          // Notify student
          await supabase.from('notifications').insert({
            user_id: data.studentId,
            notification_type: 'recommendation_received',
            title: 'New Mentor Recommendation',
            message: 'A mentor has written a professional recommendation for your profile. Review and accept it to display it publicly.',
            event_key: `rec_received_${inserted.id}`,
            read: false,
          });
        }
      } catch (err) {
        console.error('[recommendationService] createRecommendation error:', err);
      }
    })();
  }

  return newRec;
}

export function updateRecommendation(
  recId: string,
  mentorId: string,
  updates: Partial<Omit<StudentRecommendation, 'id' | 'mentorId' | 'studentId' | 'createdAt'>>
): StudentRecommendation | { error: string } {
  const existing = recCache.get(recId);
  if (!existing) {
    return { error: 'Recommendation not found.' };
  }

  const updated: StudentRecommendation = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  recCache.set(recId, updated);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase
      .from('student_recommendations')
      .update({
        strengths: updated.strengths,
        technical_skills: updated.technicalSkills,
        communication_assessment: updated.communicationAssessment,
        problem_solving_assessment: updated.problemSolvingAssessment,
        achievements: updated.achievements,
        career_areas: updated.careerAreas,
        recommendation: updated.recommendation,
        updated_at: updated.updatedAt,
      })
      .eq('id', recId)
      .eq('mentor_id', mentorId);
  }

  return updated;
}

export function withdrawRecommendation(recId: string, mentorId: string): boolean {
  recCache.delete(recId);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase
      .from('student_recommendations')
      .delete()
      .eq('id', recId)
      .eq('mentor_id', mentorId);
  }

  return true;
}

export function adminDeleteRecommendation(recId: string): boolean {
  recCache.delete(recId);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase
      .from('student_recommendations')
      .delete()
      .eq('id', recId);
  }

  return true;
}

export async function updateStudentApproval(
  recId: string,
  studentId: string,
  status: RecommendationApprovalStatus
): Promise<StudentRecommendation | { error: string }> {
  const existing = recCache.get(recId);
  if (existing) {
    existing.studentApprovalStatus = status;
    existing.updatedAt = new Date().toISOString();
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('student_recommendations')
    .update({
      student_approval_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recId)
    .eq('student_id', studentId)
    .select('*')
    .single();

  if (error || !data) {
    return { error: error?.message || 'Failed to update approval status.' };
  }

  const mapped = mapRec(data as DbRecommendation);
  recCache.set(mapped.id, mapped);
  return mapped;
}
