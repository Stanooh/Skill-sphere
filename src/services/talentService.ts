import { createClient } from '@/lib/supabase/client';
import type { TalentProfile, Skill, User, LearnerProfile } from '@/types';

export {
  createEmployerContactRequest,
  getEmployerContactRequestsForLearner,
  getAllEmployerContactRequests,
  updateContactRequestStatus,
} from './contactRequestService';

let cachedTalent: TalentProfile[] = [];
let cacheLoaded = false;

interface DbLearnerProfile {
  id: string;
  user_id: string;
  bio: string;
  location: string;
  education: string;
  learning_goal: string;
  target_timeframe: string;
  available_hours_per_week: number;
  skill_ids: string[];
  skill_levels: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
  profile_complete: boolean;
  employer_visibility: boolean;
}

interface DbProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url?: string | null;
  created_at: string;
}

interface DbSkill {
  id: string;
  name: string;
  category: string;
}

export async function fetchTalentProfiles(): Promise<TalentProfile[]> {
  const supabase = createClient();

  const { data: lpData, error: lpError } = await supabase
    .from('learner_profiles')
    .select('*')
    .eq('employer_visibility', true)
    .eq('profile_complete', true);

  if (lpError || !lpData) {
    console.error('[talentService] fetchTalentProfiles error:', lpError);
    return cachedTalent;
  }

  const learnerRows = lpData as DbLearnerProfile[];
  if (learnerRows.length === 0) {
    cachedTalent = [];
    cacheLoaded = true;
    return [];
  }

  const userIds = learnerRows.map((r) => r.user_id);
  const allSkillIds = Array.from(new Set(learnerRows.flatMap((r) => r.skill_ids || [])));

  const [{ data: profilesData }, { data: skillsData }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', userIds),
    allSkillIds.length > 0 ? supabase.from('skills').select('*').in('id', allSkillIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profilesData as DbProfile[] || []).map((p) => [p.id, p]));
  const skillMap = new Map((skillsData as DbSkill[] || []).map((s) => [s.id, s]));

  const profiles: TalentProfile[] = [];

  for (const row of learnerRows) {
    const userRow = profileMap.get(row.user_id);
    if (!userRow) continue;

    const user: User = {
      id: userRow.id,
      name: userRow.full_name || 'Anonymous Student',
      email: userRow.email || '',
      role: 'learner',
      avatar: userRow.avatar_url || undefined,
      createdAt: userRow.created_at || new Date().toISOString(),
    };

    const learnerProfile: LearnerProfile = {
      id: row.id,
      userId: row.user_id,
      bio: row.bio || '',
      location: row.location || '',
      education: row.education || '',
      learningGoal: row.learning_goal || '',
      targetTimeframe: row.target_timeframe || '',
      availableHoursPerWeek: row.available_hours_per_week || 0,
      skillIds: row.skill_ids || [],
      skillLevels: row.skill_levels || {},
      profileComplete: row.profile_complete,
      employerVisibility: row.employer_visibility,
    };

    const learnerSkills: Skill[] = (row.skill_ids || [])
      .map((sid) => skillMap.get(sid))
      .filter((s): s is DbSkill => Boolean(s))
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
      }));

    profiles.push({
      user,
      profile: learnerProfile,
      skills: learnerSkills,
      approvedMentors: [],
    });
  }

  cachedTalent = profiles;
  cacheLoaded = true;
  return profiles;
}

export function getTalentProfiles(): TalentProfile[] {
  if (!cacheLoaded && typeof window !== 'undefined') {
    void fetchTalentProfiles();
  }
  return cachedTalent;
}

