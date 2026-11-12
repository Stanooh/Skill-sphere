import { RegisterPage } from '@/views/RegisterPage';
import { PublicOnlyRoute } from '@/components/guards/RouteGuards';

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export default function Page() {
  return (
    <PublicOnlyRoute>
      <RegisterPage />
    </PublicOnlyRoute>
  );
}
