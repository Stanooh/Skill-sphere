export type UserRole = 'learner' | 'mentor' | 'admin';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SessionStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export type WorkshopStatus = 'draft' | 'published' | 'completed' | 'cancelled';
export type WorkshopFormat = 'online' | 'in_person';

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
  employerVisibility?: boolean;
  approvedMentorIds?: string[];
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
  activated: boolean;
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
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  capacity: number;
  registeredLearnerIds: string[];
  status: WorkshopStatus;
  coverImage?: string;
  format?: WorkshopFormat;
  meetingLink?: string;
  location?: string;
  learningObjectives?: string[];
  prerequisites?: string;
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

export interface TalentProfile {
  user: User;
  profile: LearnerProfile;
  skills: Skill[];
  approvedMentors: Mentor[];
}

export interface EmployerContactRequest {
  id: string;
  learnerId: string;
  employerName: string;
  employerEmail: string;
  companyName: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
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

export type VerificationStatus = 'not-submitted' | 'pending' | 'needs-evidence' | 'verified' | 'rejected' | 'suspended';
export type EvidenceType = 'certificate' | 'github' | 'portfolio' | 'experience' | 'work-sample' | 'reference' | 'assessment' | 'sample-lesson';
export type ReviewDecision = 'approve' | 'reject' | 'request-evidence';

export interface VerificationEvidence {
  id: string;
  type: EvidenceType;
  title: string;
  fileName?: string;
  url?: string;
  description: string;
  submittedAt: string;
}

export interface SkillVerification {
  id: string;
  skillId: string;
  status: VerificationStatus;
  evidence: VerificationEvidence[];
  feedback?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export interface IdentityVerification {
  status: VerificationStatus;
  legalName: string;
  evidenceType?: 'passport' | 'national-id' | 'drivers-license';
  evidence?: VerificationEvidence;
  feedback?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export interface MentorVerificationApplication {
  id: string;
  mentorId: string;
  professionalHeadline: string;
  biography: string;
  location: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  profilePhoto?: string;
  identity: IdentityVerification;
  skills: SkillVerification[];
  selectedSkillIds: string[];
  overallStatus: VerificationStatus;
  submittedAt?: string;
  updatedAt: string;
  reviewerNotes?: string;
  history: VerificationHistoryEntry[];
}

export interface VerificationHistoryEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  note?: string;
}

export interface MentorVerificationHistoryDB {
  id: string;
  application_id: string;
  action: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

// --- Mentor verification workflow types ---

export type MentorApplicationStatus =
  | 'not_applied'
  | 'pending_verification'
  | 'verification_failed'
  | 'pending_admin_approval'
  | 'approved'
  | 'rejected'
  | 'suspended';

export interface MentorApplicationEvidence {
  type: EvidenceType;
  title: string;
  fileName?: string;
  url?: string;
  description: string;
}

export interface MentorApplicationSkill {
  id: string;
  applicationId: string;
  skillId: string;
  skillName: string;
  evidenceData: MentorApplicationEvidence[];
  status: 'not-submitted' | 'pending' | 'verified' | 'rejected' | 'needs-evidence';
  feedback?: string;
  reviewedAt?: string;
}

export interface MentorApplication {
  id: string;
  userId: string;
  status: MentorApplicationStatus;
  professionalHeadline: string;
  biography: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  identityVerified: boolean;
  competencyVerified: boolean;
  adminApproved: boolean;
  rejectionReason?: string;
  submittedAt?: string;
  approvedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorApplicationWithDetails extends MentorApplication {
  skills: MentorApplicationSkill[];
  history: MentorVerificationHistoryDB[];
  applicantName?: string;
  applicantEmail?: string;
}

export interface MentorAccessState {
  hasAccess: boolean;
  applicationStatus: MentorApplicationStatus;
  application?: MentorApplication;
  reason?: string;
  redirectTo: string;
}

// --- Student Recommendation types ---

export type RecommendationApprovalStatus = 'pending' | 'accepted' | 'declined';

export interface StudentRecommendation {
  id: string;
  mentorId: string;
  studentId: string;
  strengths: string[];
  technicalSkills: string[];
  communicationAssessment: string;
  problemSolvingAssessment: string;
  achievements: string[];
  careerAreas: string[];
  recommendation: string;
  studentApprovalStatus: RecommendationApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Admin action log ---

export interface AdminActionLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetType: 'recommendation' | 'profile' | 'contactRequest';
  note?: string;
  createdAt: string;
}
