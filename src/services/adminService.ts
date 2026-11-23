'use client';
/**
 * adminService.ts
 *
 * All Supabase queries used exclusively by the Admin dashboard.
 * Every function uses the authenticated Supabase client so RLS
 * is enforced server-side — only admin-role users can retrieve
 * this data (enforced by existing RLS policies on each table).
 *
 * No mock data, no localStorage, no demo records.
 */

import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminProfile {
  id: string;
  fullName: string | null;
  email: string;
  role: 'learner' | 'mentor' | 'admin';
  avatarUrl: string | null;
  createdAt: string;
}

export interface AdminMentorRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  professionalTitle: string;
  bio: string;
  location: string;
  experienceYears: number;
  rating: number;
  reviewCount: number;
  availability: string;
  activated: boolean;
  profileComplete: boolean;
  skillIds: string[];
  workshopCount: number;
  sessionCount: number;
}

export interface AdminLearnerRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  bio: string;
  location: string;
  education: string;
  learningGoal: string;
  skillIds: string[];
  profileComplete: boolean;
  employerVisibility: boolean;
}

export interface AdminWorkshopRow {
  id: string;
  mentorId: string;
  mentorName: string;
  title: string;
  description: string;
  date: string;
  startTime: string | null;
  durationMinutes: number;
  capacity: number;
  registrationCount: number;
  status: string;
  skillId: string | null;
  createdAt: string;
}

export interface AdminSessionRow {
  id: string;
  learnerId: string;
  learnerName: string;
  mentorId: string;
  mentorName: string;
  title: string;
  scheduledDate: string;
  status: string;
  createdAt: string;
}

export interface AdminSkillRow {
  id: string;
  name: string;
  category: string;
  relatedSkillIds: string[];
  createdAt: string;
  mentorCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalLearners: number;
  totalMentors: number;
  totalAdmins: number;
  activatedMentors: number;
  pendingApplications: number;
  totalApplications: number;
  totalWorkshops: number;
  publishedWorkshops: number;
  totalWorkshopRegistrations: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  pendingSessions: number;
  totalSkills: number;
  totalNotifications: number;
}

// ─── Platform Stats ──────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createClient();

  const [
    profilesRes,
    mentorAppRes,
    workshopsRes,
    workshopRegsRes,
    sessionsRes,
    skillsRes,
    notifsRes,
    activatedRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id, role', { count: 'exact' }),
    supabase.from('mentor_applications').select('id, status, admin_approved', { count: 'exact' }),
    supabase.from('workshops').select('id, status', { count: 'exact' }),
    supabase.from('workshop_registrations').select('id', { count: 'exact' }),
    supabase.from('sessions').select('id, status', { count: 'exact' }),
    supabase.from('skills').select('id', { count: 'exact' }),
    supabase.from('notifications').select('id', { count: 'exact' }),
    supabase.from('mentor_profiles').select('id, activated', { count: 'exact' }),
  ]);

  const profiles = profilesRes.data ?? [];
  const apps = mentorAppRes.data ?? [];
  const workshops = workshopsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];
  const activated = activatedRes.data ?? [];

  return {
    totalUsers: profiles.length,
    totalLearners: profiles.filter((p) => p.role === 'learner').length,
    totalMentors: profiles.filter((p) => p.role === 'mentor').length,
    totalAdmins: profiles.filter((p) => p.role === 'admin').length,
    activatedMentors: activated.filter((m) => m.activated).length,
    pendingApplications: apps.filter((a) => a.status === 'pending' || (!a.admin_approved && a.status !== 'rejected')).length,
    totalApplications: apps.length,
    totalWorkshops: workshops.length,
    publishedWorkshops: workshops.filter((w) => w.status === 'published').length,
    totalWorkshopRegistrations: workshopRegsRes.count ?? 0,
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === 'accepted').length,
    completedSessions: sessions.filter((s) => s.status === 'completed').length,
    pendingSessions: sessions.filter((s) => s.status === 'pending').length,
    totalSkills: skillsRes.count ?? 0,
    totalNotifications: notifsRes.count ?? 0,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getAdminAllUsers(): Promise<AdminProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[adminService] getAdminAllUsers error:', error.message, error.code);
    return [];
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    role: p.role as AdminProfile['role'],
    avatarUrl: p.avatar_url,
    createdAt: p.created_at,
  }));
}

