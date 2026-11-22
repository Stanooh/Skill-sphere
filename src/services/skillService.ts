import { createClient } from '@/lib/supabase/client';
import { getSkills as getLocalSkills } from '@/services/dataService';
import { getEligibleMentors } from '@/services/mentorProfileService';
import type { Skill } from '@/types';

export interface SkillWithMentorCount extends Skill {
  mentorCount: number;
}

/**
 * Loads skills and their dynamic mentor counts from Supabase.
 * Only verified & eligible mentors (activated, profile complete, available) are counted.
 */
export async function getDynamicSkillsWithMentorCounts(): Promise<SkillWithMentorCount[]> {
  const supabase = createClient();

  // 1. Try RPC function if available in database
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_skills_with_mentor_counts');

    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData.map(
        (row: {
          skill_id: string;
          skill_name: string;
          category: string;
          mentor_count: number | string;
        }) => ({
          id: row.skill_id,
          name: row.skill_name,
          category: row.category,
          mentorCount: Number(row.mentor_count || 0),
        })
      );
    }
  } catch (err) {
    console.warn('[skillService] RPC get_skills_with_mentor_counts not available, using fallback query', err);
  }

  // 2. Fallback: Query Supabase skills table or fallback to catalogue, then compute counts from eligible mentors
  let baseSkills: Skill[] = [];
  try {
    const { data: skillsData } = await supabase.from('skills').select('*');
    if (skillsData && skillsData.length > 0) {
      baseSkills = skillsData.map(
        (s: { id: string; name: string; category: string; related_skill_ids?: string[] }) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          relatedSkillIds: s.related_skill_ids ?? [],
        })
      );
    }
  } catch {
    // ignore
  }

  if (baseSkills.length === 0) {
    baseSkills = getLocalSkills();
  }

  // 3. Compute counts using verified eligible mentors from Supabase
  const eligibleMentors = await getEligibleMentors();

  return baseSkills.map((skill) => {
    const mentorCount = eligibleMentors.filter(
      (m) =>
        m.profile.skillIds.includes(skill.id) ||
        m.skills.some((ms) => ms.id === skill.id)
    ).length;

    return {
      ...skill,
      mentorCount,
    };
  });
}
