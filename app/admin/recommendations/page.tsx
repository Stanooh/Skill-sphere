import { RoleGuard } from '@/components/layout/DashboardLayout';
import { AdminRecommendationsPage } from '@/views/admin/AdminRecommendations';

export default function Page() {
  return (
    <RoleGuard role="admin">
      <AdminRecommendationsPage />
    </RoleGuard>
  );
}

