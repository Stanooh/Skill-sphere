import { MessagesView } from '@/views/MessagesView';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function LearnerMessagesPage() {
  return (
    <ProtectedRoute role="learner">
      <MessagesView />
    </ProtectedRoute>
  );
}
