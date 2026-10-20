import { AdminReportsPage } from '@/views/admin/AdminReports';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminReportsPage />
    </ProtectedRoute>
  );
}
