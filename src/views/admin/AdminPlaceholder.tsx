'use client';

import { Settings } from 'lucide-react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/ui';
import { NotificationsPage } from '@/views/NotificationsPage';

export function AdminNotificationsPage() {
  return <NotificationsPage />;
}

export function AdminSettingsPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Administrative settings will be connected as their Supabase configuration is implemented." />
      <div className="card">
        <EmptyState icon={<Settings className="w-6 h-6" />} title="Settings are not configured yet" description="No settings table or administrative configuration API exists in the current database." />
      </div>
    </DashboardLayout>
  );
}
