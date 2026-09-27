import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import type { ReactNode } from 'react';

import { LandingPage } from '@/pages/LandingPage';
import { AboutPage } from '@/pages/AboutPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PublicMentorsPage } from '@/pages/PublicMentorsPage';
import { PublicWorkshopsPage } from '@/pages/PublicWorkshopsPage';
import { PublicSkillsPage } from '@/pages/PublicSkillsPage';
import { PublicRoadmapsPage } from '@/pages/PublicRoadmapsPage';

import { LearnerDashboard } from '@/pages/learner/LearnerDashboard';
import { LearnerProfilePage } from '@/pages/learner/LearnerProfile';
import { LearnerMentorsPage } from '@/pages/learner/LearnerMentors';
import { LearnerMentorDetailPage } from '@/pages/learner/LearnerMentorDetail';
import { LearnerWorkshopsPage } from '@/pages/learner/LearnerWorkshops';
import { LearnerSessionsPage } from '@/pages/learner/LearnerSessions';
import { LearnerRoadmapPage } from '@/pages/learner/LearnerRoadmap';
import { LearnerProgressPage } from '@/pages/learner/LearnerProgress';
import { LearnerSavedPage } from '@/pages/learner/LearnerSaved';
import { LearnerCareerAdvisorPage } from '@/pages/learner/LearnerCareerAdvisor';
import { LearnerRoadmapCreatePage } from '@/pages/learner/LearnerRoadmapCreate';

import { MentorDashboard } from '@/pages/mentor/MentorDashboard';
import { MentorProfilePage } from '@/pages/mentor/MentorProfile';
import { MentorRequestsPage } from '@/pages/mentor/MentorRequests';
import { MentorSessionsPage } from '@/pages/mentor/MentorSessions';
import { MentorWorkshopsPage } from '@/pages/mentor/MentorWorkshops';

import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsersPage } from '@/pages/admin/AdminUsers';
import { AdminLearnersPage } from '@/pages/admin/AdminLearners';
import { AdminMentorsPage } from '@/pages/admin/AdminMentors';
import { AdminSkillsPage } from '@/pages/admin/AdminSkills';
import { AdminWorkshopsPage } from '@/pages/admin/AdminWorkshops';
import { AdminReportsPage } from '@/pages/admin/AdminReports';

import type { UserRole } from '@/types';

function ProtectedRoute({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    const base = user.role === 'learner' ? '/learner' : user.role === 'mentor' ? '/mentor' : '/admin';
    return <Navigate to={base} replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) {
    const base = user.role === 'learner' ? '/learner' : user.role === 'mentor' ? '/mentor' : '/admin';
    return <Navigate to={base} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/mentors" element={<PublicMentorsPage />} />
      <Route path="/workshops" element={<PublicWorkshopsPage />} />
      <Route path="/skills" element={<PublicSkillsPage />} />
      <Route path="/roadmaps" element={<PublicRoadmapsPage />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      {/* Learner routes */}
      <Route path="/learner" element={<ProtectedRoute role="learner"><LearnerDashboard /></ProtectedRoute>} />
      <Route path="/learner/profile" element={<ProtectedRoute role="learner"><LearnerProfilePage /></ProtectedRoute>} />
      <Route path="/learner/mentors" element={<ProtectedRoute role="learner"><LearnerMentorsPage /></ProtectedRoute>} />
      <Route path="/learner/mentors/:id" element={<ProtectedRoute role="learner"><LearnerMentorDetailPage /></ProtectedRoute>} />
      <Route path="/learner/workshops" element={<ProtectedRoute role="learner"><LearnerWorkshopsPage /></ProtectedRoute>} />
      <Route path="/learner/sessions" element={<ProtectedRoute role="learner"><LearnerSessionsPage /></ProtectedRoute>} />
      <Route path="/learner/roadmap" element={<ProtectedRoute role="learner"><LearnerRoadmapPage /></ProtectedRoute>} />
      <Route path="/learner/roadmap/create" element={<ProtectedRoute role="learner"><LearnerRoadmapCreatePage /></ProtectedRoute>} />
      <Route path="/learner/career-advisor" element={<ProtectedRoute role="learner"><LearnerCareerAdvisorPage /></ProtectedRoute>} />
      <Route path="/learner/progress" element={<ProtectedRoute role="learner"><LearnerProgressPage /></ProtectedRoute>} />
      <Route path="/learner/saved" element={<ProtectedRoute role="learner"><LearnerSavedPage /></ProtectedRoute>} />

      {/* Mentor routes */}
      <Route path="/mentor" element={<ProtectedRoute role="mentor"><MentorDashboard /></ProtectedRoute>} />
      <Route path="/mentor/profile" element={<ProtectedRoute role="mentor"><MentorProfilePage /></ProtectedRoute>} />
      <Route path="/mentor/requests" element={<ProtectedRoute role="mentor"><MentorRequestsPage /></ProtectedRoute>} />
      <Route path="/mentor/sessions" element={<ProtectedRoute role="mentor"><MentorSessionsPage /></ProtectedRoute>} />
      <Route path="/mentor/workshops" element={<ProtectedRoute role="mentor"><MentorWorkshopsPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsersPage /></ProtectedRoute>} />
      <Route path="/admin/learners" element={<ProtectedRoute role="admin"><AdminLearnersPage /></ProtectedRoute>} />
      <Route path="/admin/mentors" element={<ProtectedRoute role="admin"><AdminMentorsPage /></ProtectedRoute>} />
      <Route path="/admin/skills" element={<ProtectedRoute role="admin"><AdminSkillsPage /></ProtectedRoute>} />
      <Route path="/admin/workshops" element={<ProtectedRoute role="admin"><AdminWorkshopsPage /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute role="admin"><AdminReportsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
