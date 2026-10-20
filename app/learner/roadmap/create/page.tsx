import { LearnerRoadmapCreatePage } from '@/views/learner/LearnerRoadmapCreate';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerRoadmapCreatePage />
    </ProtectedRoute>
  );
}
