import { MentorSessionsPage } from '@/views/mentor/MentorSessions';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return (
    <MentorAccessGuard>
      <MentorSessionsPage />
    </MentorAccessGuard>
  );
}
