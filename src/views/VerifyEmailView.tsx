'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, GraduationCap, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [email] = useState(emailParam);
  const { resendVerification } = useAuth();

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || isResending) return;
    setIsResending(true);
    setFeedback(null);

    try {
      const res = await resendVerification(email);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'A fresh verification link has been sent to your email address.',
        });
        setCooldown(60); // 60 seconds cooldown
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to resend verification email. Please try again later.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error while requesting verification link.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-ink tracking-tight">SkillSphere</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-10 px-6 sm:px-10 shadow-sm border border-ink-100 rounded-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 text-brand flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-ink">Verify your email address</h1>
            <p className="text-sm text-ink-500 max-w-sm mx-auto">
              We have sent an authentication link to:
            </p>
            {email ? (
              <p className="font-semibold text-brand-900 bg-brand-50/60 py-1.5 px-3 rounded-lg inline-block text-sm">
                {email}
              </p>
            ) : (
              <p className="text-xs text-ink-400">your registered email address</p>
            )}
          </div>

          <div className="text-sm text-ink-500 bg-ink-50 p-4 rounded-xl text-left space-y-2 border border-ink-100">
            <p className="font-medium text-ink">Next steps to activate your account:</p>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-ink-400">
              <li>Open your email inbox and find the verification email from SkillSphere.</li>
              <li>Click the confirmation link inside the message.</li>
              <li>You will automatically be redirected to your dashboard.</li>
            </ol>
          </div>

          {feedback && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm text-left ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {email && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`}
                />
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : isResending
                  ? 'Sending link...'
                  : 'Resend Verification Email'}
              </Button>
            )}

            <div className="flex items-center justify-center gap-4 text-xs text-ink-400 pt-2 border-t border-ink-100">
              <Link href="/login" className="hover:text-ink font-medium">
                Return to Sign In
              </Link>
              <span>•</span>
              <Link href="/register" className="hover:text-ink font-medium">
                Register Different Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

