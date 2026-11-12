import { getDb, saveDb } from './dataService';
import { logout as authLogout } from './authService';

const RECS_KEY = 'skillsphere_student_recommendations';
const CONTACTS_KEY = 'skillsphere_employer_contacts';
const APPS_KEY = 'skillsphere_mentor_applications';

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage unavailable
  }
}

/**
 * Permanently delete a learner account and clean up all associated data.
 * Clears the auth session so the user is immediately signed out.
 */
export function deleteLearnerAccount(userId: string): void {
  const db = getDb();

  // Remove user and learner profile
  db.users = db.users.filter((u) => u.id !== userId);
  db.learnerProfiles = db.learnerProfiles.filter((p) => p.userId !== userId);

  // Remove learner from workshop registrations
  db.workshops.forEach((w) => {
    w.registeredLearnerIds = w.registeredLearnerIds.filter((id) => id !== userId);
  });

  // Cancel any pending or accepted sessions
  db.sessions = db.sessions.map((s) => {
    if (s.learnerId === userId && (s.status === 'pending' || s.status === 'accepted')) {
      return { ...s, status: 'cancelled' as const };
    }
    return s;
  });

  // Remove from saved mentors
  db.savedMentors = db.savedMentors.filter((s) => s.learnerId !== userId);

  // Remove their notifications
  db.notifications = db.notifications.filter((n) => n.userId !== userId);

  // Remove their roadmaps
  db.roadmaps = db.roadmaps.filter((r) => r.learnerId !== userId);

  saveDb();

  // Remove from recommendations (as student)
  const recs = readLS<Record<string, unknown>[]>(RECS_KEY, []);
  writeLS(
    RECS_KEY,
    recs.filter((r) => r['studentId'] !== userId)
  );

  // Remove employer contact requests for this learner
  const contacts = readLS<Record<string, unknown>[]>(CONTACTS_KEY, []);
  writeLS(
    CONTACTS_KEY,
    contacts.filter((c) => c['learnerId'] !== userId)
  );

  // Remove any mentor application the learner may have submitted
  const apps = readLS<Record<string, unknown>[]>(APPS_KEY, []);
  writeLS(
    APPS_KEY,
    apps.filter((a) => a['user_id'] !== userId)
  );

  // Clear the auth session
  authLogout();
}

/**
 * Permanently delete a mentor account and clean up all associated data.
 * Clears the auth session so the user is immediately signed out.
 */
export function deleteMentorAccount(userId: string): void {
  const db = getDb();

  // Remove user and mentor profile
  db.users = db.users.filter((u) => u.id !== userId);
  db.mentorProfiles = db.mentorProfiles.filter((p) => p.userId !== userId);

  // Cancel any pending or accepted sessions the mentor was part of
  db.sessions = db.sessions.map((s) => {
    if (s.mentorId === userId && (s.status === 'pending' || s.status === 'accepted')) {
      return { ...s, status: 'cancelled' as const };
    }
    return s;
  });

  // Cancel any published workshops this mentor created
  db.workshops = db.workshops.map((w) => {
    if (w.mentorId === userId && w.status === 'published') {
      return { ...w, status: 'cancelled' as const };
    }
    return w;
  });

  // Remove saved mentor references
  db.savedMentors = db.savedMentors.filter((s) => s.mentorId !== userId);

  // Remove their notifications
  db.notifications = db.notifications.filter((n) => n.userId !== userId);

  saveDb();

  // Remove their submitted recommendations
  const recs = readLS<Record<string, unknown>[]>(RECS_KEY, []);
  writeLS(
    RECS_KEY,
    recs.filter((r) => r['mentorId'] !== userId)
  );

  // Remove their mentor application
  const apps = readLS<Record<string, unknown>[]>(APPS_KEY, []);
  writeLS(
    APPS_KEY,
    apps.filter((a) => a['user_id'] !== userId)
  );

  // Clear the auth session
  authLogout();
}

