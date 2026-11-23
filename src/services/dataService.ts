import { createClient } from '@/lib/supabase/client';
import type {
  User,
  UserRole,
  LearnerProfile,
  MentorProfile,
  AdminProfile,
  Skill,
  Session,
  Workshop,
  Roadmap,
  RoadmapMilestone,
  SavedMentor,
  Notification,
  MentorRecommendation,
  Mentor,
  Progress,
} from '@/types';
import {
  mockUsers,
  mockSkills,
  mockLearnerProfiles,
  mockMentorProfiles,
  mockAdminProfile,
  mockSessions,
  mockWorkshops,
  mockRoadmaps,
  mockSavedMentors,
  mockNotifications,
} from '@/data/mockData';

interface Database {
  users: User[];
  skills: Skill[];
  learnerProfiles: LearnerProfile[];
  mentorProfiles: MentorProfile[];
  adminProfile: AdminProfile;
  sessions: Session[];
  workshops: Workshop[];
  roadmaps: Roadmap[];
  savedMentors: SavedMentor[];
  notifications: Notification[];
}

function getDefaultDb(): Database {
  return {
    users: structuredClone(mockUsers),
    skills: structuredClone(mockSkills),
    learnerProfiles: structuredClone(mockLearnerProfiles),
    mentorProfiles: structuredClone(mockMentorProfiles),
    adminProfile: structuredClone(mockAdminProfile),
    sessions: structuredClone(mockSessions),
    workshops: structuredClone(mockWorkshops),
    roadmaps: structuredClone(mockRoadmaps),
    savedMentors: structuredClone(mockSavedMentors),
    notifications: structuredClone(mockNotifications),
  };
}

let memoryDb: Database | null = null;
let supabaseSyncStarted = false;

