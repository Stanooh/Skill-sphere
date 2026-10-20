import { AdminUsersPage } from '@/views/admin/AdminUsers';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminUsersPage />
    </ProtectedRoute>
  );
}
