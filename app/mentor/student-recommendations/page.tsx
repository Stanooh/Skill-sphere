import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';
import { MentorStudentRecommendations } from '@/views/mentor/MentorStudentRecommendations';

export default function Page() {
  return (
    <MentorAccessGuard>
      <MentorStudentRecommendations />
    </MentorAccessGuard>
  );
}

