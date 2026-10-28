import { supabase } from '@/lib/supabase';
import type {
  MentorApplication,
  MentorApplicationSkill,
  MentorApplicationEvidence,
  MentorApplicationStatus,
  MentorApplicationWithDetails,
} from '@/types';

const EDGE_FUNCTION_URL = '/functions/v1/mentor-verification-actions';

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function callAdminAction(action: string, payload: Record<string, unknown>): Promise<{ success: boolean; message?: string; error?: string }> {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${EDGE_FUNCTION_URL}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));
    return { success: false, error: data.error || 'Unauthorized: admin access required' };
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { success: false, error: data.error || `Request failed (${response.status})` };
  }
  const data = await response.json().catch(() => ({}));
  return { success: true, message: data.message };
}

// --- Applicant-facing functions ---

export async function getMyApplication(): Promise<MentorApplication | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('mentor_applications')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching application:', error.message);
    return null;
  }
  return (data as MentorApplication) ?? null;
}

export async function getMyApplicationSkills(applicationId: string): Promise<MentorApplicationSkill[]> {
  const { data, error } = await supabase
    .from('mentor_skill_verifications')
    .select('*')
    .eq('application_id', applicationId);

  if (error) {
    console.error('Error fetching skills:', error.message);
    return [];
  }
  return (data as MentorApplicationSkill[]) ?? [];
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const updates = {
    professional_headline: fields.professionalHeadline,
    biography: fields.biography,
    location: fields.location,
    linkedin_url: fields.linkedinUrl,
    github_url: fields.githubUrl,
    portfolio_url: fields.portfolioUrl,
    updated_at: new Date().toISOString(),
  };

  if (applicationId) {
    const { data, error } = await supabase
      .from('mentor_applications')
      .update(updates)
      .eq('id', applicationId)
      .select()
      .single();
    if (error) {
      console.error('Error updating application:', error.message);
      return null;
    }
    return data as MentorApplication;
  }

  const { data, error } = await supabase
    .from('mentor_applications')
    .insert({
      user_id: user.id,
      status: 'not_applied',
      ...updates,
    })
    .select()
    .single();
  if (error) {
    console.error('Error creating application:', error.message);
    return null;
  }
  return data as MentorApplication;
}

export async function submitApplication(applicationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('mentor_applications')
    .update({
      status: 'pending_verification',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) {
    console.error('Error submitting application:', error.message);
    return false;
  }
  return true;
}

export async function upsertSkillVerification(
  applicationId: string,
  skillId: string,
  skillName: string,
  evidence: MentorApplicationEvidence[]
): Promise<MentorApplicationSkill | null> {
  const { data: existing } = await supabase
    .from('mentor_skill_verifications')
    .select('id')
    .eq('application_id', applicationId)
    .eq('skill_id', skillId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('mentor_skill_verifications')
      .update({
        evidence_data: evidence,
        skill_name: skillName,
        status: 'pending',
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      console.error('Error updating skill verification:', error.message);
      return null;
    }
    return data as MentorApplicationSkill;
  }

  const { data, error } = await supabase
    .from('mentor_skill_verifications')
    .insert({
      application_id: applicationId,
      skill_id: skillId,
      skill_name: skillName,
      evidence_data: evidence,
      status: 'pending',
    })
    .select()
    .single();
  if (error) {
    console.error('Error creating skill verification:', error.message);
    return null;
  }
  return data as MentorApplicationSkill;
}

// --- Admin-facing functions (via edge function) ---

export async function adminListApplications(): Promise<MentorApplicationWithDetails[]> {
  const token = await getAuthToken();
  if (!token) return [];

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${EDGE_FUNCTION_URL}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ action: 'list_applications' }),
  });

  if (!response.ok) return [];
  const data = await response.json();
  return (data.applications as MentorApplicationWithDetails[]) ?? [];
}

export async function adminApproveMentor(applicationId: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('approve_mentor', { applicationId });
}

export async function adminSetCompetency(applicationId: string, verified: boolean, reason?: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('set_competency', { applicationId, verified, reason });
}

export async function adminSetIdentity(applicationId: string, verified: boolean, reason?: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('set_identity', { applicationId, verified, reason });
}

export async function adminRejectApplication(applicationId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('reject_application', { applicationId, reason });
}

export async function adminSuspendMentor(applicationId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('suspend_mentor', { applicationId, reason });
}

export async function adminReviewSkill(skillVerifId: string, decision: 'verified' | 'rejected' | 'needs-evidence', feedback?: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('review_skill', { skillVerifId, decision, feedback });
}

export async function adminRequestEvidence(applicationId: string, skillId: string, feedback: string): Promise<{ success: boolean; error?: string }> {
  return callAdminAction('request_evidence', { applicationId, skillId, feedback });
}

// --- Authorization check ---

export async function checkMentorAccess(): Promise<{
  hasAccess: boolean;
  status: MentorApplicationStatus;
  application: MentorApplication | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { hasAccess: false, status: 'not_applied', application: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'mentor') {
    return { hasAccess: false, status: 'not_applied', application: null };
  }

  const application = await getMyApplication();
  if (!application) {
    return { hasAccess: false, status: 'not_applied', application: null };
  }

  if (application.status === 'suspended') {
    return { hasAccess: false, status: 'suspended', application };
  }

  if (application.status === 'approved' && application.competencyVerified && application.adminApproved) {
    return { hasAccess: true, status: 'approved', application };
  }

  return { hasAccess: false, status: application.status, application };
}

// --- Profile management ---

export async function ensureProfile(displayName: string, email: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return;

  await supabase.from('profiles').insert({
    id: user.id,
    role: 'learner',
    display_name: displayName,
    email,
  });
}

export async function getProfileRole(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data.role;
}
