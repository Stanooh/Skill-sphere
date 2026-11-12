import { RoleGuard } from '@/components/layout/DashboardLayout';
import { AdminRecommendationsPage } from '@/views/admin/AdminRecommendations';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function Page() {
  return (
    <RoleGuard role="admin">
      <AdminRecommendationsPage />
    </RoleGuard>
  );
}

