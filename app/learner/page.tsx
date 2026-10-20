import { LearnerDashboard } from '@/views/learner/LearnerDashboard';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerDashboard />
    </ProtectedRoute>
  );
}
