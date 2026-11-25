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
  switch (notification.type) {
    case 'message_received':
      return notification.relatedEntityId
        ? `${base}/messages?conversationId=${notification.relatedEntityId}`
        : `${base}/messages`;
    case 'mentorship_request':
    case 'session_cancelled':
      return role === 'mentor' ? '/mentor/requests' : '/learner/sessions';
    case 'session_accepted':
    case 'session_declined':
    case 'session_completed':
      return role === 'learner' ? '/learner/sessions' : '/mentor/sessions';
    case 'mentor_review_received':
      return role === 'mentor' ? '/mentor/profile' : '/learner/mentors';
    case 'workshop_update':
      return `${base}/workshops`;
    case 'employer_contact':
      return '/learner/profile#inquiries';
    case 'contact_reply':
      return role === 'learner' ? '/learner/messages' : role === 'mentor' ? '/mentor/messages' : '/notifications';
    default:
      return '/notifications';
  }
}
