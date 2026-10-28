import { MentorProfilePage } from '@/views/mentor/MentorProfile';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return (
    <MentorAccessGuard>
      <MentorProfilePage />
    </MentorAccessGuard>
  );
}
