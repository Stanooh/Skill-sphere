import { LearnerSessionsPage } from '@/views/learner/LearnerSessions';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerSessionsPage />
    </ProtectedRoute>
  );
}