export async function syncDatabaseWithSupabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  const supabase = createClient();
  try {
    const [
      profilesRes,
      skillsRes,
      mentorProfilesRes,
      learnerProfilesRes,
      workshopsRes,
      registrationsRes,
      sessionsRes,
      savedMentorsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('skills').select('*'),
      supabase.from('mentor_profiles').select('*'),
      supabase.from('learner_profiles').select('*'),
      supabase.from('workshops').select('*'),
      supabase.from('workshop_registrations').select('*'),
      supabase.from('sessions').select('*'),
      supabase.from('saved_mentors').select('*'),
    ]);

    const db = loadDb();

    if (profilesRes.data && profilesRes.data.length > 0) {
      for (const p of profilesRes.data) {
        const existingIdx = db.users.findIndex((u) => u.id === p.id);
        const mappedUser: User = {
          id: p.id,
          name: p.full_name || 'User',
          email: p.email || '',
          role: p.role || 'learner',
          avatar: p.avatar_url || undefined,
          createdAt: p.created_at || new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          db.users[existingIdx] = { ...db.users[existingIdx], ...mappedUser };
        } else {
          db.users.push(mappedUser);
        }
      }
    }

    if (skillsRes.data && skillsRes.data.length > 0) {
      for (const s of skillsRes.data) {
        const existingIdx = db.skills.findIndex((sk) => sk.id === s.id);
        const mappedSkill: Skill = {
          id: s.id,
          name: s.name,
          category: s.category,
          relatedSkillIds: s.related_skill_ids || [],
        };
        if (existingIdx >= 0) {
          db.skills[existingIdx] = mappedSkill;
        } else {
          db.skills.push(mappedSkill);
        }
      }
    }

    if (mentorProfilesRes.data && mentorProfilesRes.data.length > 0) {
      for (const mp of mentorProfilesRes.data) {
        const existingIdx = db.mentorProfiles.findIndex((p) => p.userId === mp.user_id);
        const mappedProfile: MentorProfile = {
          id: mp.id,
          userId: mp.user_id,
          professionalTitle: mp.professional_title || '',
          bio: mp.bio || '',
          location: mp.location || '',
          experienceYears: mp.experience_years || 0,
          education: mp.education || '',
          certifications: mp.certifications || [],
          availability: mp.availability || 'available',
          mentorshipAreas: mp.mentorship_areas || [],
          skillIds: mp.skill_ids || [],
          rating: Number(mp.rating) || 0,
          reviewCount: Number(mp.review_count) || 0,
          profileComplete: mp.profile_complete,
          activated: mp.activated,
        };
        if (existingIdx >= 0) {
          db.mentorProfiles[existingIdx] = mappedProfile;
        } else {
          db.mentorProfiles.push(mappedProfile);
        }
      }
    }

    if (learnerProfilesRes.data && learnerProfilesRes.data.length > 0) {
      for (const lp of learnerProfilesRes.data) {
        const existingIdx = db.learnerProfiles.findIndex((p) => p.userId === lp.user_id);
        const mappedProfile: LearnerProfile = {
          id: lp.id,
          userId: lp.user_id,
          bio: lp.bio || '',
          location: lp.location || '',
          education: lp.education || '',
          learningGoal: lp.learning_goal || '',
          targetTimeframe: lp.target_timeframe || '',
          availableHoursPerWeek: lp.available_hours_per_week || 0,
          skillIds: lp.skill_ids || [],
          skillLevels: lp.skill_levels || {},
          profileComplete: lp.profile_complete,
          employerVisibility: lp.employer_visibility,
        };
        if (existingIdx >= 0) {
          db.learnerProfiles[existingIdx] = mappedProfile;
        } else {
          db.learnerProfiles.push(mappedProfile);
        }
      }
    }

    if (workshopsRes.data && workshopsRes.data.length > 0) {
      const regMap = new Map<string, string[]>();
      for (const r of (registrationsRes.data || [])) {
        const list = regMap.get(r.workshop_id) || [];
        list.push(r.learner_id);
        regMap.set(r.workshop_id, list);
      }
      for (const w of workshopsRes.data) {
        const existingIdx = db.workshops.findIndex((item) => item.id === w.id);
        const mappedWorkshop: Workshop = {
          id: w.id,
          mentorId: w.mentor_id,
          skillId: w.skill_id || '',
          title: w.title,
          description: w.description,
          date: w.date,
          startTime: w.start_time || undefined,
          endTime: w.end_time || undefined,
          durationMinutes: w.duration_minutes || 60,
          capacity: w.capacity || 20,
          registeredLearnerIds: regMap.get(w.id) || [],
          status: w.status,
          coverImage: w.cover_image || undefined,
          format: w.format || 'online',
          meetingLink: w.meeting_link || undefined,
        };
        if (existingIdx >= 0) {
          db.workshops[existingIdx] = mappedWorkshop;
        } else {
          db.workshops.push(mappedWorkshop);
        }
      }
    }

    if (sessionsRes.data && sessionsRes.data.length > 0) {
      for (const s of sessionsRes.data) {
        const existingIdx = db.sessions.findIndex((item) => item.id === s.id);
        const mappedSession: Session = {
          id: s.id,
          learnerId: s.learner_id,
          mentorId: s.mentor_id,
          title: s.title,
          description: s.description,
          scheduledDate: s.scheduled_date,
          durationMinutes: s.duration_minutes,
          status: s.status,
          createdAt: s.created_at,
        };
        if (existingIdx >= 0) {
          db.sessions[existingIdx] = mappedSession;
        } else {
          db.sessions.push(mappedSession);
        }
      }
    }

    if (savedMentorsRes.data && savedMentorsRes.data.length > 0) {
      for (const sm of savedMentorsRes.data) {
        const exists = db.savedMentors.some(
          (item) => item.learnerId === sm.learner_id && item.mentorId === sm.mentor_id
        );
        if (!exists) {
          db.savedMentors.push({
            id: sm.id,
            learnerId: sm.learner_id,
            mentorId: sm.mentor_id,
            savedAt: sm.created_at,
          });
        }
      }
    }
  } catch (err) {
    console.error('[dataService] syncDatabaseWithSupabase error:', err);
  }
}

function loadDb(): Database {
  if (memoryDb) return memoryDb;
  memoryDb = getDefaultDb();

  if (typeof window !== 'undefined' && !supabaseSyncStarted) {
    supabaseSyncStarted = true;
    void syncDatabaseWithSupabase();
  }

  return memoryDb;
}

export function saveDb(): void {
  // Maintained in memory, synchronized with Supabase
}

export function resetDb(): void {
  memoryDb = getDefaultDb();
}

