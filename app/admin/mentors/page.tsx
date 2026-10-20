import { AdminMentorsPage } from '@/views/admin/AdminMentors';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminMentorsPage />
    </ProtectedRoute>
  );
}
