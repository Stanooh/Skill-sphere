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

const STORAGE_KEY = 'skillsphere_db';

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

function loadDb(): Database {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryDb = JSON.parse(raw) as Database;
      return memoryDb;
    }
  } catch {
    // fall through to default
  }
  memoryDb = getDefaultDb();
  saveDb();
  return memoryDb;
}

export function saveDb(): void {
  if (!memoryDb) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryDb));
  } catch {
    // storage might be full or unavailable — keep using memory
  }
}

export function resetDb(): void {
  memoryDb = getDefaultDb();
  saveDb();
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
  if (idx >= 0) {
    db.learnerProfiles[idx] = { ...db.learnerProfiles[idx], ...updates };
    saveDb();
    return db.learnerProfiles[idx];
  }
  const newProfile: LearnerProfile = {
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
  db.learnerProfiles.push(newProfile);
  saveDb();
  return newProfile;
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

export function getAllMentors(): Mentor[] {
  const db = loadDb();
  return db.users
    .filter((u) => u.role === 'mentor')
    .map((user) => {
      const profile = db.mentorProfiles.find((p) => p.userId === user.id)!;
      const skills = db.skills.filter((s) => profile.skillIds.includes(s.id));
      return { user, profile, skills };
    });
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

    // Matching mentorship areas to learning goal keywords
    const goalLower = learnerProfile.learningGoal.toLowerCase();
    for (const area of mentor.profile.mentorshipAreas) {
      if (goalLower.includes(area.toLowerCase().split(' ')[0])) {
        score += 3;
      }
    }

    // Matching level — mentor experience adds points
    if (mentor.profile.experienceYears >= 5) score += 2;

    // Availability bonus
    if (mentor.profile.availability === 'available') score += 2;
    else if (mentor.profile.availability === 'limited') score += 1;

    // Calculate percentage: max possible score is learner skills * 10 + area bonus + experience + availability
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
  // Add notification for mentor
  const mentor = db.users.find((u) => u.id === session.mentorId);
  if (mentor) {
    db.notifications.push({
      id: `n-${Date.now()}`,
      userId: session.mentorId,
      title: 'New Mentorship Request',
      message: `You have a new mentorship request for "${session.title}".`,
      read: false,
      createdAt: new Date().toISOString(),
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
    // Notify learner
    db.notifications.push({
      id: `n-${Date.now()}`,
      userId: db.sessions[idx].learnerId,
      title: `Session ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your session "${db.sessions[idx].title}" has been ${status}.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
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
    saveDb();
    return db.workshops[idx];
  }
  return undefined;
}

export function createWorkshop(workshop: Omit<Workshop, 'id' | 'registeredLearnerIds' | 'status'>): Workshop {
  const db = loadDb();
  const newWorkshop: Workshop = {
    ...workshop,
    id: `workshop-${Date.now()}`,
    registeredLearnerIds: [],
    status: 'upcoming',
  };
  db.workshops.push(newWorkshop);
  saveDb();
  return newWorkshop;
}

export function deleteWorkshop(workshopId: string): void {
  const db = loadDb();
  db.workshops = db.workshops.filter((w) => w.id !== workshopId);
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
    saveDb();
  }
}

export function unsaveMentor(learnerId: string, mentorId: string): void {
  const db = loadDb();
  db.savedMentors = db.savedMentors.filter(
    (s) => !(s.learnerId === learnerId && s.mentorId === mentorId)
  );
  saveDb();
}

// --- Roadmaps ---
export function getRoadmap(learnerId: string): Roadmap | undefined {
  return loadDb().roadmaps.find((r) => r.learnerId === learnerId);
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
  // Remove existing roadmap for this learner
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

export function toggleMilestone(roadmapId: string, milestoneId: string): Roadmap | undefined {
  const db = loadDb();
  const roadmap = db.roadmaps.find((r) => r.id === roadmapId);
  if (!roadmap) return undefined;
  const milestone = roadmap.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return undefined;
  milestone.completed = !milestone.completed;
  milestone.completedAt = milestone.completed ? new Date().toISOString() : undefined;
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
  }
}

export function markAllNotificationsRead(userId: string): void {
  const db = loadDb();
  db.notifications.forEach((n) => {
    if (n.userId === userId) n.read = true;
  });
  saveDb();
}

// --- Admin helpers ---
export function getPlatformStats() {
  const db = loadDb();
  const learners = db.users.filter((u) => u.role === 'learner');
  const mentors = db.users.filter((u) => u.role === 'mentor');
  const activeSessions = db.sessions.filter((s) => s.status === 'accepted' || s.status === 'pending');
  const upcomingWorkshops = db.workshops.filter((w) => w.status === 'upcoming');
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
        ? (db.mentorProfiles
            .filter((p) => mentors.some((m) => m.id === p.userId))
            .reduce((sum, p) => sum + p.rating, 0) / mentors.length).toFixed(1)
        : '0.0',
  };
}

// --- Skill management (admin) ---
export function createSkill(name: string, category: string): Skill {
  const db = loadDb();
  const newSkill: Skill = { id: `skill-${Date.now()}`, name, category };
  db.skills.push(newSkill);
  saveDb();
  return newSkill;
}

export function deleteSkill(skillId: string): void {
  const db = loadDb();
  db.skills = db.skills.filter((s) => s.id !== skillId);
  saveDb();
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
}
