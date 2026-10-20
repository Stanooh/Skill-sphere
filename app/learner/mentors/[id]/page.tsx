import { LearnerMentorDetailPage } from '@/views/learner/LearnerMentorDetail';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerMentorDetailPage />
    </ProtectedRoute>
  );
}
