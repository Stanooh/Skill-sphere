import { LearnerSavedPage } from '@/views/learner/LearnerSaved';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerSavedPage />
    </ProtectedRoute>
  );
}
