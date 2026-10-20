import { LearnerCareerAdvisorPage } from '@/views/learner/LearnerCareerAdvisor';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerCareerAdvisorPage />
    </ProtectedRoute>
  );
}
