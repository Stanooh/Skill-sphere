import { LearnerProgressPage } from '@/views/learner/LearnerProgress';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerProgressPage />
    </ProtectedRoute>
  );
}
