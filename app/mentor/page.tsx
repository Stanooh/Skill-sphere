import { MentorDashboard } from '@/views/mentor/MentorDashboard';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="mentor">
      <MentorDashboard />
    </ProtectedRoute>
  );
}
