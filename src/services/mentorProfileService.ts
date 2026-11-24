import { createClient } from '@/lib/supabase/client';
import { getSkills } from '@/services/dataService';
import type {
  Availability,
  Mentor,
  MentorProfile,
  MentorRecommendation,
  Skill,
  User,
  WorkExperienceEntry,
  EducationEntry,
} from '@/types';

export interface VerifiedCompetency {
  skillId: string;
  skillName: string;
  status: string;
  reviewedAt?: string;
}

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
  avatar_url?: string | null;
  company?: string | null;
  work_experience?: WorkExperienceEntry[] | null;
  education_history?: EducationEntry[] | null;
  learner_levels?: string[] | null;
  mentorship_approach?: string | null;
  preferred_formats?: string[] | null;
  languages?: string[] | null;
  available_days?: string[] | null;
  preferred_time_slots?: string[] | null;
  timezone?: string | null;
  accepting_learners?: boolean | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  website_url?: string | null;
  published?: boolean | null;
  created_at: string;
  updated_at: string;
  profiles?: { id: string; full_name: string | null; email: string | null; avatar_url?: string | null } | null;
};

function reportError(operation: string, error: unknown): void {
  console.error(`[mentor-profile] ${operation} failed`, error);
}

function mapProfile(row: DbMentorProfile): MentorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    professionalTitle: row.professional_title ?? '',
    bio: row.bio ?? '',
    location: row.location ?? '',
    experienceYears: row.experience_years ?? 0,
    education: row.education ?? '',
    certifications: row.certifications ?? [],
    availability: row.availability ?? 'unavailable',
    mentorshipAreas: row.mentorship_areas ?? [],
    skillIds: row.skill_ids ?? [],
    rating: Number(row.rating) || 0,
    reviewCount: row.review_count ?? 0,
    profileComplete: row.profile_complete ?? false,
    activated: row.activated ?? false,
    avatarUrl: row.avatar_url ?? undefined,
    company: row.company ?? '',
    workExperience: row.work_experience ?? [],
    educationHistory: row.education_history ?? [],
    learnerLevels: row.learner_levels ?? [],
    mentorshipApproach: row.mentorship_approach ?? '',
    preferredFormats: row.preferred_formats ?? [],
    languages: row.languages ?? [],
    availableDays: row.available_days ?? [],
    preferredTimeSlots: row.preferred_time_slots ?? [],
    timezone: row.timezone ?? '',
    acceptingLearners: row.accepting_learners ?? true,
    linkedinUrl: row.linkedin_url ?? '',
    githubUrl: row.github_url ?? '',
    portfolioUrl: row.portfolio_url ?? '',
    websiteUrl: row.website_url ?? '',
    published: row.published ?? false,
  };
}

function formatSkillName(id: string): string {
  const clean = id.replace(/^skill-/, '').replace(/[-_]/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

async function loadAllSkillsFromDb(): Promise<Skill[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from('skills').select('id, name, category, related_skill_ids');
    if (data && data.length > 0) {
      return data.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        relatedSkillIds: s.related_skill_ids ?? [],
      }));
    }
  } catch {
    // fallback
  }
  return getSkills();
}

function mapMentor(row: DbMentorProfile, skillsCatalogue?: Skill[]): Mentor {
  const profile = mapProfile(row);
  const dbUser = row.profiles;
  const user: User = {
    id: row.user_id,
    role: 'mentor',
    name: dbUser?.full_name || dbUser?.email || 'Mentor',
    email: dbUser?.email || '',
    avatar: row.avatar_url || dbUser?.avatar_url || undefined,
    createdAt: row.created_at,
  };
  const catalogue = skillsCatalogue && skillsCatalogue.length > 0 ? skillsCatalogue : getSkills();
  const skills = profile.skillIds
    .map((skillId) => {
      const match = catalogue.find(
        (skill) => skill.id.toLowerCase() === skillId.toLowerCase() || skill.name.toLowerCase() === skillId.toLowerCase()
      );
      if (match) return match;
      return {
        id: skillId,
        name: formatSkillName(skillId),
        category: 'General',
      };
    })
    .filter((skill): skill is Skill => Boolean(skill));
  return { user, profile, skills };
}

export async function getMyMentorProfile(userId: string): Promise<MentorProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_profiles')
    .select('*, profiles(id, full_name, email, avatar_url)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    reportError('load profile', error);
    return null;
  }
  return data ? mapProfile(data as DbMentorProfile) : null;
}

/**
 * Loads previously verified competencies for this mentor from Supabase.
 */
export async function getMentorVerifiedCompetencies(userId: string): Promise<VerifiedCompetency[]> {
  const supabase = createClient();

  const { data: appData, error: appError } = await supabase
    .from('mentor_applications')
    .select('id, competency_verified, admin_approved')
    .eq('user_id', userId)
    .maybeSingle();

  if (appError || !appData) {
    return [];
  }

  const { data: skills, error: skillsError } = await supabase
    .from('mentor_application_skills')
    .select('skill_id, skill_name, status, reviewed_at')
    .eq('application_id', appData.id);

  if (skillsError || !skills) {
    return [];
  }

  return skills
    .filter((s) => s.status === 'verified' || s.status === 'approved' || appData.competency_verified)
    .map((s) => ({
      skillId: s.skill_id,
      skillName: s.skill_name,
      status: s.status,
      reviewedAt: s.reviewed_at ?? undefined,
    }));
}

