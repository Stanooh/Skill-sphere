import { LearnerWorkshopsPage } from '@/views/learner/LearnerWorkshops';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="learner">
      <LearnerWorkshopsPage />
    </ProtectedRoute>
  );
}
