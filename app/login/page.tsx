import { LoginPage } from '@/views/LoginPage';
import { PublicOnlyRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <PublicOnlyRoute>
      <LoginPage />
    </PublicOnlyRoute>
  );
}
