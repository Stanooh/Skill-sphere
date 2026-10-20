import { MentorProfilePage } from '@/views/mentor/MentorProfile';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="mentor">
      <MentorProfilePage />
    </ProtectedRoute>
  );
}
