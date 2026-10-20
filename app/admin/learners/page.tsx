import { AdminLearnersPage } from '@/views/admin/AdminLearners';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminLearnersPage />
    </ProtectedRoute>
  );
}
