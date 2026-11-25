import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

type DbNotification = {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  read: boolean;
  related_application_id: string | null;
  related_entity_id: string | null;
  created_at: string;
};

function mapNotification(row: DbNotification): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.notification_type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
    relatedApplicationId: row.related_application_id ?? undefined,
    relatedEntityId: row.related_entity_id ?? undefined,
  };
}

function reportError(operation: string, error: unknown): void {
  console.error(`[notifications] ${operation} failed`, error);
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    reportError('load notifications', error);
    return [];
  }
  return (data as DbNotification[]).map(mapNotification);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    reportError('mark notification read', error);
    return false;
  }
  return true;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    reportError('mark all notifications read', error);
    return false;
  }
  return true;
}

export function subscribeToNotifications(userId: string, onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function createNotification(input: {
  userId: string;
  type:
    | 'mentorship_request'
    | 'session_accepted'
    | 'session_declined'
    | 'session_cancelled'
    | 'session_completed'
    | 'mentor_review_received'
    | 'message_received'
    | 'workshop_update'
    | 'announcement';
  title: string;
  message: string;
  entityId?: string;
  eventKey?: string;
}): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_notification', {
    p_user_id: input.userId,
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_entity_id: input.entityId ?? null,
    p_event_key: input.eventKey ?? null,
  });

  if (error) {
    reportError('create notification', error);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

export function getNotificationHref(
  notification: Notification,
  role: 'learner' | 'mentor' | 'admin'
): string {
  const base = role === 'learner' ? '/learner' : role === 'mentor' ? '/mentor' : '/admin';
  const entityId = notification.relatedEntityId;

  switch (notification.type) {
    case 'message_received':
      return entityId
        ? `${base}/messages?conversationId=${encodeURIComponent(entityId)}`
        : `${base}/messages`;
    case 'mentorship_request':
    case 'session_cancelled':
      if (role === 'mentor') {
        return entityId ? `/mentor/requests?requestId=${encodeURIComponent(entityId)}` : '/mentor/requests';
      }
      return entityId ? `/learner/sessions?sessionId=${encodeURIComponent(entityId)}` : '/learner/sessions';
    case 'session_accepted':
    case 'session_declined':
    case 'session_completed':
      if (role === 'learner') {
        return entityId ? `/learner/sessions?sessionId=${encodeURIComponent(entityId)}` : '/learner/sessions';
      }
      return entityId ? `/mentor/sessions?sessionId=${encodeURIComponent(entityId)}` : '/mentor/sessions';
    case 'mentor_review_received':
      return role === 'mentor' ? '/mentor/profile' : entityId ? `/learner/mentors/${encodeURIComponent(entityId)}` : '/learner/mentors';
    case 'workshop_update':
    case 'workshop_published':
    case 'workshop_registration':
      return role === 'admin' ? '/admin/workshops' : `${base}/workshops`;
    case 'recommendation_received':
      return role === 'learner' ? '/learner/profile#recommendations' : '/mentor/student-recommendations';
    case 'employer_contact':
      return '/learner/profile#inquiries';
    case 'contact_reply':
      return role === 'admin' ? '/notifications' : `${base}/messages`;
    case 'mentor_approved':
    case 'competency_verified':
    case 'identity_verification':
      return role === 'mentor' ? '/mentor/verification' : '/learner';
    case 'application_submitted':
      return role === 'mentor' ? '/mentor/apply' : '/admin/verification';
    case 'application_review_required':
      return '/admin/verification';
    case 'roadmap_update':
      return '/learner/roadmap';
    case 'progress_update':
      return '/learner/progress';
    case 'career_advisor_update':
      return '/learner/career-advisor';
    default:
      return '/notifications';
  }
}

const TYPE_LABELS: Record<string, string> = {
  mentorship_request: 'Mentorship Request',
  session_accepted: 'Session Accepted',
  session_declined: 'Session Declined',
  session_cancelled: 'Request Cancelled',
  session_completed: 'Session Completed',
  message_received: 'Message',
  mentor_review_received: 'Rating & Review',
  workshop_update: 'Workshop',
  workshop_published: 'Workshop',
  workshop_registration: 'Workshop',
  recommendation_received: 'Recommendation',
  employer_contact: 'Opportunity',
  contact_reply: 'Inquiry Reply',
  mentor_approved: 'Verification',
  competency_verified: 'Verification',
  identity_verification: 'Verification',
  application_submitted: 'Application',
  application_review_required: 'Admin Review',
  roadmap_update: 'Roadmap',
  progress_update: 'Progress',
  career_advisor_update: 'Career Advisor',
};

export function getNotificationTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? 'Update';
}
