import { AdminWorkshopsPage } from '@/views/admin/AdminWorkshops';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminWorkshopsPage />
    </ProtectedRoute>
  );
}