export async function getTalentProfileByIdAsync(userId: string): Promise<TalentProfile | null> {
  if (!cacheLoaded) {
    await fetchTalentProfiles();
  }
  const found = cachedTalent.find((t) => t.user.id === userId);
  if (found) return found;

  // Query directly if not found in cache
  const supabase = createClient();
  const { data: lpData } = await supabase
    .from('learner_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('employer_visibility', true)
    .maybeSingle();

  if (!lpData) return null;

  const row = lpData as DbLearnerProfile;
  const [{ data: userRow }, { data: skillsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    row.skill_ids?.length ? supabase.from('skills').select('*').in('id', row.skill_ids) : Promise.resolve({ data: [] }),
  ]);

  if (!userRow) return null;

  return {
    user: {
      id: userRow.id,
      name: userRow.full_name || 'Anonymous Student',
      email: userRow.email || '',
      role: 'learner',
      avatar: userRow.avatar_url || undefined,
      createdAt: userRow.created_at || new Date().toISOString(),
    },
    profile: {
      id: row.id,
      userId: row.user_id,
      bio: row.bio || '',
      location: row.location || '',
      education: row.education || '',
      learningGoal: row.learning_goal || '',
      targetTimeframe: row.target_timeframe || '',
      availableHoursPerWeek: row.available_hours_per_week || 0,
      skillIds: row.skill_ids || [],
      skillLevels: row.skill_levels || {},
      profileComplete: row.profile_complete,
      employerVisibility: row.employer_visibility,
    },
    skills: (skillsData as DbSkill[] || []).map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
    })),
    approvedMentors: [],
  };
}

export function getTalentProfileById(userId: string): TalentProfile | undefined {
  return cachedTalent.find((t) => t.user.id === userId);
}

export interface TalentFilterOptions {
  query?: string;
  skillId?: string;
  careerArea?: string;
  sortBy?: 'recent' | 'skills' | 'recommended';
}

export function searchTalentWithOptions(options: TalentFilterOptions): TalentProfile[] {
  let profiles = [...getTalentProfiles()];

  if (options.query) {
    const q = options.query.toLowerCase().trim();
    profiles = profiles.filter((t) => {
      const nameMatch = (t.user.name || '').toLowerCase().includes(q);
      const bioMatch = (t.profile.bio || '').toLowerCase().includes(q);
      const locMatch = (t.profile.location || '').toLowerCase().includes(q);
      const goalMatch = (t.profile.learningGoal || '').toLowerCase().includes(q);
      const skillMatch = t.skills.some((s) => (s.name || '').toLowerCase().includes(q));
      return nameMatch || bioMatch || locMatch || goalMatch || skillMatch;
    });
  }

  if (options.skillId) {
    profiles = profiles.filter((t) => t.profile.skillIds.includes(options.skillId!));
  }

  if (options.careerArea) {
    const areaLower = options.careerArea.toLowerCase();
    profiles = profiles.filter(
      (t) =>
        (t.profile.learningGoal || '').toLowerCase().includes(areaLower) ||
        (t.profile.bio || '').toLowerCase().includes(areaLower)
    );
  }

  if (options.sortBy === 'skills') {
    profiles.sort((a, b) => b.skills.length - a.skills.length);
  } else if (options.sortBy === 'recommended') {
    // Keep order stable
    profiles.sort((a, b) => b.skills.length - a.skills.length);
  } else {
    profiles.sort((a, b) => new Date(b.user.createdAt).getTime() - new Date(a.user.createdAt).getTime());
  }

  return profiles;
}

export function searchTalent(query: string, skillId?: string): TalentProfile[] {
  return searchTalentWithOptions({ query, skillId });
}

export function getTalentSkills(): Skill[] {
  const visibleLearnerSkillIds = new Set(
    cachedTalent.flatMap((t) => t.profile.skillIds)
  );
  const seen = new Set<string>();
  const list: Skill[] = [];
  for (const t of cachedTalent) {
    for (const s of t.skills) {
      if (visibleLearnerSkillIds.has(s.id) && !seen.has(s.id)) {
        seen.add(s.id);
        list.push(s);
      }
    }
  }
  return list;
}
