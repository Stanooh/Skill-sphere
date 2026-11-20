'use client';

import { useState, useMemo, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Compass, GraduationCap as LearnerIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { ProfilePictureUpload } from '@/components/profile/ProfilePictureUpload';
import { Button } from '@/components/ui/Button';
import { validatePasswordStrength, validateEmailFormat } from '@/utils/passwordValidation';
import type { UserRole } from '@/types';
import { AuthShell } from '@/components/auth/AuthShell';

export function RegisterPage() {
  const { register } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time password evaluation
  const passwordStrength = useMemo(() => {
    return validatePasswordStrength(password, { email, name });
  }, [password, email, name]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    // 1. Basic empty checks
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    // 2. Email format validation
    const emailValidation = validateEmailFormat(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || 'Please enter a valid email address.');
      return;
    }

    // 3. Strict password security validation
    if (!passwordStrength.isValid) {
      setError('Your password does not satisfy the security requirements. Please check the recommendations below.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(
        name.trim(),
        emailValidation.normalized,
        role,
        password,
        avatarFile
      );

      if (res.error) {
        setError(res.error);
        return;
      }

      if (res.needsEmailVerification) {
        show('Registration submitted! Please verify your email address to continue.', 'info');
        const nextPath = searchParams.get('next');
        const safeNextPath =
          nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '';
        const nextQuery = safeNextPath ? `&next=${encodeURIComponent(safeNextPath)}` : '';
        router.push(`/verify-email?email=${encodeURIComponent(emailValidation.normalized)}${nextQuery}`);
        return;
      }

      if (res.user) {
        show(`Account created. Welcome, ${res.user.name.split(' ')[0]}!`, 'success');
        const base = res.user.role === 'learner' ? '/learner' : res.user.role === 'mentor' ? '/mentor/apply' : '/admin';
        const nextPath = searchParams.get('next');
        const safeNextPath =
          nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : base;
        router.push(safeNextPath);
      }
    } catch {
      setError('Registration failed. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles: { value: Exclude<UserRole, 'admin'>; label: string; icon: typeof LearnerIcon; desc: string }[] = [
    { value: 'learner', label: 'Learner', icon: LearnerIcon, desc: 'Find mentors and learn skills' },
    { value: 'mentor', label: 'Mentor', icon: Compass, desc: 'Apply and get verified to guide learners' },
  ];

  return (
    <AuthShell
      eyebrow="Start your journey"
      title="Create account"
      description="Choose your role and build the skills that move you forward."
      footer={
        <p className="mt-7 text-center text-sm text-[#6b7280]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#980868] hover:underline">
            Sign in
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
            {/* Role selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">I want to join as a</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                      role === r.value
                        ? 'border-[#980868] bg-[#fff1f8] text-[#980868] font-semibold shadow-sm'
                        : 'border-[#e5e7eb] text-[#6b7280] hover:border-[#c01080]'
                    }`}
                  >
                    <r.icon className="w-5 h-5" />
                    <span className="text-xs">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#6b7280]">{roles.find((r) => r.value === role)?.desc}</p>
            </div>

            {/* Profile picture upload (Optional) */}
            <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-3">
              <label className="mb-2 block text-sm font-medium text-[#374151]">Profile Picture (Optional)</label>
              <ProfilePictureUpload
                userName={name || 'New User'}
                onFileSelect={(file) => setAvatarFile(file)}
              />
            </div>

            {/* Name */}
            <Input
              label="Full name"
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brian Mwangi"
              className="border-[#e5e7eb] bg-[#ffffff] text-[#101010] placeholder-[#9ca3af] focus:border-[#980868] focus:ring-[#ffd0e8]"
              required
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="you@example.com"
              error={emailError}
              className="border-[#e5e7eb] bg-[#ffffff] text-[#101010] placeholder-[#9ca3af] focus:border-[#980868] focus:ring-[#ffd0e8]"
              required
            />

            {/* Password with Show/Hide and Real-Time Strength Meter */}
            <div>
              <PasswordInput
                label="Password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                className="border-[#e5e7eb] bg-[#ffffff] text-[#101010] placeholder-[#9ca3af] focus:border-[#980868] focus:ring-[#ffd0e8]"
                required
              />
              {password.length > 0 && (
                <PasswordStrengthIndicator strength={passwordStrength} />
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={isSubmitting || (password.length > 0 && !passwordStrength.isValid)}
              className="mt-2 !rounded-xl !bg-[#980868] !py-3.5 hover:!bg-[#810657]"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
    </AuthShell>
  );
}
