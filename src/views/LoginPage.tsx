'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { validateEmailFormat } from '@/utils/passwordValidation';
import { AuthShell } from '@/components/auth/AuthShell';

export function LoginPage() {
  const { login } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    const errParam = searchParams.get('error');
    return errParam ? decodeURIComponent(errParam) : '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check URL params for verification message
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      show('Email verified successfully! You can now sign in.', 'success');
    }
    if (searchParams.get('passwordReset') === 'true') {
      show('Password updated successfully. You can now sign in.', 'success');
    }
  }, [searchParams, show]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const emailVal = validateEmailFormat(email);
    if (!emailVal.isValid) {
      setError(emailVal.error || 'Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(emailVal.normalized, password);

      if (res.error) {
        if (res.needsEmailVerification) {
          router.push(`/verify-email?email=${encodeURIComponent(emailVal.normalized)}`);
          return;
        }
        setError(res.error);
        return;
      }

      if (res.user) {
        show(`Welcome back, ${res.user.name.split(' ')[0]}!`, 'success');
        const base =
          res.user.role === 'learner'
            ? '/learner'
            : res.user.role === 'mentor'
              ? '/mentor/apply'
              : '/admin/dashboard';
        const nextPath = searchParams.get('next');
        const isAllowedNextPath =
          nextPath &&
          nextPath.startsWith('/') &&
          !nextPath.startsWith('//') &&
          ((res.user.role === 'admin' && nextPath.startsWith('/admin')) ||
            (res.user.role === 'mentor' && nextPath.startsWith('/mentor')) ||
            (res.user.role === 'learner' && nextPath.startsWith('/learner')));
        const safeNextPath = isAllowedNextPath ? nextPath : base;
        router.push(safeNextPath);
      }
    } catch {
      setError('Sign in failed. Please check your credentials and network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      description="Enter your credentials to continue your learning journey."
      footer={
        <p className="mt-7 text-center text-sm text-[#6b7280]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-[#980868] hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="border-[#e5e7eb] bg-[#ffffff] text-[#101010] placeholder-[#9ca3af] focus:border-[#980868] focus:ring-[#ffd0e8]"
          required
        />

        <PasswordInput
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="border-[#e5e7eb] bg-[#ffffff] text-[#101010] placeholder-[#9ca3af] focus:border-[#980868] focus:ring-[#ffd0e8]"
          required
        />

        <div className="-mt-2 flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-[#980868] hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="mt-2 !rounded-xl !bg-[#980868] !py-3.5 hover:!bg-[#810657]">
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  );
}
