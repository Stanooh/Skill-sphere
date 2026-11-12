import type { StudentRecommendation, RecommendationApprovalStatus } from '@/types';
import { getDb, pushNotification } from './dataService';

const RECS_KEY = 'skillsphere_student_recommendations';

function readRecs(): StudentRecommendation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECS_KEY);
    return raw ? (JSON.parse(raw) as StudentRecommendation[]) : [];
  } catch {
    return [];
  }
}

function writeRecs(recs: StudentRecommendation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECS_KEY, JSON.stringify(recs));
  } catch {
    // storage unavailable
  }
}

export function getRecommendationsForStudent(studentId: string): StudentRecommendation[] {
  return readRecs().filter((r) => r.studentId === studentId);
}

export function getRecommendationsForMentor(mentorId: string): StudentRecommendation[] {
  return readRecs().filter((r) => r.mentorId === mentorId);
}

export function getAcceptedRecommendationsForStudent(studentId: string): StudentRecommendation[] {
  return readRecs().filter(
    (r) => r.studentId === studentId && r.studentApprovalStatus === 'accepted'
  );
}

export function hasExistingRecommendation(mentorId: string, studentId: string): boolean {
  return readRecs().some((r) => r.mentorId === mentorId && r.studentId === studentId);
}

export function createRecommendation(
  data: Omit<StudentRecommendation, 'id' | 'createdAt' | 'updatedAt' | 'studentApprovalStatus'>
): StudentRecommendation | { error: string } {
  const db = getDb();

  // Validate mentor has an active or completed session with this student
  const hasSession = db.sessions.some(
    (s) =>
      s.mentorId === data.mentorId &&
      s.learnerId === data.studentId &&
      (s.status === 'accepted' || s.status === 'completed')
  );
  if (!hasSession) {
    return {
      error: 'You can only recommend students you have an active or completed session with.',
    };
  }

  if (hasExistingRecommendation(data.mentorId, data.studentId)) {
    return { error: 'You have already submitted a recommendation for this student.' };
  }

  const recs = readRecs();
  const now = new Date().toISOString();
  const newRec: StudentRecommendation = {
    ...data,
    id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    studentApprovalStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  recs.push(newRec);
  writeRecs(recs);

  // Notify the student
  const mentor = db.users.find((u) => u.id === data.mentorId);
  pushNotification(
    data.studentId,
    'New Mentor Recommendation',
    `${mentor?.name ?? 'Your mentor'} has submitted a professional recommendation for you. Review it in your profile to decide whether to display it publicly.`
  );

  return newRec;
}

export function updateRecommendation(
  recId: string,
  mentorId: string,
  updates: Partial<
    Pick<
      StudentRecommendation,
      | 'strengths'
      | 'technicalSkills'
      | 'communicationAssessment'
      | 'problemSolvingAssessment'
      | 'achievements'
      | 'careerAreas'
      | 'recommendation'
    >
  >
): StudentRecommendation | { error: string } {
  const recs = readRecs();
  const idx = recs.findIndex((r) => r.id === recId && r.mentorId === mentorId);
  if (idx < 0) {
    return { error: 'Recommendation not found or you do not have permission to edit it.' };
  }
  recs[idx] = { ...recs[idx], ...updates, updatedAt: new Date().toISOString() };
  writeRecs(recs);
  return recs[idx];
}

export function withdrawRecommendation(recId: string, mentorId: string): boolean {
  const recs = readRecs();
  const idx = recs.findIndex((r) => r.id === recId && r.mentorId === mentorId);
  if (idx < 0) return false;
  recs.splice(idx, 1);
  writeRecs(recs);
  return true;
}

export function updateStudentApproval(
  recId: string,
  studentId: string,
  status: RecommendationApprovalStatus
): boolean {
  const recs = readRecs();
  const idx = recs.findIndex((r) => r.id === recId && r.studentId === studentId);
  if (idx < 0) return false;
  recs[idx] = { ...recs[idx], studentApprovalStatus: status, updatedAt: new Date().toISOString() };
  writeRecs(recs);
  return true;
}

export function getAllRecommendations(): StudentRecommendation[] {
  return readRecs();
}

export function adminDeleteRecommendation(recId: string): boolean {
  const recs = readRecs();
  const idx = recs.findIndex((r) => r.id === recId);
  if (idx < 0) return false;
  recs.splice(idx, 1);
  writeRecs(recs);
  return true;
}

export function seedMockRecommendations(): void {
  if (typeof window === 'undefined') return;
  const existing = readRecs();
  if (existing.length > 0) return;
  const now = new Date().toISOString();
  const mock: StudentRecommendation[] = [
    {
      id: 'rec-mock-1',
      mentorId: 'user-mentor-1',
      studentId: 'user-learner-1',
      strengths: ['Problem solving', 'Quick learner', 'Attention to detail'],
      technicalSkills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS'],
      communicationAssessment:
        'Brian communicates clearly and asks thoughtful questions during sessions. He documents his progress well and follows up consistently.',
      problemSolvingAssessment:
        'He approaches problems methodically, breaking them into smaller components. He shows strong debugging skills for his level.',
      achievements: [
        'Completed the React Architecture module',
        'Built a full CRUD application with custom hooks',
      ],
      careerAreas: ['Frontend Developer', 'React Developer', 'Full-Stack Developer'],
      recommendation:
        'Throughout our mentorship, Brian demonstrated strong problem-solving skills, consistency, and an excellent ability to apply newly learned concepts. He has shown particular strength in frontend development and collaborative project work. I believe he would be a strong candidate for an entry-level frontend developer or React developer position. His dedication and growth mindset set him apart from many learners I have worked with.',
      studentApprovalStatus: 'accepted',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rec-mock-2',
      mentorId: 'user-mentor-4',
      studentId: 'user-learner-3',
      strengths: ['Design sensibility', 'UI precision', 'Creative problem solving'],
      technicalSkills: ['UI/UX Design', 'Figma', 'CSS', 'HTML'],
      communicationAssessment:
        "Kevin communicates his design decisions clearly and is very open to feedback. He collaborates effectively and meets deadlines.",
      problemSolvingAssessment:
        "Kevin approaches frontend challenges from a designer's perspective, which gives him a unique edge in building pixel-perfect interfaces.",
      achievements: [
        'Completed Design Systems with Tailwind workshop',
        'Created a full component library in Figma',
      ],
      careerAreas: ['UI/UX Designer', 'Frontend Developer', 'Product Designer'],
      recommendation:
        'Kevin brings a rare combination of strong design instincts and growing technical ability. His work on design systems and interface design demonstrates professional maturity beyond his level. He would excel in a UI/UX design or frontend development role, particularly in product-focused teams.',
      studentApprovalStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    },
  ];
  writeRecs(mock);
}

