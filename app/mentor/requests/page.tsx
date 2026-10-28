import { MentorRequestsPage } from '@/views/mentor/MentorRequests';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return (
    <MentorAccessGuard>
      <MentorRequestsPage />
    </MentorAccessGuard>
  );
}
