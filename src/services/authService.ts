import type { User, UserRole } from '@/types';
import { getUserByEmail, getDb, saveDb } from './dataService';

const SESSION_KEY = 'skillsphere_session';

export function login(email: string, _password: string): User | null {
  const user = getUserByEmail(email);
  if (!user) return null;
  const session = { userId: user.id };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return user;
}

export function register(name: string, email: string, role: UserRole): User | null {
  const db = getDb();
  const safeRole: Exclude<UserRole, 'admin'> = role === 'mentor' ? 'mentor' : 'learner';
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return null;
  }
  const newUser: User = {
    id: `user-${safeRole}-${Date.now()}`,
    role: safeRole,
    name,
    email,
    avatar: `https://i.pravatar.cc/150?u=${email}`,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);

  if (safeRole === 'mentor') {
    db.mentorProfiles.push({
      id: `mp-${Date.now()}`,
      userId: newUser.id,
      professionalTitle: '',
      bio: '',
      location: '',
      experienceYears: 0,
      education: '',
      certifications: [],
      availability: 'available',
      mentorshipAreas: [],
      skillIds: [],
      rating: 0,
      reviewCount: 0,
      profileComplete: false,
    });
  } else {
    db.learnerProfiles.push({
      id: `lp-${Date.now()}`,
      userId: newUser.id,
      bio: '',
      location: '',
      education: '',
      learningGoal: '',
      targetTimeframe: '',
      availableHoursPerWeek: 0,
      skillIds: [],
      skillLevels: {},
      profileComplete: false,
    });
  }

  saveDb();
  const session = { userId: newUser.id };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return newUser;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    const db = getDb();
    return db.users.find((u) => u.id === userId) ?? null;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    return userId;
  } catch {
    return null;
  }
}
