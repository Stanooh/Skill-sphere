import type { TalentProfile, Skill, Mentor } from '@/types';
import { getDb } from './dataService';
import { getAcceptedRecommendationsForStudent } from './recommendationService';
export {
  createEmployerContactRequest,
  getEmployerContactRequestsForLearner,
  getAllEmployerContactRequests,
  updateContactRequestStatus,
} from './contactRequestService';

export function getTalentProfiles(): TalentProfile[] {
  const db = getDb();
  const approvedMentors = db.users
    .filter((u) => u.role === 'mentor')
    .map((user) => {
      const profile = db.mentorProfiles.find((p) => p.userId === user.id);
      if (!profile) return null;
      const skills = db.skills.filter((s) => profile.skillIds.includes(s.id));
      return { user, profile, skills } as Mentor;
    })
    .filter((m): m is Mentor => m !== null && m.profile.activated);

  const approvedMentorMap = new Map(approvedMentors.map((m) => [m.user.id, m]));

  return db.learnerProfiles
    .filter((p) => p.employerVisibility === true && p.profileComplete)
    .map((profile) => {
      const user = db.users.find((u) => u.id === profile.userId);
      if (!user) return null;
      const skills = db.skills.filter((s) => profile.skillIds.includes(s.id));
      const approvedMentorIds = profile.approvedMentorIds ?? [];
      const approvedMentorsForLearner = approvedMentorIds
        .map((id) => approvedMentorMap.get(id))
        .filter((m): m is Mentor => m !== undefined);
      return { user, profile, skills, approvedMentors: approvedMentorsForLearner };
    })
    .filter((t): t is TalentProfile => t !== null);
}

export function getTalentProfileById(userId: string): TalentProfile | undefined {
  return getTalentProfiles().find((t) => t.user.id === userId);
}

export interface TalentFilterOptions {
  query?: string;
  skillId?: string;
  careerArea?: string;
  sortBy?: 'recent' | 'skills' | 'recommended';
}

export function searchTalentWithOptions(options: TalentFilterOptions): TalentProfile[] {
  let profiles = getTalentProfiles();

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
    profiles.sort((a, b) => {
      const recsA = getAcceptedRecommendationsForStudent(a.user.id).length;
      const recsB = getAcceptedRecommendationsForStudent(b.user.id).length;
      return recsB - recsA;
    });
  } else {
    // recent by user.createdAt
    profiles.sort((a, b) => new Date(b.user.createdAt).getTime() - new Date(a.user.createdAt).getTime());
  }

  return profiles;
}

export function searchTalent(query: string, skillId?: string): TalentProfile[] {
  return searchTalentWithOptions({ query, skillId });
}

export function getTalentSkills(): Skill[] {
  const db = getDb();
  const visibleLearnerSkillIds = new Set(
    db.learnerProfiles
      .filter((p) => p.employerVisibility === true && p.profileComplete)
      .flatMap((p) => p.skillIds)
  );
  return db.skills.filter((s) => visibleLearnerSkillIds.has(s.id));
}
