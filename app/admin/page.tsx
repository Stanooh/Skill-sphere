import { AdminDashboard } from '@/views/admin/AdminDashboard';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
