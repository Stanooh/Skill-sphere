import { RegisterPage } from '@/views/RegisterPage';
import { PublicOnlyRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return (
    <PublicOnlyRoute>
      <RegisterPage />
    </PublicOnlyRoute>
  );
}
