import { createClient } from '@/lib/supabase/client';
import { getSkills } from '@/services/dataService';
import type { Availability, Mentor, MentorProfile, MentorRecommendation, Skill, User } from '@/types';

type DbMentorProfile = {
  id: string;
  user_id: string;
  professional_title: string;
  bio: string;
  location: string;
  experience_years: number;
  education: string;
  certifications: string[];
  availability: Availability;
  mentorship_areas: string[];
  skill_ids: string[];
  rating: number;
  review_count: number;
  profile_complete: boolean;
  activated: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; full_name: string | null; email: string | null } | null;
};

function reportError(operation: string, error: unknown): void {
  console.error(`[mentor-profile] ${operation} failed`, error);
}

function mapProfile(row: DbMentorProfile): MentorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    professionalTitle: row.professional_title,
    bio: row.bio,
    location: row.location,
    experienceYears: row.experience_years,
    education: row.education,
    certifications: row.certifications ?? [],
    availability: row.availability,
    mentorshipAreas: row.mentorship_areas ?? [],
    skillIds: row.skill_ids ?? [],
    rating: row.rating,
    reviewCount: row.review_count,
    profileComplete: row.profile_complete,
    activated: row.activated,
  };
}

function mapMentor(row: DbMentorProfile): Mentor {
  const profile = mapProfile(row);
  const dbUser = row.profiles;
  const user: User = {
    id: row.user_id,
    role: 'mentor',
    name: dbUser?.full_name || dbUser?.email || 'Mentor',
    email: dbUser?.email || '',
    createdAt: row.created_at,
  };
  const catalogue = getSkills();
  const skills = profile.skillIds
    .map((skillId) => catalogue.find((skill) => skill.id === skillId))
    .filter((skill): skill is Skill => Boolean(skill));
  return { user, profile, skills };
}

export async function getMyMentorProfile(userId: string): Promise<MentorProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    reportError('load profile', error);
    return null;
  }
  return data ? mapProfile(data as DbMentorProfile) : null;
}

export async function saveMentorProfile(
  userId: string,
  fields: Pick<
    MentorProfile,
    | 'professionalTitle'
    | 'bio'
    | 'location'
    | 'experienceYears'
    | 'education'
    | 'certifications'
    | 'availability'
    | 'mentorshipAreas'
    | 'skillIds'
  >
): Promise<MentorProfile | null> {
  const complete =
    fields.professionalTitle.trim().length > 0 &&
    fields.bio.trim().length > 0 &&
    fields.skillIds.length > 0 &&
    fields.availability !== 'unavailable';
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_profiles')
    .upsert(
      {
        user_id: userId,
        professional_title: fields.professionalTitle.trim(),
        bio: fields.bio.trim(),
        location: fields.location.trim(),
        experience_years: fields.experienceYears,
        education: fields.education.trim(),
        certifications: fields.certifications,
        availability: fields.availability,
        mentorship_areas: fields.mentorshipAreas,
        skill_ids: fields.skillIds,
        profile_complete: complete,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    if (error) reportError('save profile', error);
    return null;
  }
  return mapProfile(data as DbMentorProfile);
}

export async function getEligibleMentors(): Promise<Mentor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*, profiles!inner(id, full_name, email)')
    .eq('activated', true)
    .eq('profile_complete', true)
    .neq('availability', 'unavailable')
    .order('rating', { ascending: false });

  if (error) {
    reportError('load eligible mentors', error);
    return [];
  }
  return (data as DbMentorProfile[]).map(mapMentor);
}

export async function getEligibleMentor(userId: string): Promise<Mentor | null> {
  const mentors = await getEligibleMentors();
  return mentors.find((mentor) => mentor.user.id === userId) ?? null;
}

export async function getLearnerProfileFromSupabase(userId: string): Promise<{ skillIds: string[] } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('learner_profiles')
    .select('skill_ids')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return { skillIds: (data.skill_ids as string[]) ?? [] };
}

export async function getRecommendedEligibleMentors(
  learnerSkillIdsOrUserId: string[] | string
): Promise<MentorRecommendation[]> {
  let learnerSkillIds: string[] = [];

  if (typeof learnerSkillIdsOrUserId === 'string') {
    const dbLearner = await getLearnerProfileFromSupabase(learnerSkillIdsOrUserId);
    if (dbLearner && dbLearner.skillIds && dbLearner.skillIds.length > 0) {
      learnerSkillIds = dbLearner.skillIds;
    } else {
      // Fallback to local profile if available
      try {
        const { getLearnerProfile } = await import('@/services/dataService');
        const local = getLearnerProfile(learnerSkillIdsOrUserId);
        learnerSkillIds = local?.skillIds ?? [];
      } catch {
        learnerSkillIds = [];
      }
    }
  } else {
    learnerSkillIds = learnerSkillIdsOrUserId;
  }

  const mentors = await getEligibleMentors();
  const catalogue = getSkills();
  const learnerSkillsSet = new Set(learnerSkillIds);

  // Map related skill IDs for fuzzy matching
  const relatedSkillMap = new Map<string, string[]>();
  for (const s of catalogue) {
    if (s.relatedSkillIds) {
      relatedSkillMap.set(s.id, s.relatedSkillIds);
    }
  }

  const recommendations = mentors
    .map((mentor) => {
      const exactMatchingSkills = mentor.skills.filter((skill) => learnerSkillsSet.has(skill.id));

      const relatedMatchingSkills = mentor.skills.filter((skill) => {
        if (learnerSkillsSet.has(skill.id)) return false;
        const related = relatedSkillMap.get(skill.id) ?? [];
        return related.some((rId) => learnerSkillsSet.has(rId));
      });

      const availabilityBonus =
        mentor.profile.availability === 'available' ? 15 : mentor.profile.availability === 'limited' ? 5 : 0;
      const ratingBonus = Math.round((mentor.profile.rating || 4.5) * 4);

      const matchScore =
        exactMatchingSkills.length * 25 +
        relatedMatchingSkills.length * 10 +
        availabilityBonus +
        ratingBonus;

      const allMatching = [...exactMatchingSkills, ...relatedMatchingSkills];

      const matchPercentage =
        learnerSkillsSet.size > 0
          ? Math.min(100, Math.round((exactMatchingSkills.length / learnerSkillsSet.size) * 100))
          : Math.min(100, Math.round(((mentor.profile.rating || 4.5) / 5) * 85));

      return {
        mentor,
        matchScore,
        matchingSkills: allMatching.length > 0 ? allMatching : mentor.skills.slice(0, 3),
        matchPercentage,
      };
    })
    .filter((rec) => {
      if (learnerSkillsSet.size === 0) return true; // show top-rated available mentors
      return rec.matchingSkills.length > 0 && rec.matchPercentage > 0;
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return recommendations;
}
