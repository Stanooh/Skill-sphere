import { MessagesView } from '@/views/MessagesView';
import { ProtectedRoute } from '@/components/guards/RouteGuards';

export default function MentorMessagesPage() {
  return (
    <ProtectedRoute role="mentor">
      <MessagesView />
    </ProtectedRoute>
  );
}