export interface SaveMentorProfileInput {
  professionalTitle: string;
  bio: string;
  location: string;
  experienceYears: number;
  education?: string;
  certifications?: string[];
  availability?: Availability;
  mentorshipAreas?: string[];
  skillIds: string[];
  avatarUrl?: string;
  company?: string;
  workExperience?: WorkExperienceEntry[];
  educationHistory?: EducationEntry[];
  learnerLevels?: string[];
  mentorshipApproach?: string;
  preferredFormats?: string[];
  languages?: string[];
  availableDays?: string[];
  preferredTimeSlots?: string[];
  timezone?: string;
  acceptingLearners?: boolean;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
  publish?: boolean;
}

export async function saveMentorProfile(
  userId: string,
  fields: SaveMentorProfileInput
): Promise<{ profile: MentorProfile | null; error?: string }> {
  const supabase = createClient();

  // Validate mandatory fields for completion
  const hasTitle = fields.professionalTitle.trim().length > 0;
  const hasBio = fields.bio.trim().length > 0;
  const hasSkills = fields.skillIds.length > 0;
  const hasLocation = fields.location.trim().length > 0;

  const isComplete = hasTitle && hasBio && hasSkills && hasLocation;
  const shouldPublish = fields.publish === true;

  if (shouldPublish) {
    // Verify mentor eligibility before publishing
    const { data: appData } = await supabase
      .from('mentor_applications')
      .select('status, competency_verified, admin_approved')
      .eq('user_id', userId)
      .maybeSingle();

    if (!appData || appData.status !== 'approved' || !appData.competency_verified || !appData.admin_approved) {
      return {
        profile: null,
        error: 'You cannot publish your profile until competency verification and administrator approval are satisfied.',
      };
    }

    if (!isComplete) {
      return {
        profile: null,
        error: 'Please fill in all required fields (professional headline, bio, location, and at least one skill) before publishing.',
      };
    }
  }

  // Derive availability
  let availability: Availability = fields.availability ?? 'available';
  if (fields.acceptingLearners === false) {
    availability = 'unavailable';
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    professional_title: fields.professionalTitle.trim(),
    bio: fields.bio.trim(),
    location: fields.location.trim(),
    experience_years: fields.experienceYears,
    education: (fields.education ?? '').trim(),
    certifications: fields.certifications ?? [],
    availability,
    mentorship_areas: fields.mentorshipAreas ?? [],
    skill_ids: fields.skillIds,
    company: (fields.company ?? '').trim(),
    work_experience: fields.workExperience ?? [],
    education_history: fields.educationHistory ?? [],
    learner_levels: fields.learnerLevels ?? [],
    mentorship_approach: (fields.mentorshipApproach ?? '').trim(),
    preferred_formats: fields.preferredFormats ?? [],
    languages: fields.languages ?? [],
    available_days: fields.availableDays ?? [],
    preferred_time_slots: fields.preferredTimeSlots ?? [],
    timezone: (fields.timezone ?? '').trim(),
    accepting_learners: fields.acceptingLearners ?? true,
    linkedin_url: (fields.linkedinUrl ?? '').trim(),
    github_url: (fields.githubUrl ?? '').trim(),
    portfolio_url: (fields.portfolioUrl ?? '').trim(),
    website_url: (fields.websiteUrl ?? '').trim(),
    updated_at: new Date().toISOString(),
  };

  if (fields.avatarUrl) {
    payload.avatar_url = fields.avatarUrl;
  }

  if (shouldPublish) {
    payload.profile_complete = true;
    payload.activated = true;
    payload.published = true;
  } else if (fields.publish === false) {
    // Save draft - do not mark published
    payload.published = false;
    payload.profile_complete = isComplete;
  }

  const { data, error } = await supabase
    .from('mentor_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*, profiles(id, full_name, email, avatar_url)')
    .single();

  if (error || !data) {
    if (error) reportError('save profile', error);
    return { profile: null, error: error?.message || 'Failed to save mentor profile' };
  }

  return { profile: mapProfile(data as DbMentorProfile) };
}

export async function getEligibleMentors(): Promise<Mentor[]> {
  const supabase = createClient();
  const [mentorsResult, skillsList] = await Promise.all([
    supabase
      .from('mentor_profiles')
      .select('*, profiles!inner(id, full_name, email, avatar_url)')
      .eq('activated', true)
      .eq('profile_complete', true)
      .eq('published', true)
      .neq('availability', 'unavailable')
      .order('rating', { ascending: false }),
    loadAllSkillsFromDb(),
  ]);

  if (mentorsResult.error) {
    reportError('load eligible mentors', mentorsResult.error);
    return [];
  }
  return (mentorsResult.data as DbMentorProfile[]).map((row) => mapMentor(row, skillsList));
}

export async function getEligibleMentor(idOrUserId: string): Promise<Mentor | null> {
  const supabase = createClient();
  const [mentorResult, skillsList] = await Promise.all([
    (async () => {
      let { data } = await supabase
        .from('mentor_profiles')
        .select('*, profiles!inner(id, full_name, email, avatar_url)')
        .eq('user_id', idOrUserId)
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from('mentor_profiles')
          .select('*, profiles!inner(id, full_name, email, avatar_url)')
          .eq('id', idOrUserId)
          .maybeSingle();
        data = res.data;
      }
      return data;
    })(),
    loadAllSkillsFromDb(),
  ]);

  if (!mentorResult) return null;
  return mapMentor(mentorResult as DbMentorProfile, skillsList);
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
  const catalogue = await loadAllSkillsFromDb();
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