export function getDb(): Database {
  return loadDb();
}

// --- Users ---
export function getUsers(): User[] {
  return loadDb().users;
}

export function getUserById(id: string): User | undefined {
  return loadDb().users.find((u) => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return loadDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUsersByRole(role: UserRole): User[] {
  return loadDb().users.filter((u) => u.role === role);
}

export function setUserRole(userId: string, role: UserRole): void {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (user && user.role !== 'admin') {
    user.role = role;
    saveDb();
    if (typeof window !== 'undefined') {
      const supabase = createClient();
      void supabase.from('profiles').update({ role }).eq('id', userId);
    }
  }
}

// --- Skills ---
export function getSkills(): Skill[] {
  return loadDb().skills;
}

export function getSkillById(id: string): Skill | undefined {
  return loadDb().skills.find((s) => s.id === id);
}

export function getSkillsByIds(ids: string[]): Skill[] {
  return loadDb().skills.filter((s) => ids.includes(s.id));
}

// --- Learner Profiles ---
export function getLearnerProfile(userId: string): LearnerProfile | undefined {
  return loadDb().learnerProfiles.find((p) => p.userId === userId);
}

export function updateLearnerProfile(userId: string, updates: Partial<LearnerProfile>): LearnerProfile | undefined {
  const db = loadDb();
  const idx = db.learnerProfiles.findIndex((p) => p.userId === userId);
  let updatedProfile: LearnerProfile;

  if (idx >= 0) {
    db.learnerProfiles[idx] = { ...db.learnerProfiles[idx], ...updates };
    updatedProfile = db.learnerProfiles[idx];
  } else {
    updatedProfile = {
      id: `lp-${Date.now()}`,
      userId,
      bio: '',
      location: '',
      education: '',
      learningGoal: '',
      targetTimeframe: '',
      availableHoursPerWeek: 0,
      skillIds: [],
      skillLevels: {},
      profileComplete: false,
      ...updates,
    };
    db.learnerProfiles.push(updatedProfile);
  }
  saveDb();

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('learner_profiles').upsert({
      user_id: userId,
      bio: updatedProfile.bio,
      location: updatedProfile.location,
      education: updatedProfile.education,
      learning_goal: updatedProfile.learningGoal,
      target_timeframe: updatedProfile.targetTimeframe,
      available_hours_per_week: updatedProfile.availableHoursPerWeek,
      skill_ids: updatedProfile.skillIds,
      skill_levels: updatedProfile.skillLevels,
      profile_complete: updatedProfile.profileComplete,
      employer_visibility: updatedProfile.employerVisibility ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }

  return updatedProfile;
}

// --- Mentor Profiles ---
export function getMentorProfile(userId: string): MentorProfile | undefined {
  return loadDb().mentorProfiles.find((p) => p.userId === userId);
}

export function updateMentorProfile(userId: string, updates: Partial<MentorProfile>): MentorProfile | undefined {
  const db = loadDb();
  const idx = db.mentorProfiles.findIndex((p) => p.userId === userId);
  if (idx >= 0) {
    db.mentorProfiles[idx] = { ...db.mentorProfiles[idx], ...updates };
    saveDb();

    if (typeof window !== 'undefined') {
      const supabase = createClient();
      const p = db.mentorProfiles[idx];
      void supabase.from('mentor_profiles').update({
        professional_title: p.professionalTitle,
        bio: p.bio,
        location: p.location,
        experience_years: p.experienceYears,
        education: p.education,
        certifications: p.certifications,
        availability: p.availability,
        mentorship_areas: p.mentorshipAreas,
        skill_ids: p.skillIds,
        profile_complete: p.profileComplete,
        activated: p.activated,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId);
    }

    return db.mentorProfiles[idx];
  }
  return undefined;
}

// --- Admin Profile ---
export function getAdminProfile(userId: string): AdminProfile | undefined {
  const db = loadDb();
  return db.adminProfile.userId === userId ? db.adminProfile : undefined;
}

// --- Mentor helpers ---
export function getMentor(userId: string): Mentor | undefined {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId && u.role === 'mentor');
  const profile = db.mentorProfiles.find((p) => p.userId === userId);
  if (!user || !profile) return undefined;
  const skills = db.skills.filter((s) => profile.skillIds.includes(s.id));
  return { user, profile, skills };
}

function isPublicMentor(user: User, profile: MentorProfile): boolean {
  return (
    user.role === 'mentor' &&
    profile.activated &&
    isMentorProfileComplete(profile)
  );
}

export function isMentorProfileComplete(profile: MentorProfile): boolean {
  return (
    profile.profileComplete &&
    profile.professionalTitle.trim().length > 0 &&
    profile.bio.trim().length > 0 &&
    profile.skillIds.length > 0 &&
    profile.availability !== 'unavailable'
  );
}

export function getAllMentors(): Mentor[] {
  const db = loadDb();
  return db.users
    .filter((u) => u.role === 'mentor')
    .map((user) => {
      const profile = db.mentorProfiles.find((p) => p.userId === user.id);
      if (!profile) return null;
      const skills = db.skills.filter((s) => profile.skillIds.includes(s.id));
      return { user, profile, skills };
    })
    .filter((m): m is Mentor => m !== null && isPublicMentor(m.user, m.profile));
}

export function getPublicMentor(userId: string): Mentor | undefined {
  return getAllMentors().find((mentor) => mentor.user.id === userId);
}

export function isApprovedMentor(userId: string): boolean {
  const db = loadDb();
  const user = db.users.find((u) => u.id === userId);
  const profile = db.mentorProfiles.find((p) => p.userId === userId);
  return user?.role === 'mentor' && profile?.activated === true;
}

// --- Recommendation Engine ---
export function getRecommendedMentors(learnerId: string): MentorRecommendation[] {
  const db = loadDb();
  const learnerProfile = db.learnerProfiles.find((p) => p.userId === learnerId);
  if (!learnerProfile || learnerProfile.skillIds.length === 0) return [];

  const learnerSkillIds = new Set(learnerProfile.skillIds);
  const mentors = getAllMentors();
  const recommendations: MentorRecommendation[] = [];

  for (const mentor of mentors) {
    let score = 0;
    const matchingSkills: Skill[] = [];

    for (const mentorSkill of mentor.skills) {
      if (learnerSkillIds.has(mentorSkill.id)) {
        score += 10;
        matchingSkills.push(mentorSkill);
      } else if (mentorSkill.relatedSkillIds?.some((rid) => learnerSkillIds.has(rid))) {
        score += 5;
      }
    }

    const goalLower = learnerProfile.learningGoal.toLowerCase();
    for (const area of mentor.profile.mentorshipAreas) {
      if (goalLower.includes(area.toLowerCase().split(' ')[0])) {
        score += 3;
      }
    }

    if (mentor.profile.experienceYears >= 5) score += 2;

    if (mentor.profile.availability === 'available') score += 2;
    else if (mentor.profile.availability === 'limited') score += 1;

    const maxPossible = learnerProfile.skillIds.length * 10 + 3 + 2 + 2;
    const matchPercentage = Math.min(100, Math.round((score / maxPossible) * 100));

    if (matchPercentage > 0) {
      recommendations.push({
        mentor,
        matchScore: score,
        matchingSkills,
        matchPercentage,
      });
    }
  }

  return recommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

// --- Sessions ---
export function getSessionsForLearner(learnerId: string): Session[] {
  return loadDb().sessions.filter((s) => s.learnerId === learnerId);
}

export function getSessionsForMentor(mentorId: string): Session[] {
  return loadDb().sessions.filter((s) => s.mentorId === mentorId);
}

export function createSession(session: Omit<Session, 'id' | 'createdAt'>): Session {
  const db = loadDb();
  const newSession: Session = {
    ...session,
    id: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  db.sessions.push(newSession);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('sessions').insert({
      learner_id: session.learnerId,
      mentor_id: session.mentorId,
      title: session.title,
      description: session.description || '',
      scheduled_date: session.scheduledDate,
      duration_minutes: session.durationMinutes,
      status: session.status || 'pending',
    });
  }

  saveDb();
  return newSession;
}

export function updateSessionStatus(sessionId: string, status: Session['status']): Session | undefined {
  const db = loadDb();
  const idx = db.sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    db.sessions[idx].status = status;

    if (typeof window !== 'undefined') {
      const supabase = createClient();
      void supabase.from('sessions').update({ status, updated_at: new Date().toISOString() }).eq('id', sessionId);
    }

    saveDb();
    return db.sessions[idx];
  }
  return undefined;
}

// --- Workshops ---
export function getWorkshops(): Workshop[] {
  return loadDb().workshops;
}

export function getWorkshopById(id: string): Workshop | undefined {
  return loadDb().workshops.find((w) => w.id === id);
}

export function getWorkshopsForMentor(mentorId: string): Workshop[] {
  return loadDb().workshops.filter((w) => w.mentorId === mentorId);
}

export function registerForWorkshop(workshopId: string, learnerId: string): Workshop | undefined {
  const db = loadDb();
  const idx = db.workshops.findIndex((w) => w.id === workshopId);
  if (idx >= 0 && !db.workshops[idx].registeredLearnerIds.includes(learnerId)) {
    if (db.workshops[idx].registeredLearnerIds.length < db.workshops[idx].capacity) {
      db.workshops[idx].registeredLearnerIds.push(learnerId);

      if (typeof window !== 'undefined') {
        const supabase = createClient();
        void supabase.from('workshop_registrations').insert({
          workshop_id: workshopId,
          learner_id: learnerId,
        });
      }

      saveDb();
    }
    return db.workshops[idx];
  }
  return undefined;
}

export function unregisterFromWorkshop(workshopId: string, learnerId: string): Workshop | undefined {
  const db = loadDb();
  const idx = db.workshops.findIndex((w) => w.id === workshopId);
  if (idx >= 0) {
    db.workshops[idx].registeredLearnerIds = db.workshops[idx].registeredLearnerIds.filter(
      (id) => id !== learnerId
    );

    if (typeof window !== 'undefined') {
      const supabase = createClient();
      void supabase
        .from('workshop_registrations')
        .delete()
        .eq('workshop_id', workshopId)
        .eq('learner_id', learnerId);
    }

    saveDb();
    return db.workshops[idx];
  }
  return undefined;
}

export function createWorkshop(workshop: Omit<Workshop, 'id' | 'registeredLearnerIds'>): Workshop {
  const db = loadDb();
  const newWorkshop: Workshop = {
    ...workshop,
    id: `workshop-${Date.now()}`,
    registeredLearnerIds: [],
  };
  db.workshops.push(newWorkshop);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('workshops').insert({
      mentor_id: workshop.mentorId,
      skill_id: workshop.skillId || null,
      title: workshop.title,
      description: workshop.description,
      date: workshop.date.includes('T') ? workshop.date.split('T')[0] : workshop.date,
      start_time: workshop.startTime || null,
      end_time: workshop.endTime || null,
      duration_minutes: workshop.durationMinutes,
      capacity: workshop.capacity,
      status: workshop.status || 'draft',
      cover_image: workshop.coverImage || null,
      format: workshop.format || 'online',
      meeting_link: workshop.meetingLink || null,
    });
  }

  saveDb();
  return newWorkshop;
}

export function updateWorkshop(workshopId: string, updates: Partial<Workshop>): Workshop | undefined {
  const db = loadDb();
  const idx = db.workshops.findIndex((w) => w.id === workshopId);
  if (idx < 0) return undefined;
  db.workshops[idx] = { ...db.workshops[idx], ...updates };

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    const w = db.workshops[idx];
    void supabase.from('workshops').update({
      title: w.title,
      description: w.description,
      skill_id: w.skillId || null,
      date: w.date.includes('T') ? w.date.split('T')[0] : w.date,
      start_time: w.startTime || null,
      end_time: w.endTime || null,
      duration_minutes: w.durationMinutes,
      capacity: w.capacity,
      status: w.status,
      cover_image: w.coverImage || null,
      format: w.format || 'online',
      meeting_link: w.meetingLink || null,
      updated_at: new Date().toISOString(),
    }).eq('id', workshopId);
  }

  saveDb();
  return db.workshops[idx];
}

export function deleteWorkshop(workshopId: string): void {
  const db = loadDb();
  db.workshops = db.workshops.filter((w) => w.id !== workshopId);

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('workshops').delete().eq('id', workshopId);
  }

  saveDb();
}

