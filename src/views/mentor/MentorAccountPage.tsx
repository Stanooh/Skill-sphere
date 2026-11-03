'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { checkMentorAccess } from '@/services/mentorVerificationService';
import type { MentorApplicationStatus } from '@/types';

const statusLabels: Record<MentorApplicationStatus, string> = {
  not_applied: 'Not applied',
  pending_verification: 'Under review',
  verification_failed: 'Competency not verified',
  pending_admin_approval: 'Awaiting admin approval',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export function MentorAccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<MentorApplicationStatus | null>(null);
  const [mentorAccess, setMentorAccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    checkMentorAccess().then((result) => {
      setStatus(result.status);
      setMentorAccess(result.hasAccess);
    });
  }, [user, loading, router]);

  if (!user) return null;

  const rows = [
    { label: 'Name', value: user.name },
    { label: 'Email', value: user.email },
    { label: 'Intended role', value: user.role === 'mentor' ? 'Mentor' : 'Learner' },
    { label: 'Application status', value: status ? statusLabels[status] : 'Loading...' },
  ];

  return (
    <DashboardLayout restricted>
      <PageHeader title="Profile" description="Your account details and mentor application status." />
      <div className="max-w-2xl card p-6 space-y-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 border-b border-ink-100 pb-4 last:border-0 last:pb-0">
            <span className="text-sm text-ink-400">{row.label}</span>
            <span className="text-sm font-medium text-ink">{row.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-ink-400">Mentor access</span>
          <Badge variant={mentorAccess ? 'green' : 'gray'}>{mentorAccess ? 'Granted' : 'Not granted'}</Badge>
        </div>
      </div>
    </DashboardLayout>
  );
}
