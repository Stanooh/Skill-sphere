import { MentorWorkshopsPage } from '@/views/mentor/MentorWorkshops';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return (
    <MentorAccessGuard>
      <MentorWorkshopsPage />
    </MentorAccessGuard>
  );
}
