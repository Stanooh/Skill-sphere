import { LearnerApplicationPage } from '@/views/learner/LearnerApplicationPage';
import { MentorAccessGuard } from '@/components/guards/MentorAccessGuard';

export default function Page() {
  return (
    <MentorAccessGuard allowPending>
      <LearnerApplicationPage />
    </MentorAccessGuard>
  );
}
