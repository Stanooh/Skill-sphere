import { createClient } from '@/lib/supabase/client';
import type {
  MentorApplication,
  MentorApplicationEvidence,
  MentorApplicationSkill,
  MentorApplicationStatus,
  MentorApplicationWithDetails,
  MentorVerificationHistoryDB,
} from '@/types';
import {
  getDb,
  getMentorProfile,
  saveDb,
  setUserRole,
  updateMentorProfile,
} from '@/services/dataService';

type DbApplication = {
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
};

type DbSkill = {
  id: string;
  application_id: string;
  skill_id: string;
  skill_name: string;
  evidence_data: MentorApplicationEvidence[];
  status: MentorApplicationSkill['status'];
  feedback: string | null;
  reviewed_at: string | null;
};

function reportError(operation: string, error: unknown): void {
  const supabaseError = (error ?? {}) as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
    status?: unknown;
  };
  let raw: unknown = error;
  try {
    raw = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : JSON.parse(JSON.stringify(error));
  } catch {
    raw = String(error);
  }
  console.error(`[mentor-verification] ${operation} failed`, {
    operation,
    raw,
    message: typeof supabaseError?.message === 'string' ? supabaseError.message : undefined,
    details: typeof supabaseError?.details === 'string' ? supabaseError.details : undefined,
    hint: typeof supabaseError?.hint === 'string' ? supabaseError.hint : undefined,
    code: typeof supabaseError?.code === 'string' ? supabaseError.code : undefined,
    status: typeof supabaseError?.status === 'number' ? supabaseError.status : undefined,
  });
}

function getUserFacingSupabaseError(error: unknown, fallback: string): string {
  const supabaseError = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  } | null;
  const message = typeof supabaseError?.message === 'string' ? supabaseError.message.trim() : '';
  const details = typeof supabaseError?.details === 'string' ? supabaseError.details.trim() : '';
  const code = typeof supabaseError?.code === 'string' ? supabaseError.code.trim() : '';
  if (message) {
    return [message, details, code ? `(${code})` : ''].filter(Boolean).join(' ');
  }
  return fallback;
}

function mapApplication(row: DbApplication): MentorApplication {
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

function mapSkill(row: DbSkill): MentorApplicationSkill {
  return {
    id: row.id,
    applicationId: row.application_id,
    skillId: row.skill_id,
    skillName: row.skill_name,
    evidenceData: row.evidence_data ?? [],
    status: row.status,
    feedback: row.feedback ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    if (error) reportError('get authenticated user', error);
    return null;
  }
  return data.user.id;
}

async function getAdminActorId(): Promise<string | null> {
  return getAuthenticatedUserId();
}

export async function getMyApplication(): Promise<MentorApplication | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_applications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    reportError('load application', error);
    return null;
  }
  return data ? mapApplication(data as DbApplication) : null;
}

export async function getMyApplicationSkills(applicationId: string): Promise<MentorApplicationSkill[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_application_skills')
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) {
    reportError('load application skills', error);
    return [];
  }
  return (data as DbSkill[]).map(mapSkill);
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
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const supabase = createClient();
  const values = {
    professional_headline: fields.professionalHeadline.trim(),
    biography: fields.biography.trim(),
    location: fields.location.trim(),
    linkedin_url: fields.linkedinUrl?.trim() || null,
    github_url: fields.githubUrl?.trim() || null,
    portfolio_url: fields.portfolioUrl?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const query = applicationId
    ? supabase
        .from('mentor_applications')
        .update(values)
        .eq('id', applicationId)
        .eq('user_id', userId)
        .select('*')
        .maybeSingle()
    : supabase
        .from('mentor_applications')
        .insert({ ...values, user_id: userId })
        .select('*')
        .single();

  const { data, error } = await query;
  if (error || !data) {
    if (error) reportError('save application', error);
    return null;
  }
  return mapApplication(data as DbApplication);
}

export async function submitApplication(
  applicationId: string,
  selectedSkills: { skillId: string; skillName: string }[] = []
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  for (const skill of selectedSkills) {
    const saved = await upsertSkillVerification(applicationId, skill.skillId, skill.skillName, []);
    if (!saved) {
      return { success: false, error: 'The selected skills could not be saved. Please try again.' };
    }
  }

  const { error } = await supabase.rpc('submit_mentor_application', {
    application_id: applicationId,
  });
  if (error) {
    reportError('submit application with existing RPC', error);
    return {
      success: false,
      error: getUserFacingSupabaseError(error, 'The application could not be submitted. Please try again.'),
    };
  }
  return { success: true };
}

export async function upsertSkillVerification(
  applicationId: string,
  skillId: string,
  skillName: string,
  evidence: MentorApplicationEvidence[] = []
): Promise<MentorApplicationSkill | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_application_skills')
    .upsert(
      {
        application_id: applicationId,
        skill_id: skillId,
        skill_name: skillName,
        evidence_data: evidence,
        status: 'pending',
        feedback: null,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'application_id,skill_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    if (error) reportError('save skill evidence', error);
    return null;
  }
  return mapSkill(data as DbSkill);
}

export async function saveSelectedApplicationSkills(
  applicationId: string,
  selectedSkills: { skillId: string; skillName: string }[],
  existingSkills: MentorApplicationSkill[]
): Promise<boolean> {
  const results = await Promise.all(
    selectedSkills.map((skill) => {
      const existing = existingSkills.find((item) => item.skillId === skill.skillId);
      return upsertSkillVerification(applicationId, skill.skillId, skill.skillName, existing?.evidenceData ?? []);
    })
  );
  return results.every(Boolean);
}

