import type {
  EvidenceType,
  IdentityVerification,
  MentorVerificationApplication,
  ReviewDecision,
  SkillVerification,
  VerificationEvidence,
  VerificationHistoryEntry,
  VerificationStatus,
} from '@/types';
import { getAllMentors, getSkills, getMentor } from '@/services/dataService';

const STORAGE_KEY = 'skillsphere_verification';
let memory: MentorVerificationApplication[] | null = null;

function now(): string {
  return new Date().toISOString();
}

function history(action: string, actor: string, note?: string): VerificationHistoryEntry {
  return { id: `verification-history-${Date.now()}-${Math.random()}`, action, actor, timestamp: now(), note };
}

function defaultApplication(mentorId: string): MentorVerificationApplication {
  const mentor = getMentor(mentorId);
  const skills = mentor?.skills ?? [];
  return {
    id: `verification-${mentorId}`,
    mentorId,
    professionalHeadline: mentor?.profile.professionalTitle ?? '',
    biography: mentor?.profile.bio ?? '',
    location: mentor?.profile.location ?? '',
    profilePhoto: mentor?.user.avatar,
    identity: { status: 'not-submitted', legalName: mentor?.user.name ?? '' },
    skills: skills.map((skill) => ({
      id: `skill-verification-${mentorId}-${skill.id}`,
      skillId: skill.id,
      status: 'not-submitted',
      evidence: [],
    })),
    selectedSkillIds: skills.map((skill) => skill.id),
    overallStatus: 'not-submitted',
    updatedAt: now(),
    history: [],
  };
}

function save(): void {
  if (!memory) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); } catch { /* prototype continues in memory */ }
}

function load(): MentorVerificationApplication[] {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) memory = (parsed as MentorVerificationApplication[]).map((application) => ({ ...application, selectedSkillIds: application.selectedSkillIds ?? application.skills.map((skill) => skill.skillId) }));
    }
  } catch { /* use defaults */ }
  memory ??= getAllMentors().map((mentor) => defaultApplication(mentor.user.id));
  save();
  return memory;
}

function ensureSkill(application: MentorVerificationApplication, skillId: string): SkillVerification {
  const existing = application.skills.find((skill) => skill.skillId === skillId);
  if (existing) return existing;
  const created: SkillVerification = {
    id: `skill-verification-${application.mentorId}-${skillId}`,
    skillId,
    status: 'not-submitted',
    evidence: [],
  };
  application.skills.push(created);
  return created;
}

function updateApplication(application: MentorVerificationApplication): MentorVerificationApplication {
  application.updatedAt = now();
  save();
  return application;
}

export function getVerificationApplications(): MentorVerificationApplication[] {
  return load();
}

export function getVerificationApplication(mentorId: string): MentorVerificationApplication {
  const applications = load();
  let application = applications.find((item) => item.mentorId === mentorId);
  if (!application) {
    application = defaultApplication(mentorId);
    applications.push(application);
    save();
  }
  return application;
}

export function updateVerificationProfile(
  mentorId: string,
  updates: Pick<MentorVerificationApplication, 'professionalHeadline' | 'biography' | 'location' | 'linkedIn' | 'github' | 'portfolio' | 'profilePhoto'>,
): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  Object.assign(application, updates);
  return updateApplication(application);
}

export function setVerificationSkills(mentorId: string, skillIds: string[]): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  const selected = new Set(skillIds);
  application.selectedSkillIds = [...selected];
  for (const skillId of skillIds) ensureSkill(application, skillId);
  return updateApplication(application);
}

export function addVerificationEvidence(mentorId: string, skillId: string, evidence: Omit<VerificationEvidence, 'id' | 'submittedAt'>): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  const skill = ensureSkill(application, skillId);
  skill.evidence.push({ ...evidence, id: `evidence-${Date.now()}`, submittedAt: now() });
  if (skill.status === 'not-submitted' || skill.status === 'needs-evidence' || skill.status === 'rejected') skill.status = 'pending';
  application.history.unshift(history(`Evidence added for ${getSkills().find((item) => item.id === skillId)?.name ?? 'skill'}`, mentorId));
  return updateApplication(application);
}

export function addIdentityEvidence(
  mentorId: string,
  input: { legalName: string; evidenceType: IdentityVerification['evidenceType']; evidence: Omit<VerificationEvidence, 'id' | 'submittedAt'> },
): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  application.identity = {
    ...application.identity,
    legalName: input.legalName,
    evidenceType: input.evidenceType,
    evidence: { ...input.evidence, id: `identity-evidence-${Date.now()}`, submittedAt: now() },
    status: 'pending',
    feedback: undefined,
  };
  application.history.unshift(history('Identity evidence submitted', mentorId));
  return updateApplication(application);
}

export function submitVerificationApplication(mentorId: string): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  const hasPendingEvidence = application.identity.status === 'pending' || application.skills.some((skill) => skill.status === 'pending');
  if (!hasPendingEvidence) return application;
  application.overallStatus = 'pending';
  application.submittedAt ??= now();
  application.history.unshift(history('Application submitted', mentorId));
  return updateApplication(application);
}

export function reviewIdentity(mentorId: string, decision: ReviewDecision, feedback: string, reviewer: string): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  const status: VerificationStatus = decision === 'approve' ? 'verified' : decision === 'reject' ? 'rejected' : 'needs-evidence';
  application.identity.status = status;
  application.identity.feedback = feedback;
  application.identity.reviewedAt = now();
  application.identity.reviewerNotes = feedback;
  application.history.unshift(history(`Identity ${status}`, reviewer, feedback));
  return updateApplication(application);
}

export function reviewSkill(mentorId: string, skillId: string, decision: ReviewDecision, feedback: string, reviewer: string): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  const skill = ensureSkill(application, skillId);
  const status: VerificationStatus = decision === 'approve' ? 'verified' : decision === 'reject' ? 'rejected' : 'needs-evidence';
  skill.status = status;
  skill.feedback = feedback;
  skill.reviewedAt = now();
  skill.reviewerNotes = feedback;
  const skillName = getSkills().find((item) => item.id === skillId)?.name ?? 'skill';
  application.history.unshift(history(`${skillName} competency ${status}`, reviewer, feedback));
  return updateApplication(application);
}

export function setApplicationStatus(mentorId: string, status: VerificationStatus, reviewer: string, note?: string): MentorVerificationApplication {
  const application = getVerificationApplication(mentorId);
  application.overallStatus = status;
  application.reviewerNotes = note;
  application.history.unshift(history(`Application ${status}`, reviewer, note));
  return updateApplication(application);
}

export function resetVerificationData(): void {
  memory = getAllMentors().map((mentor) => defaultApplication(mentor.user.id));
  save();
}

export const evidenceTypeLabels: Record<EvidenceType, string> = {
  certificate: 'Certificate or qualification',
  github: 'GitHub repository',
  portfolio: 'Portfolio project',
  experience: 'Professional experience',
  'work-sample': 'Work sample',
  reference: 'Reference or testimonial',
  assessment: 'Practical assessment',
  'sample-lesson': 'Sample lesson',
};