export async function adminDeleteUser(userId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  // Soft-delete: we cannot delete auth users from the client. Mark via profile update instead.
  // Real deletion must go through a server action / Edge Function with service role.
  // We delete the profile row which cascades to most related data via FK constraints.
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)
    .neq('role', 'admin'); // Safety: never delete an admin

  if (error) {
    console.error('[adminService] adminDeleteUser error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Mentors ─────────────────────────────────────────────────────────────────

export async function getAdminMentors(): Promise<AdminMentorRow[]> {
  const supabase = createClient();

  const [profilesRes, mentorProfilesRes, workshopsRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at')
      .eq('role', 'mentor'),
    supabase
      .from('mentor_profiles')
      .select('user_id, professional_title, bio, location, experience_years, rating, review_count, availability, activated, profile_complete, skill_ids'),
    supabase.from('workshops').select('id, mentor_id'),
    supabase.from('sessions').select('id, mentor_id'),
  ]);

  const profiles = profilesRes.data ?? [];
  const mentorProfiles = mentorProfilesRes.data ?? [];
  const workshops = workshopsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];

  return profiles.map((p) => {
    const mp = mentorProfiles.find((m) => m.user_id === p.id);
    return {
      id: p.id,
      fullName: p.full_name ?? 'Unknown',
      email: p.email,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      professionalTitle: mp?.professional_title ?? '',
      bio: mp?.bio ?? '',
      location: mp?.location ?? '',
      experienceYears: mp?.experience_years ?? 0,
      rating: Number(mp?.rating ?? 0),
      reviewCount: mp?.review_count ?? 0,
      availability: mp?.availability ?? 'available',
      activated: mp?.activated ?? false,
      profileComplete: mp?.profile_complete ?? false,
      skillIds: mp?.skill_ids ?? [],
      workshopCount: workshops.filter((w) => w.mentor_id === p.id).length,
      sessionCount: sessions.filter((s) => s.mentor_id === p.id).length,
    };
  });
}

// ─── Learners ────────────────────────────────────────────────────────────────

export async function getAdminLearners(): Promise<AdminLearnerRow[]> {
  const supabase = createClient();

  const [profilesRes, learnerProfilesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at')
      .eq('role', 'learner'),
    supabase
      .from('learner_profiles')
      .select('user_id, bio, location, education, learning_goal, skill_ids, profile_complete, employer_visibility'),
  ]);

  const profiles = profilesRes.data ?? [];
  const learnerProfiles = learnerProfilesRes.data ?? [];

  return profiles.map((p) => {
    const lp = learnerProfiles.find((l) => l.user_id === p.id);
    return {
      id: p.id,
      fullName: p.full_name ?? 'Unknown',
      email: p.email,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      bio: lp?.bio ?? '',
      location: lp?.location ?? '',
      education: lp?.education ?? '',
      learningGoal: lp?.learning_goal ?? '',
      skillIds: lp?.skill_ids ?? [],
      profileComplete: lp?.profile_complete ?? false,
      employerVisibility: lp?.employer_visibility ?? false,
    };
  });
}

// ─── Workshops ───────────────────────────────────────────────────────────────

