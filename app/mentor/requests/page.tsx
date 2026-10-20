import { MentorRequestsPage } from '@/views/mentor/MentorRequests';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="mentor">
      <MentorRequestsPage />
    </ProtectedRoute>
  );
}
