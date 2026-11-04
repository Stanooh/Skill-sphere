import type {
  MentorApplication,
  MentorApplicationSkill,
  MentorApplicationEvidence,
  MentorApplicationStatus,
  MentorApplicationWithDetails,
  MentorVerificationHistoryDB,
} from '@/types';
import { pushNotification, setUserRole, getMentorProfile, getDb, saveDb, updateMentorProfile } from '@/services/dataService';

const APPS_KEY = 'skillsphere_mentor_applications';
const SKILLS_KEY = 'skillsphere_mentor_app_skills';
const HISTORY_KEY = 'skillsphere_mentor_app_history';

interface AppRow {
  id: string;
  user_id: string;
  status: MentorApplicationStatus;
  professional_headline: string;
  biography: string;
  location: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  identity_verified: boolean;
  competency_verified: boolean;
  admin_approved: boolean;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SkillRow {
  id: string;
  application_id: string;
  skill_id: string;
  skill_name: string;
  evidence_data: MentorApplicationEvidence[];
  status: 'not-submitted' | 'pending' | 'verified' | 'rejected' | 'needs-evidence';
  feedback: string | null;
  reviewed_at: string | null;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getAppRows(): AppRow[] {
  return readJSON<AppRow[]>(APPS_KEY, []);
}
function getSkillRows(): SkillRow[] {
  return readJSON<SkillRow[]>(SKILLS_KEY, []);
}
function getHistoryRows(): MentorVerificationHistoryDB[] {
  return readJSON<MentorVerificationHistoryDB[]>(HISTORY_KEY, []);
}

function rowToApp(row: AppRow): MentorApplication {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    professionalHeadline: row.professional_headline,
    biography: row.biography,
    location: row.location,
    linkedinUrl: row.linkedin_url ?? undefined,
    githubUrl: row.github_url ?? undefined,
    portfolioUrl: row.portfolio_url ?? undefined,
    identityVerified: row.identity_verified,
    competencyVerified: row.competency_verified,
    adminApproved: row.admin_approved,
    rejectionReason: row.rejection_reason ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSkill(row: SkillRow): MentorApplicationSkill {
  return {
    id: row.id,
    applicationId: row.application_id,
    skillId: row.skill_id,
    skillName: row.skill_name,
    evidenceData: row.evidence_data,
    status: row.status,
    feedback: row.feedback ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('skillsphere_session');
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    return userId;
  } catch {
    return null;
  }
}

function addHistory(applicationId: string, action: string, note?: string): void {
  const rows = getHistoryRows();
  const userId = getCurrentUserId();
  rows.push({
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    application_id: applicationId,
    action,
    actor_id: userId,
    note: note ?? null,
    created_at: new Date().toISOString(),
  });
  writeJSON(HISTORY_KEY, rows);
}

// --- Applicant-facing functions ---

export async function getMyApplication(): Promise<MentorApplication | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  const rows = getAppRows();
  const row = rows.find((r) => r.user_id === userId);
  return row ? rowToApp(row) : null;
}

export async function getMyApplicationSkills(applicationId: string): Promise<MentorApplicationSkill[]> {
  const rows = getSkillRows();
  return rows.filter((r) => r.application_id === applicationId).map(rowToSkill);
}

export async function createOrUpdateApplication(
  applicationId: string | null,
  fields: {
    professionalHeadline: string;
    biography: string;
    location: string;
    linkedinUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  }
): Promise<MentorApplication | null> {
  const userId = getCurrentUserId();
  if (!userId) return null;
  const rows = getAppRows();
  const now = new Date().toISOString();

  if (applicationId) {
    const idx = rows.findIndex((r) => r.id === applicationId);
    if (idx === -1) return null;
    rows[idx] = {
      ...rows[idx],
      professional_headline: fields.professionalHeadline,
      biography: fields.biography,
      location: fields.location,
      linkedin_url: fields.linkedinUrl ?? null,
      github_url: fields.githubUrl ?? null,
      portfolio_url: fields.portfolioUrl ?? null,
      updated_at: now,
    };
    writeJSON(APPS_KEY, rows);
    return rowToApp(rows[idx]);
  }

  const newId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newRow: AppRow = {
    id: newId,
    user_id: userId,
    status: 'not_applied',
    professional_headline: fields.professionalHeadline,
    biography: fields.biography,
    location: fields.location,
    linkedin_url: fields.linkedinUrl ?? null,
    github_url: fields.githubUrl ?? null,
    portfolio_url: fields.portfolioUrl ?? null,
    identity_verified: false,
    competency_verified: false,
    admin_approved: false,
    rejection_reason: null,
    submitted_at: null,
    approved_at: null,
    reviewed_by: null,
    created_at: now,
    updated_at: now,
  };
  rows.push(newRow);
  writeJSON(APPS_KEY, rows);
  return rowToApp(newRow);
}

export async function submitApplication(applicationId: string): Promise<boolean> {
  const rows = getAppRows();
  const idx = rows.findIndex((r) => r.id === applicationId);
  if (idx === -1) return false;
  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    status: 'pending_verification',
    identity_verified: false,
    competency_verified: false,
    admin_approved: false,
    rejection_reason: null,
    submitted_at: now,
    updated_at: now,
  };
  writeJSON(APPS_KEY, rows);
  addHistory(applicationId, 'Application submitted');
  return true;
}

export async function upsertSkillVerification(
  applicationId: string,
  skillId: string,
  skillName: string,
  evidence: MentorApplicationEvidence[]
): Promise<MentorApplicationSkill | null> {
  const rows = getSkillRows();
  const existing = rows.find((r) => r.application_id === applicationId && r.skill_id === skillId);

  if (existing) {
    const idx = rows.indexOf(existing);
    rows[idx] = {
      ...existing,
      evidence_data: evidence,
      skill_name: skillName,
      status: 'pending',
    };
    writeJSON(SKILLS_KEY, rows);
    return rowToSkill(rows[idx]);
  }

  const newId = `skv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newRow: SkillRow = {
    id: newId,
    application_id: applicationId,
    skill_id: skillId,
    skill_name: skillName,
    evidence_data: evidence,
    status: 'pending',
    feedback: null,
    reviewed_at: null,
  };
  rows.push(newRow);
  writeJSON(SKILLS_KEY, rows);
  return rowToSkill(newRow);
}

// --- Admin-facing functions ---

function getDisplayName(userId: string): string {
  try {
    const raw = localStorage.getItem('skillsphere_db');
    if (!raw) return 'Unknown';
    const db = JSON.parse(raw);
    const user = db.users?.find((u: { id: string; name: string; email: string }) => u.id === userId);
    return user?.name ?? 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function getDisplayEmail(userId: string): string {
  try {
    const raw = localStorage.getItem('skillsphere_db');
    if (!raw) return '';
    const db = JSON.parse(raw);
    const user = db.users?.find((u: { id: string; email: string }) => u.id === userId);
    return user?.email ?? '';
  } catch {
    return '';
  }
}

export async function adminListApplications(): Promise<MentorApplicationWithDetails[]> {
  const rows = getAppRows();
  const skillRows = getSkillRows();
  const historyRows = getHistoryRows();

  return rows.map((row) => ({
    ...rowToApp(row),
    skills: skillRows.filter((s) => s.application_id === row.id).map(rowToSkill),
    history: historyRows.filter((h) => h.application_id === row.id),
    applicantName: getDisplayName(row.user_id),
    applicantEmail: getDisplayEmail(row.user_id),
  }));
}

export async function adminApproveMentor(applicationId: string): Promise<{ success: boolean; error?: string }> {
  const rows = getAppRows();
  const idx = rows.findIndex((r) => r.id === applicationId);
  if (idx === -1) return { success: false, error: 'Application not found' };
  if (!rows[idx].competency_verified) return { success: false, error: 'Cannot approve: competency verification has not passed' };
  if (rows[idx].status === 'suspended') return { success: false, error: 'Cannot approve a suspended application' };

  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    status: 'approved',
    admin_approved: true,
    approved_at: now,
    updated_at: now,
  };
  writeJSON(APPS_KEY, rows);
  setUserRole(rows[idx].user_id, 'mentor');
  if (!getMentorProfile(rows[idx].user_id)) {
    const db = getDb();
    db.mentorProfiles.push({
      id: `mp-${Date.now()}`,
      userId: rows[idx].user_id,
      professionalTitle: rows[idx].professional_headline,
      bio: rows[idx].biography,
      location: rows[idx].location,
      experienceYears: 0,
      education: '',
      certifications: [],
      availability: 'available',
      mentorshipAreas: [],
      skillIds: [],
      rating: 0,
      reviewCount: 0,
      profileComplete: false,
      activated: false,
    });
    saveDb();
  }
  updateMentorProfile(rows[idx].user_id, { activated: true });
  addHistory(applicationId, 'Mentor approved by admin');
  pushNotification(rows[idx].user_id, 'Mentor application approved', 'Congratulations! Your mentor application has been approved. You now have access to the mentor dashboard.');
  return { success: true };
}

export async function adminSetCompetency(applicationId: string, verified: boolean, reason?: string): Promise<{ success: boolean; error?: string }> {
  const rows = getAppRows();
  const idx = rows.findIndex((r) => r.id === applicationId);
  if (idx === -1) return { success: false, error: 'Application not found' };

  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    competency_verified: verified,
    status: verified ? 'pending_admin_approval' : 'verification_failed',
    rejection_reason: verified ? null : reason ?? null,
    updated_at: now,
  };
  writeJSON(APPS_KEY, rows);
  addHistory(applicationId, verified ? 'Competency verification passed' : 'Competency verification failed', reason);
  if (!verified) {
    pushNotification(rows[idx].user_id, 'Competency verification failed', reason ?? 'Your competency evidence did not meet the requirements. Please review the feedback and resubmit.');
  } else {
    pushNotification(rows[idx].user_id, 'Competency verification passed', 'Your competency verification has passed. An administrator will now review your application for final approval.');
  }
  return { success: true };
}

export async function adminSetIdentity(applicationId: string, verified: boolean, reason?: string): Promise<{ success: boolean; error?: string }> {
  const rows = getAppRows();
  const idx = rows.findIndex((r) => r.id === applicationId);
  if (idx === -1) return { success: false, error: 'Application not found' };

  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    identity_verified: verified,
    updated_at: now,
  };
  writeJSON(APPS_KEY, rows);
  addHistory(applicationId, verified ? 'Identity verified' : 'Identity verification failed', reason);
  return { success: true };
}

export async function adminRejectApplication(applicationId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const rows = getAppRows();
  const idx = rows.findIndex((r) => r.id === applicationId);
  if (idx === -1) return { success: false, error: 'Application not found' };

  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    status: 'rejected',
    rejection_reason: reason,
    updated_at: now,
  };
  writeJSON(APPS_KEY, rows);
  addHistory(applicationId, 'Application rejected', reason);
  pushNotification(rows[idx].user_id, 'Mentor application rejected', `Your application has been rejected. Reason: ${reason}`);
  return { success: true };
}

export async function adminSuspendMentor(applicationId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  const rows = getAppRows();
  const idx = rows.findIndex((r) => r.id === applicationId);
  if (idx === -1) return { success: false, error: 'Application not found' };

  const now = new Date().toISOString();
  rows[idx] = {
    ...rows[idx],
    status: 'suspended',
    rejection_reason: reason,
    updated_at: now,
  };
  writeJSON(APPS_KEY, rows);
  updateMentorProfile(rows[idx].user_id, { activated: false });
  addHistory(applicationId, 'Mentor suspended', reason);
  pushNotification(rows[idx].user_id, 'Mentor account suspended', `Your mentor account has been suspended. Reason: ${reason}`);
  return { success: true };
}

export async function adminReviewSkill(skillVerifId: string, decision: 'verified' | 'rejected' | 'needs-evidence', feedback?: string): Promise<{ success: boolean; error?: string }> {
  const rows = getSkillRows();
  const idx = rows.findIndex((r) => r.id === skillVerifId);
  if (idx === -1) return { success: false, error: 'Skill verification not found' };

  rows[idx] = {
    ...rows[idx],
    status: decision,
    feedback: feedback ?? null,
    reviewed_at: new Date().toISOString(),
  };
  writeJSON(SKILLS_KEY, rows);
  addHistory(rows[idx].application_id, `Skill "${rows[idx].skill_name}" marked ${decision.replace(/-/g, ' ')}`, feedback);
  return { success: true };
}

export async function adminRequestEvidence(applicationId: string, skillId: string, feedback: string): Promise<{ success: boolean; error?: string }> {
  const rows = getSkillRows();
  const idx = rows.findIndex((r) => r.application_id === applicationId && r.skill_id === skillId);
  if (idx === -1) return { success: false, error: 'Skill not found' };

  rows[idx] = {
    ...rows[idx],
    status: 'needs-evidence',
    feedback,
    reviewed_at: new Date().toISOString(),
  };
  writeJSON(SKILLS_KEY, rows);
  addHistory(applicationId, 'Additional evidence requested', feedback);
  pushNotification(rows[idx].application_id, 'Additional evidence requested', `The reviewer has requested more evidence for your "${rows[idx].skill_name}" skill. Feedback: ${feedback}`);
  return { success: true };
}

// --- Authorization check ---

export async function checkMentorAccess(): Promise<{
  hasAccess: boolean;
  status: MentorApplicationStatus;
  application: MentorApplication | null;
}> {
  const userId = getCurrentUserId();
  if (!userId) return { hasAccess: false, status: 'not_applied', application: null };

  const application = await getMyApplication();

  if (!application) {
    const dbUser = getDb().users.find((u) => u.id === userId);
    if (dbUser && dbUser.role === 'mentor') {
      return { hasAccess: true, status: 'approved', application: null };
    }
    return { hasAccess: false, status: 'not_applied', application: null };
  }

  if (application.status === 'suspended') return { hasAccess: false, status: 'suspended', application };
  if (application.status === 'approved' && application.competencyVerified && application.adminApproved) {
    return { hasAccess: true, status: 'approved', application };
  }

  return { hasAccess: false, status: application.status, application };
}

// --- Seed helper for demo applications ---

export function seedDemoApplications(): void {
  const existing = getAppRows();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const apps: AppRow[] = [
    {
      id: 'app-demo-1',
      user_id: 'user-learner-1',
      status: 'pending_verification',
      professional_headline: 'Frontend Developer',
      biography: 'CS student transitioning to full-stack.',
      location: 'Nairobi, Kenya',
      linkedin_url: null,
      github_url: 'https://github.com/brianmwangi',
      portfolio_url: null,
      identity_verified: false,
      competency_verified: false,
      admin_approved: false,
      rejection_reason: null,
      submitted_at: now,
      approved_at: null,
      reviewed_by: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'app-demo-2',
      user_id: 'user-learner-2',
      status: 'pending_admin_approval',
      professional_headline: 'Backend Developer',
      biography: 'Python enthusiast exploring data engineering.',
      location: 'Mombasa, Kenya',
      linkedin_url: 'https://linkedin.com/in/grace',
      github_url: 'https://github.com/graceachieng',
      portfolio_url: null,
      identity_verified: true,
      competency_verified: true,
      admin_approved: false,
      rejection_reason: null,
      submitted_at: now,
      approved_at: null,
      reviewed_by: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'app-demo-3',
      user_id: 'user-learner-3',
      status: 'verification_failed',
      professional_headline: 'Designer turned Developer',
      biography: 'Designer learning frontend development.',
      location: 'Kisumu, Kenya',
      linkedin_url: null,
      github_url: null,
      portfolio_url: 'https://kevindesigns.dev',
      identity_verified: false,
      competency_verified: false,
      admin_approved: false,
      rejection_reason: 'Insufficient evidence for claimed React skills. Please add a GitHub repo or work sample.',
      submitted_at: now,
      approved_at: null,
      reviewed_by: null,
      created_at: now,
      updated_at: now,
    },
  ];
  writeJSON(APPS_KEY, apps);

  const skills: SkillRow[] = [
    {
      id: 'skv-demo-1',
      application_id: 'app-demo-1',
      skill_id: 'skill-react',
      skill_name: 'React',
      evidence_data: [{ type: 'github', title: 'React Todo App', description: 'A CRUD app built with React hooks.', url: 'https://github.com/brianmwangi/react-todo' }],
      status: 'pending',
      feedback: null,
      reviewed_at: null,
    },
    {
      id: 'skv-demo-2',
      application_id: 'app-demo-2',
      skill_id: 'skill-python',
      skill_name: 'Python',
      evidence_data: [{ type: 'certificate', title: 'Python Institute Certificate', description: 'PCAP certified.' }],
      status: 'verified',
      feedback: null,
      reviewed_at: now,
    },
    {
      id: 'skv-demo-3',
      application_id: 'app-demo-3',
      skill_id: 'skill-react',
      skill_name: 'React',
      evidence_data: [{ type: 'experience', title: 'Built landing pages', description: 'Some HTML/CSS landing pages.' }],
      status: 'needs-evidence',
      feedback: 'Please provide a React-specific project with component architecture.',
      reviewed_at: now,
    },
  ];
  writeJSON(SKILLS_KEY, skills);

  const history: MentorVerificationHistoryDB[] = [
    { id: 'hist-demo-1', application_id: 'app-demo-1', action: 'Application submitted', actor_id: 'user-learner-1', note: null, created_at: now },
    { id: 'hist-demo-2', application_id: 'app-demo-2', action: 'Application submitted', actor_id: 'user-learner-2', note: null, created_at: now },
    { id: 'hist-demo-3', application_id: 'app-demo-2', action: 'Identity verified', actor_id: 'user-admin-1', note: null, created_at: now },
    { id: 'hist-demo-4', application_id: 'app-demo-2', action: 'Competency verification passed', actor_id: 'user-admin-1', note: 'Strong Python fundamentals demonstrated.', created_at: now },
    { id: 'hist-demo-5', application_id: 'app-demo-3', action: 'Application submitted', actor_id: 'user-learner-3', note: null, created_at: now },
    { id: 'hist-demo-6', application_id: 'app-demo-3', action: 'Competency verification failed', actor_id: 'user-admin-1', note: 'Insufficient evidence for claimed React skills.', created_at: now },
  ];
  writeJSON(HISTORY_KEY, history);
}
