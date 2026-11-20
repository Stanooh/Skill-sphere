'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { validateEmailFormat } from '@/utils/passwordValidation';
import { requestPasswordReset } from '@/services/passwordResetService';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    const emailResult = validateEmailFormat(email);
    if (!emailResult.isValid) {
      setFeedback({ type: 'error', message: emailResult.error || 'Please enter a valid email address.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(emailResult.normalized);
      setFeedback({
        type: result.success ? 'success' : 'error',
        message: result.success
          ? 'If an account exists for this email, password reset instructions have been sent.'
          : 'We could not send reset instructions right now. Please try again later.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'We could not send reset instructions right now. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="Enter your registered email and we will send instructions to reset your password."
      footer={
        <p className="mt-7 text-center text-sm text-[#6b7280]">
          Remember your password?{' '}
          <Link href="/login" className="font-semibold text-[#980868] hover:underline">
            Return to sign in
          </Link>
        </p>
      }
    >
      {feedback && (
        <div
          role="status"
          className={`mb-5 flex items-start gap-2 rounded-xl border p-3 ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <p className="text-sm">{feedback.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="border-[#e5e7eb] bg-[#ffffff] text-[#101010] placeholder-[#9ca3af] focus:border-[#980868] focus:ring-[#ffd0e8]"
          required
        />

        <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="!rounded-xl !bg-[#980868] !py-3.5 hover:!bg-[#810657]">
          <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
          {isSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthShell>
  );
}