// --- Saved Mentors ---
export function getSavedMentors(learnerId: string): SavedMentor[] {
  return loadDb().savedMentors.filter((s) => s.learnerId === learnerId);
}

export function isMentorSaved(learnerId: string, mentorId: string): boolean {
  return loadDb().savedMentors.some((s) => s.learnerId === learnerId && s.mentorId === mentorId);
}

export function saveMentor(learnerId: string, mentorId: string): void {
  const db = loadDb();
  if (!db.savedMentors.some((s) => s.learnerId === learnerId && s.mentorId === mentorId)) {
    db.savedMentors.push({
      id: `sm-${Date.now()}`,
      learnerId,
      mentorId,
      savedAt: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      const supabase = createClient();
      void supabase.from('saved_mentors').insert({
        learner_id: learnerId,
        mentor_id: mentorId,
      });
    }

    saveDb();
  }
}

export function unsaveMentor(learnerId: string, mentorId: string): void {
  const db = loadDb();
  db.savedMentors = db.savedMentors.filter(
    (s) => !(s.learnerId === learnerId && s.mentorId === mentorId)
  );

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase
      .from('saved_mentors')
      .delete()
      .eq('learner_id', learnerId)
      .eq('mentor_id', mentorId);
  }

  saveDb();
}

// --- Roadmaps ---
export function getRoadmap(learnerId: string): Roadmap | undefined {
  return loadDb().roadmaps.find((r) => r.learnerId === learnerId);
}

