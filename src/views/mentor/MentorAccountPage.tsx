'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { checkMentorAccess } from '@/services/mentorVerificationService';
import { deleteMentorAccount } from '@/services/accountService';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { Trash2 } from 'lucide-react';
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
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<MentorApplicationStatus | null>(null);
  const [mentorAccess, setMentorAccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
    { label: 'Role', value: user.role === 'mentor' ? 'Mentor' : 'Learner' },
    { label: 'Application status', value: status ? statusLabels[status] : 'Loading...' },
  ];

  const handleDeleteAccount = async () => {
    deleteMentorAccount(user.id);
    await logout();
    router.push('/');
  };

  return (
    <DashboardLayout restricted>
      <PageHeader title="Account Details" description="Your account credentials and mentor status." />
      <div className="max-w-2xl space-y-6">
        <div className="card p-6 space-y-5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-ink-100 pb-4 last:border-0 last:pb-0"
            >
              <span className="text-sm text-ink-400">{row.label}</span>
              <span className="text-sm font-medium text-ink">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-ink-400">Mentor access</span>
            <Badge variant={mentorAccess ? 'green' : 'gray'}>
              {mentorAccess ? 'Granted' : 'Not granted'}
            </Badge>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-6 border border-red-800 bg-red-950/10 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            <p className="text-sm text-ink-400 mt-1">
              If you no longer wish to use SkillSphere, you can delete your account and associated
              personal information. This action cannot be undone.
            </p>
          </div>

          <Button
            className="!bg-red-600 hover:!bg-red-700 !text-white !border-0"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="w-4 h-4" /> Delete Your Account
          </Button>
        </div>
      </div>

      <DeleteAccountDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        userName={user.name}
      />
    </DashboardLayout>
  );
}
