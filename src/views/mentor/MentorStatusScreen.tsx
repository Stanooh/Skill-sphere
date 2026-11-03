'use client';

import Link from 'next/link';
import {
  Clock,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  FileEdit,
} from 'lucide-react';
import { DashboardLayout, PageHeader } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { MentorApplicationStatus, MentorApplication } from '@/types';

interface StatusConfig {
  icon: typeof Clock;
  title: string;
  description: string;
  variant: 'gray' | 'amber' | 'green' | 'red' | 'brand';
  actionLabel?: string;
  actionHref?: string;
}

const statusConfigs: Partial<Record<MentorApplicationStatus, StatusConfig>> = {
  pending_verification: {
    icon: Clock,
    title: 'Application under review',
    description: 'Your mentor application has been submitted and is awaiting competency verification. An administrator will review your evidence and skills. You will be notified once a decision is made.',
    variant: 'amber',
  },
  verification_failed: {
    icon: XCircle,
    title: 'Competency verification failed',
    description: 'The reviewer determined that your competency evidence did not meet the requirements. You can review the feedback below, update your evidence, and resubmit your application.',
    variant: 'red',
    actionLabel: 'Update evidence and resubmit',
    actionHref: '/mentor/apply',
  },
  pending_admin_approval: {
    icon: ShieldCheck,
    title: 'Competency verified — awaiting admin approval',
    description: 'You have successfully passed competency verification. An administrator will now review your application and make the final approval decision. Mentor dashboard access will be granted once approved.',
    variant: 'brand',
  },
  approved: {
    icon: CheckCircle2,
    title: 'Application approved',
    description: 'Congratulations! Your mentor application has been approved. You now have access to the mentor dashboard.',
    variant: 'green',
    actionLabel: 'Go to mentor dashboard',
    actionHref: '/mentor',
  },
  rejected: {
    icon: XCircle,
    title: 'Application rejected',
    description: "Sorry, we couldn't verify your competency for the SkillSphere mentor programme. After reviewing your application, we are unable to approve you as a mentor at this time.",
    variant: 'red',
  },
  suspended: {
    icon: ShieldAlert,
    title: 'Mentor account suspended',
    description: 'Your mentor account has been suspended. You no longer have access to mentor features. Please contact an administrator if you believe this is an error.',
    variant: 'red',
  },
  not_applied: {
    icon: FileEdit,
    title: 'Become a mentor',
    description: 'You have not submitted a mentor application yet. Complete the application to start the verification process.',
    variant: 'gray',
    actionLabel: 'Start application',
    actionHref: '/mentor/apply',
  },
};

export function MentorStatusScreen({
  status,
  application,
}: {
  status: MentorApplicationStatus;
  application?: MentorApplication | null;
}) {
  const config = statusConfigs[status] ?? statusConfigs.not_applied!;
  const Icon = config.icon;

  return (
    <DashboardLayout restricted>
      <PageHeader
        title="Mentor application status"
      />

      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
            config.variant === 'green' ? 'bg-emerald-950 text-emerald-400' :
            config.variant === 'amber' ? 'bg-amber-950 text-amber-400' :
            config.variant === 'red' ? 'bg-red-950 text-red-400' :
            config.variant === 'brand' ? 'bg-brand-900 text-brand-300' :
            'bg-ink-100 text-ink-400'
          }`}>
            <Icon className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-ink mb-3">{config.title}</h2>
          <p className="text-ink-400 leading-relaxed mb-6 max-w-lg mx-auto">
            {config.description}
          </p>

          <div className="flex items-center justify-center gap-3 mb-6">
            <Badge variant={config.variant}>
              <Icon className="h-3.5 w-3.5" />
              {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Badge>
          </div>

          {application?.rejectionReason && (
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-left mb-6">
              <p className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-2">
                {status === 'suspended' ? 'Suspension reason' : 'Reviewer feedback'}
              </p>
              <p className="text-sm text-ink-400">{application.rejectionReason}</p>
            </div>
          )}

          {config.actionHref && (
            <Link href={config.actionHref}>
              <Button size="lg">
                {config.actionLabel}
              </Button>
            </Link>
          )}
        </div>

        {/* Timeline of application states */}
        <div className="card p-6 mt-6">
          <h3 className="text-sm font-semibold text-ink mb-4">Application progress</h3>
          <div className="space-y-3">
            {[
              { label: 'Application submitted', done: status !== 'not_applied' && status !== 'pending_verification' || status === 'pending_verification' },
              { label: 'Competency verification', done: status === 'pending_admin_approval' || status === 'approved' },
              { label: 'Admin approval', done: status === 'approved' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? 'bg-brand text-white' : 'bg-ink-100 text-ink-300'
                }`}>
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className={`text-sm ${step.done ? 'text-ink' : 'text-ink-300'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