export function createRoadmap(
  roadmap: Omit<Roadmap, 'id' | 'createdAt' | 'milestones'> & {
    milestones: Omit<RoadmapMilestone, 'id'>[];
  }
): Roadmap {
  const db = loadDb();
  const newRoadmap: Roadmap = {
    ...roadmap,
    id: `rm-${Date.now()}`,
    createdAt: new Date().toISOString(),
    milestones: roadmap.milestones.map((m, i) => ({
      ...m,
      id: `ms-${Date.now()}-${i}`,
    })),
  };
  db.roadmaps = db.roadmaps.filter((r) => r.learnerId !== roadmap.learnerId);
  db.roadmaps.push(newRoadmap);
  saveDb();
  return newRoadmap;
}

export function generateRoadmap(params: {
  learnerId: string;
  goal: string;
  currentLevel: string;
  existingSkills: string[];
  targetSkills: string[];
  timeframe: string;
}): Roadmap {
  const db = loadDb();
  db.roadmaps = db.roadmaps.filter((r) => r.learnerId !== params.learnerId);

  const milestones: RoadmapMilestone[] = params.targetSkills.map((skillId, idx) => {
    const skill = db.skills.find((s) => s.id === skillId);
    return {
      id: `m-${Date.now()}-${idx}`,
      title: skill?.name ?? `Step ${idx + 1}`,
      description: `Learn and master ${skill?.name ?? `skill ${idx + 1}`}.`,
      order: idx + 1,
      completed: false,
    };
  });

  const newRoadmap: Roadmap = {
    id: `roadmap-${Date.now()}`,
    learnerId: params.learnerId,
    goal: params.goal,
    currentLevel: params.currentLevel as Roadmap['currentLevel'],
    existingSkills: params.existingSkills,
    targetSkills: params.targetSkills,
    timeframe: params.timeframe,
    milestones,
    createdAt: new Date().toISOString(),
  };

  db.roadmaps.push(newRoadmap);
  saveDb();
  return newRoadmap;
}

