import { AdminVerificationPage } from '@/views/admin/AdminVerification';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return <ProtectedRoute role="admin"><AdminVerificationPage /></ProtectedRoute>;
}
