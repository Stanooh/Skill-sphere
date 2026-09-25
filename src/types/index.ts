export type UserRole = 'learner' | 'mentor' | 'admin';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SessionStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export type WorkshopStatus = 'upcoming' | 'completed' | 'cancelled';

export type Availability = 'available' | 'limited' | 'unavailable';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  relatedSkillIds?: string[];
}

export interface LearnerSkill {
  id: string;
  learnerId: string;
  skillId: string;
  level: SkillLevel;
}

export interface MentorSkill {
  id: string;
  mentorId: string;
  skillId: string;
  level: SkillLevel;
}

export interface LearnerProfile {
  id: string;
  userId: string;
  bio: string;
  location: string;
  education: string;
  learningGoal: string;
  targetTimeframe: string;
  availableHoursPerWeek: number;
  skillIds: string[];
  skillLevels: Record<string, SkillLevel>;
  profileComplete: boolean;
}

export interface MentorProfile {
  id: string;
  userId: string;
  professionalTitle: string;
  bio: string;
  location: string;
  experienceYears: number;
  education: string;
  certifications: string[];
  availability: Availability;
  mentorshipAreas: string[];
  skillIds: string[];
  rating: number;
  reviewCount: number;
  profileComplete: boolean;
}

export interface AdminProfile {
  id: string;
  userId: string;
  bio: string;
  role: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Mentor {
  user: User;
  profile: MentorProfile;
  skills: Skill[];
}

export interface Session {
  id: string;
  learnerId: string;
  mentorId: string;
  title: string;
  description: string;
  scheduledDate: string;
  durationMinutes: number;
  status: SessionStatus;
  createdAt: string;
}

export interface Workshop {
  id: string;
  mentorId: string;
  title: string;
  description: string;
  skillId: string;
  date: string;
  durationMinutes: number;
  capacity: number;
  registeredLearnerIds: string[];
  status: WorkshopStatus;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
  completed: boolean;
  completedAt?: string;
}

export interface Roadmap {
  id: string;
  learnerId: string;
  goal: string;
  currentLevel: SkillLevel;
  existingSkills: string[];
  targetSkills: string[];
  timeframe: string;
  milestones: RoadmapMilestone[];
  createdAt: string;
}

export interface SavedMentor {
  id: string;
  learnerId: string;
  mentorId: string;
  savedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MentorRecommendation {
  mentor: Mentor;
  matchScore: number;
  matchingSkills: Skill[];
  matchPercentage: number;
}

export interface Progress {
  learnerId: string;
  milestonesCompleted: number;
  totalMilestones: number;
  sessionsCompleted: number;
  workshopsCompleted: number;
  percentage: number;
}

// --- AI Feature Types ---

export interface CareerAdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  includeRoadmapLink?: boolean;
}

export interface LearnerContext {
  name: string;
  skills: { name: string; level: SkillLevel }[];
  learningGoal: string;
  targetTimeframe: string;
  availableHoursPerWeek: number;
  roadmapGoal?: string;
  roadmapProgress?: number;
}

export type MilestoneStatus = 'locked' | 'available' | 'in-progress' | 'completed';

export interface AIRoadmapMilestone {
  id: string;
  title: string;
  skill: string;
  description: string;
  status: MilestoneStatus;
  topics: string[];
  project: string;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  milestones: AIRoadmapMilestone[];
}

export interface LearningRoadmap {
  id: string;
  learnerId: string;
  careerPath: string;
  currentLevel: SkillLevel;
  targetTimeline: string;
  hoursPerWeek: number;
  phases: RoadmapPhase[];
  progress: number;
  createdAt: string;
}

export interface RoadmapGenerationInput {
  learnerId: string;
  careerPath: string;
  currentSkills: string[];
  skillLevels: Record<string, SkillLevel>;
  interests: string[];
  hoursPerWeek: number;
  targetTimeline: string;
}