export function updateRoadmap(roadmapId: string, updates: Partial<Roadmap>): Roadmap | undefined {
  const db = loadDb();
  const idx = db.roadmaps.findIndex((r) => r.id === roadmapId);
  if (idx < 0) return undefined;
  db.roadmaps[idx] = { ...db.roadmaps[idx], ...updates };
  saveDb();
  return db.roadmaps[idx];
}

export function toggleMilestone(roadmapId: string, milestoneId: string): Roadmap | undefined {
  const db = loadDb();
  const roadmap = db.roadmaps.find((r) => r.id === roadmapId);
  if (!roadmap) return undefined;
  const milestone = roadmap.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return undefined;
  milestone.completed = !milestone.completed;
  saveDb();
  return roadmap;
}

// --- Progress ---
export function getProgress(learnerId: string): Progress {
  const db = loadDb();
  const roadmap = db.roadmaps.find((r) => r.learnerId === learnerId);
  const sessions = db.sessions.filter((s) => s.learnerId === learnerId && s.status === 'completed');
  const workshops = db.workshops.filter(
    (w) => w.registeredLearnerIds.includes(learnerId) && w.status === 'completed'
  );

  const milestonesCompleted = roadmap?.milestones.filter((m) => m.completed).length ?? 0;
  const totalMilestones = roadmap?.milestones.length ?? 0;

  return {
    learnerId,
    milestonesCompleted,
    totalMilestones,
    sessionsCompleted: sessions.length,
    workshopsCompleted: workshops.length,
    percentage: totalMilestones > 0 ? Math.round((milestonesCompleted / totalMilestones) * 100) : 0,
  };
}

