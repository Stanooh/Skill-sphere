import { MentorVerificationPage } from '@/views/mentor/MentorVerification';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return <MentorAccessGuard><MentorVerificationPage /></MentorAccessGuard>;
}
