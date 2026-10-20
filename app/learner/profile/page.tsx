import { LearnerProfilePage } from '@/views/learner/LearnerProfile';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerProfilePage />
    </ProtectedRoute>
  );
}
