'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  getNotifications,
  getNotificationHref,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/services/notificationService';
import type { Notification } from '@/types';

export function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const next = await getNotifications(user.id);
      if (!active) return;
      setNotifications(next);
      setLoading(false);
    };
    void load();
    const unsubscribe = subscribeToNotifications(user.id, () => {
      void load();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  if (!user) return null;
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAllRead = async () => {
    if (!(await markAllNotificationsRead(user.id))) return;
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  };

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.read) {
      void markNotificationRead(user.id, notification.id);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
      );
    }
    router.push(getNotificationHref(notification, user.role));
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        description="Review updates about your SkillSphere activity."
        action={unreadCount > 0 ? <Button variant="secondary" onClick={markAllRead}><Check className="h-4 w-4" /> Mark all read</Button> : undefined}
      />
      {loading ? (
        <div className="card p-8 text-center text-ink-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Bell className="w-6 h-6" />} title="No notifications" description="New updates will appear here." />
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`w-full p-4 text-left hover:bg-ink-50 transition-colors ${notification.read ? '' : 'bg-brand-50/40'}`}
              onClick={() => handleOpenNotification(notification)}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="font-medium text-ink">{notification.title}</p>
                {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              </div>
              <p className="mt-1 text-sm text-ink-400">{notification.message}</p>
              <p className="mt-2 text-xs text-ink-300">{new Date(notification.createdAt).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
