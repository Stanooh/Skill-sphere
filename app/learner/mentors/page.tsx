import { LearnerMentorsPage } from '@/views/learner/LearnerMentors';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerMentorsPage />
    </ProtectedRoute>
  );
}
