import type { TalentProfile, EmployerContactRequest, Skill, Mentor, User, LearnerProfile } from '@/types';
import { getDb, saveDb } from './dataService';

const CONTACTS_KEY = 'skillsphere_employer_contacts';

function loadContacts(): EmployerContactRequest[] {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (raw) return JSON.parse(raw) as EmployerContactRequest[];
  } catch {
    // fall through
  }
  return [];
}

function saveContacts(contacts: EmployerContactRequest[]): void {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch {
    // storage unavailable — keep in memory only
  }
}

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

export function searchTalent(query: string, skillId?: string): TalentProfile[] {
  let profiles = getTalentProfiles();
  if (query) {
    const q = query.toLowerCase();
    profiles = profiles.filter(
      (t) =>
        t.user.name.toLowerCase().includes(q) ||
        t.profile.bio.toLowerCase().includes(q) ||
        t.profile.location.toLowerCase().includes(q) ||
        t.profile.learningGoal.toLowerCase().includes(q) ||
        t.skills.some((s) => s.name.toLowerCase().includes(q))
    );
  }
  if (skillId) {
    profiles = profiles.filter((t) => t.profile.skillIds.includes(skillId));
  }
  return profiles;
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

export function createEmployerContactRequest(
  request: Omit<EmployerContactRequest, 'id' | 'createdAt' | 'status'>
): EmployerContactRequest | undefined {
  const talent = getTalentProfileById(request.learnerId);
  if (!talent) return undefined;

  const contacts = loadContacts();
  const newRequest: EmployerContactRequest = {
    ...request,
    id: `ecr-${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  contacts.push(newRequest);
  saveContacts(contacts);

  const db = getDb();
  db.notifications.push({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: request.learnerId,
    title: 'New Employer Contact Request',
    message: `${request.employerName} from ${request.companyName} is interested in connecting with you.`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();

  return newRequest;
}

export function getEmployerContactRequestsForLearner(learnerId: string): EmployerContactRequest[] {
  return loadContacts().filter((c) => c.learnerId === learnerId);
}
