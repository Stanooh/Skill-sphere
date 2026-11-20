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
