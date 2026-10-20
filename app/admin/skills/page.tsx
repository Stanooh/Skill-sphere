import { AdminSkillsPage } from '@/views/admin/AdminSkills';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <ProtectedRoute role="admin">
      <AdminSkillsPage />
    </ProtectedRoute>
  );
}