// --- Notifications ---
export function getNotifications(userId: string): Notification[] {
  return loadDb().notifications.filter((n) => n.userId === userId);
}

export function markNotificationRead(notificationId: string): void {
  const db = loadDb();
  const notif = db.notifications.find((n) => n.id === notificationId);
  if (notif) {
    notif.read = true;
    saveDb();
    if (typeof window !== 'undefined') {
      const supabase = createClient();
      void supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    }
  }
}

export function markAllNotificationsRead(userId: string): void {
  const db = loadDb();
  db.notifications.forEach((n) => {
    if (n.userId === userId) n.read = true;
  });
  saveDb();
  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  }
}

export function pushNotification(userId: string, title: string, message: string): void {
  const db = loadDb();
  db.notifications.push({
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();
  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      read: false,
    });
  }
}

// --- Admin helpers ---
export function getPlatformStats() {
  const db = loadDb();
  const learners = db.users.filter((u) => u.role === 'learner');
  const mentors = db.users.filter((u) => u.role === 'mentor');
  const activeSessions = db.sessions.filter((s) => s.status === 'accepted' || s.status === 'pending');
  const upcomingWorkshops = db.workshops.filter((w) => w.status === 'published');
  const completedSessions = db.sessions.filter((s) => s.status === 'completed');
  const totalSkills = db.skills.length;

  return {
    totalLearners: learners.length,
    totalMentors: mentors.length,
    activeSessions: activeSessions.length,
    upcomingWorkshops: upcomingWorkshops.length,
    completedSessions: completedSessions.length,
    totalSkills,
    totalWorkshops: db.workshops.length,
    totalSessions: db.sessions.length,
    pendingRequests: db.sessions.filter((s) => s.status === 'pending').length,
    avgMentorRating:
      mentors.length > 0
        ? (
            db.mentorProfiles
              .filter((p) => mentors.some((m) => m.id === p.userId))
              .reduce((sum, p) => sum + p.rating, 0) / mentors.length
          ).toFixed(1)
        : '0.0',
  };
}

// --- Skill management (admin) ---
export function createSkill(name: string, category: string): Skill {
  const db = loadDb();
  const newSkill: Skill = { id: `skill-${Date.now()}`, name, category };
  db.skills.push(newSkill);
  saveDb();

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('skills').insert({ name, category });
  }

  return newSkill;
}

export function deleteSkill(skillId: string): void {
  const db = loadDb();
  db.skills = db.skills.filter((s) => s.id !== skillId);
  saveDb();

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('skills').delete().eq('id', skillId);
  }
}

// --- User management (admin) ---
export function deleteUser(userId: string): void {
  const db = loadDb();
  db.users = db.users.filter((u) => u.id !== userId);
  db.learnerProfiles = db.learnerProfiles.filter((p) => p.userId !== userId);
  db.mentorProfiles = db.mentorProfiles.filter((p) => p.userId !== userId);
  db.sessions = db.sessions.filter((s) => s.learnerId !== userId && s.mentorId !== userId);
  db.savedMentors = db.savedMentors.filter((s) => s.learnerId !== userId && s.mentorId !== userId);
  saveDb();

  if (typeof window !== 'undefined') {
    const supabase = createClient();
    void supabase.from('profiles').delete().eq('id', userId);
  }
}
