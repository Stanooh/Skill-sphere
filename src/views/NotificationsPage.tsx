'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  getNotifications,
  getNotificationHref,
  getNotificationTypeLabel,
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
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const next = await getNotifications(user.id);
      setNotifications(next);
    } catch (err) {
      console.error('[NotificationsPage] load failed:', err);
      setError('Could not load your notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const init = async () => {
      if (active) await loadNotifications();
    };
    void init();

    const unsubscribe = subscribeToNotifications(user.id, () => {
      void loadNotifications();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, loadNotifications]);

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
    const href = getNotificationHref(notification, user.role);
    if (href !== '/notifications') {
      router.push(href);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        description="Review updates about your SkillSphere activity."
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={markAllRead}>
              <Check className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="card p-8 text-center text-ink-400">Loading notifications...</div>
      ) : error ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadNotifications()}>
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Bell className="w-6 h-6" />} title="No notifications" description="New updates will appear here." />
        </div>
      ) : (
        <div className="card divide-y divide-ink-100">
          {notifications.map((notification) => {
            const href = getNotificationHref(notification, user.role);
            const hasDestination = href !== '/notifications';
            return (
              <button
                key={notification.id}
                type="button"
                className={`w-full p-4 text-left hover:bg-ink-50 transition-colors ${notification.read ? '' : 'bg-brand-50/40'}`}
                onClick={() => handleOpenNotification(notification)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <p className="font-medium text-ink">{notification.title}</p>
                    <Badge variant={notification.read ? 'gray' : 'brand'}>
                      {getNotificationTypeLabel(notification.type ?? '')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-brand" />}
                    {hasDestination && <ArrowRight className="w-4 h-4 text-ink-300" />}
                  </div>
                </div>
                <p className="mt-1 text-sm text-ink-400">{notification.message}</p>
                <p className="mt-2 text-xs text-ink-300">{new Date(notification.createdAt).toLocaleString()}</p>
              </button>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
