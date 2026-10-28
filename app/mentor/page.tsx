import { MentorDashboard } from '@/views/mentor/MentorDashboard';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return (
    <MentorAccessGuard>
      <MentorDashboard />
    </MentorAccessGuard>
  );
}
