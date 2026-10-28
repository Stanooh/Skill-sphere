import { LearnerApplicationPage } from '@/views/learner/LearnerApplicationPage';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerApplicationPage />
    </ProtectedRoute>
  );
}
