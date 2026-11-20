'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { validatePasswordStrength } from '@/utils/passwordValidation';
import { establishRecoverySession, updatePassword } from '@/services/passwordResetService';

type PageState = 'checking' | 'ready' | 'invalid' | 'success';

export function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void establishRecoverySession().then((result) => {
      if (!active) return;
      if (result.success) {
        setPageState('ready');
      } else {
        setError(result.error || 'This password reset link is invalid or has expired.');
        setPageState('invalid');
      }
    });

    return () => {
      active = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      setError(strength.recommendations[0] || 'Please choose a stronger password.');
      return;
    }

    if (newPassword !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'We could not update your password. Please request a new reset link.');
      return;
    }

    setPageState('success');
    redirectTimer.current = setTimeout(() => {
      router.replace('/login?passwordReset=true');
    }, 1800);
  };

  const footer = (
    <p className="mt-7 text-center text-sm text-[#6b7280]">
      <Link href="/login" className="font-semibold text-[#980868] hover:underline">
        Return to sign in
      </Link>
    </p>
  );

  if (pageState === 'checking') {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Checking your reset link"
        description="Please wait while we securely validate your password reset session."
        footer={footer}
      >
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#980868] border-t-transparent" aria-label="Checking reset link" />
        </div>
      </AuthShell>
    );
  }

  if (pageState === 'invalid') {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Reset link unavailable"
        description="This password reset link is invalid, expired, or has already been used."
        footer={footer}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        </div>
        <Link href="/forgot-password" className="mt-5 block text-center text-sm font-semibold text-[#980868] hover:underline">
          Request another reset link
        </Link>
      </AuthShell>
    );
  }

  if (pageState === 'success') {
    return (
      <AuthShell
        eyebrow="Password updated"
        title="Your password has been changed"
        description="Your password was updated securely. Redirecting you to sign in..."
        footer={footer}
      >
        <div className="flex justify-center py-8 text-emerald-600">
          <CheckCircle className="h-14 w-14" aria-hidden="true" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Create a new password"
      description="Choose a strong password that you have not used before."
      footer={footer}
    >
      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordInput
          label="New password"
          name="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="Enter your new password"
          hint="Use at least 12 characters with uppercase, lowercase, a number and a special character."
          required
        />
        <PasswordInput
          label="Confirm new password"
          name="confirm-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          required
        />

        <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="!rounded-xl !bg-[#980868] !py-3.5 hover:!bg-[#810657]">
          <LockKeyhole className="mr-2 h-4 w-4" aria-hidden="true" />
          {isSubmitting ? 'Updating password...' : 'Update Password'}
        </Button>
      </form>
    </AuthShell>
  );
}
