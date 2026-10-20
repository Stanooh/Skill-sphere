import { MentorWorkshopsPage } from '@/views/mentor/MentorWorkshops';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="mentor">
      <MentorWorkshopsPage />
    </ProtectedRoute>
  );
}
