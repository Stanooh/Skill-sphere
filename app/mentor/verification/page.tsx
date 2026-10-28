import { MentorVerificationPage } from '@/views/mentor/MentorVerification';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function Page() {
  return <ProtectedRoute role="mentor"><MentorVerificationPage /></ProtectedRoute>;
}
