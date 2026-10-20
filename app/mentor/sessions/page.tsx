import { MentorSessionsPage } from '@/views/mentor/MentorSessions';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="mentor">
      <MentorSessionsPage />
    </ProtectedRoute>
  );
}