export async function adminListApplications(): Promise<MentorApplicationWithDetails[]> {
  const supabase = createClient();
  const { data: applications, error: applicationError } = await supabase
    .from('mentor_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (applicationError) {
    reportError('list applications', applicationError);
    return [];
  }

  const rows = applications as DbApplication[];
  if (rows.length === 0) return [];

  const applicationIds = rows.map((row) => row.id);
  const userIds = rows.map((row) => row.user_id);
  const [{ data: skills, error: skillsError }, { data: history, error: historyError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('mentor_application_skills').select('*').in('application_id', applicationIds),
      supabase.from('mentor_verification_history').select('*').in('application_id', applicationIds).order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, full_name, email').in('id', userIds),
    ]);

  if (skillsError) reportError('list application skills', skillsError);
  if (historyError) reportError('list verification history', historyError);
  if (profilesError) reportError('load applicant profiles', profilesError);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      profile as { id: string; full_name: string | null; email: string | null },
    ])
  );
  const skillsByApplication = new Map<string, MentorApplicationSkill[]>();
  for (const skill of (skills ?? []) as DbSkill[]) {
    const mapped = mapSkill(skill);
    const existing = skillsByApplication.get(skill.application_id) ?? [];
    existing.push(mapped);
    skillsByApplication.set(skill.application_id, existing);
  }
  const historyByApplication = new Map<string, MentorVerificationHistoryDB[]>();
  for (const entry of (history ?? []) as MentorVerificationHistoryDB[]) {
    const existing = historyByApplication.get(entry.application_id) ?? [];
    existing.push(entry);
    historyByApplication.set(entry.application_id, existing);
  }

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      ...mapApplication(row),
      skills: skillsByApplication.get(row.id) ?? [],
      history: historyByApplication.get(row.id) ?? [],
      applicantName: profile?.full_name ?? 'Unknown',
      applicantEmail: profile?.email ?? '',
    };
  });
}

async function updateApplication(
  applicationId: string,
  updates: Record<string, unknown>,
  operation: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, error: 'Authentication required.' };

  const { error } = await supabase
    .from('mentor_applications')
    .update({ ...updates, reviewed_by: actorId, updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) {
    reportError(operation, error);
    return { success: false, error: 'This administrative action could not be completed.' };
  }
  return { success: true };
}

export async function adminApproveMentor(applicationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.rpc('admin_approve_mentor_application', {
    application_id: applicationId,
  });
  if (error) {
    reportError('approve mentor', error);
    return { success: false, error: 'This mentor could not be approved.' };
  }

  const application = await getApplicationById(applicationId);
  if (application) {
    syncApprovedMentorCache(application);
  }
  return { success: true };
}

export async function adminSetCompetency(
  applicationId: string,
  verified: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await updateApplication(
    applicationId,
    {
      competency_verified: verified,
      status: verified ? 'pending_admin_approval' : 'verification_failed',
      rejection_reason: verified ? null : reason ?? null,
    },
    'update competency verification'
  );
  return result;
}

export async function adminSetIdentity(
  applicationId: string,
  verified: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  return updateApplication(
    applicationId,
    {
      identity_verified: verified,
      rejection_reason: verified ? null : reason ?? null,
    },
    'update identity verification'
  );
}

export async function adminRejectApplication(
  applicationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  return updateApplication(
    applicationId,
    { status: 'rejected', rejection_reason: reason },
    'reject mentor application'
  );
}

export async function adminSuspendMentor(
  applicationId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const result = await updateApplication(
    applicationId,
    { status: 'suspended', rejection_reason: reason },
    'suspend mentor'
  );
  if (result.success) {
    const application = await getApplicationById(applicationId);
    if (application) updateMentorProfile(application.userId, { activated: false });
  }
  return result;
}

export async function adminReviewSkill(
  skillVerificationId: string,
  decision: 'verified' | 'rejected' | 'needs-evidence',
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, error: 'Authentication required.' };

  const { error } = await supabase
    .from('mentor_application_skills')
    .update({
      status: decision,
      feedback: feedback ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', skillVerificationId);

  if (error) {
    reportError('review mentor skill', error);
    return { success: false, error: 'This skill review could not be saved.' };
  }
  return { success: true };
}

async function getApplicationById(applicationId: string): Promise<MentorApplication | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mentor_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) {
    reportError('load application by id', error);
    return null;
  }
  return data ? mapApplication(data as DbApplication) : null;
}

function syncApprovedMentorCache(application: MentorApplication): void {
  setUserRole(application.userId, 'mentor');
  if (!getMentorProfile(application.userId)) {
    const db = getDb();
    db.mentorProfiles.push({
      id: `mp-${Date.now()}`,
      userId: application.userId,
      professionalTitle: application.professionalHeadline,
      bio: application.biography,
      location: application.location,
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
  updateMentorProfile(application.userId, { activated: true });
}

export async function checkMentorAccess(): Promise<{
  hasAccess: boolean;
  status: MentorApplicationStatus;
  application: MentorApplication | null;
}> {
  const application = await getMyApplication();
  if (!application) return { hasAccess: false, status: 'not_applied', application: null };
  if (application.status === 'suspended') return { hasAccess: false, status: 'suspended', application };
  if (application.status === 'approved' && application.competencyVerified && application.adminApproved) {
    return { hasAccess: true, status: 'approved', application };
  }
  return { hasAccess: false, status: application.status, application };
}
