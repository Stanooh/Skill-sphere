import { LearnerRoadmapPage } from '@/views/learner/LearnerRoadmap';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerRoadmapPage />
    </ProtectedRoute>
  );
}