export async function getAdminWorkshops(): Promise<AdminWorkshopRow[]> {
  const supabase = createClient();

  const [workshopsRes, registrationsRes, profilesRes] = await Promise.all([
    supabase
      .from('workshops')
      .select('id, mentor_id, skill_id, title, description, date, start_time, duration_minutes, capacity, status, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('workshop_registrations').select('workshop_id'),
    supabase.from('profiles').select('id, full_name').eq('role', 'mentor'),
  ]);

  const workshops = workshopsRes.data ?? [];
  const registrations = registrationsRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  return workshops.map((w) => {
    const mentor = profiles.find((p) => p.id === w.mentor_id);
    const regCount = registrations.filter((r) => r.workshop_id === w.id).length;
    return {
      id: w.id,
      mentorId: w.mentor_id,
      mentorName: mentor?.full_name ?? 'Unknown Mentor',
      title: w.title,
      description: w.description ?? '',
      date: w.date,
      startTime: w.start_time ?? null,
      durationMinutes: w.duration_minutes ?? 60,
      capacity: w.capacity ?? 20,
      registrationCount: regCount,
      status: w.status,
      skillId: w.skill_id ?? null,
      createdAt: w.created_at,
    };
  });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function getAdminSessions(): Promise<AdminSessionRow[]> {
  const supabase = createClient();

  const [sessionsRes, profilesRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, learner_id, mentor_id, title, scheduled_date, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('id, full_name'),
  ]);

  const sessions = sessionsRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const nameMap = new Map(profiles.map((p) => [p.id, p.full_name ?? 'Unknown']));

  return sessions.map((s) => ({
    id: s.id,
    learnerId: s.learner_id,
    learnerName: nameMap.get(s.learner_id) ?? 'Unknown Learner',
    mentorId: s.mentor_id,
    mentorName: nameMap.get(s.mentor_id) ?? 'Unknown Mentor',
    title: s.title,
    scheduledDate: s.scheduled_date,
    status: s.status,
    createdAt: s.created_at,
  }));
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export async function getAdminSkills(): Promise<AdminSkillRow[]> {
  const supabase = createClient();

  const [skillsRes, mentorProfilesRes] = await Promise.all([
    supabase.from('skills').select('id, name, category, related_skill_ids, created_at').order('category').order('name'),
    supabase.from('mentor_profiles').select('skill_ids'),
  ]);

  const skills = skillsRes.data ?? [];
  const mentorProfiles = mentorProfilesRes.data ?? [];

  return skills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    relatedSkillIds: s.related_skill_ids ?? [],
    createdAt: s.created_at ?? '',
    mentorCount: mentorProfiles.filter((mp) =>
      Array.isArray(mp.skill_ids) && mp.skill_ids.includes(s.id)
    ).length,
  }));
}

export async function adminCreateSkill(name: string, category: string): Promise<{ error: string | null; skill: AdminSkillRow | null }> {
  const supabase = createClient();
  const id = `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from('skills')
    .insert({ id, name: name.trim(), category: category.trim(), related_skill_ids: [] })
    .select('id, name, category, related_skill_ids, created_at')
    .single();

  if (error) {
    console.error('[adminService] adminCreateSkill error:', error.message);
    return { error: error.message, skill: null };
  }
  return {
    error: null,
    skill: {
      id: data.id,
      name: data.name,
      category: data.category,
      relatedSkillIds: data.related_skill_ids ?? [],
      createdAt: data.created_at ?? '',
      mentorCount: 0,
    },
  };
}

export async function adminDeleteSkill(skillId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from('skills').delete().eq('id', skillId);
  if (error) {
    console.error('[adminService] adminDeleteSkill error:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface AdminReportData {
  stats: AdminStats;
  mentors: AdminMentorRow[];
  skills: AdminSkillRow[];
  workshops: AdminWorkshopRow[];
  recentSessions: AdminSessionRow[];
}

export async function getAdminReportData(): Promise<AdminReportData> {
  const [stats, mentors, skills, workshops, recentSessions] = await Promise.all([
    getAdminStats(),
    getAdminMentors(),
    getAdminSkills(),
    getAdminWorkshops(),
    getAdminSessions(),
  ]);
  return { stats, mentors, skills, workshops, recentSessions };
}

// ─── Dashboard Overview ───────────────────────────────────────────────────────

export interface AdminDashboardData {
  stats: AdminStats;
  topMentors: AdminMentorRow[];
  recentSessions: AdminSessionRow[];
  upcomingWorkshops: AdminWorkshopRow[];
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [stats, mentors, sessions, workshops] = await Promise.all([
    getAdminStats(),
    getAdminMentors(),
    getAdminSessions(),
    getAdminWorkshops(),
  ]);

  const topMentors = [...mentors]
    .filter((m) => m.reviewCount > 0)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 5);

  const upcomingWorkshops = workshops
    .filter((w) => w.status === 'published')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return {
    stats,
    topMentors,
    recentSessions: sessions.slice(0, 5),
    upcomingWorkshops,
  };
}
