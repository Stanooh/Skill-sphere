'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    const user = login(email, password);
    if (!user) {
      setError('No account found with that email. Try a demo account below.');
      return;
    }
    show(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');
    const base = user.role === 'learner' ? '/learner' : user.role === 'mentor' ? '/mentor' : '/admin';
    router.push(base);
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-700 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">SkillSphere</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white mb-4 max-w-md">
            Learn from mentors who match your skills and goals.
          </h1>
          <p className="text-ink-200 max-w-md">
            Sign in to access your dashboard, mentor recommendations, sessions, and personalized learning roadmap.
          </p>
        </div>
        <p className="text-sm text-ink-300">Skill-sharing, mentorship, and personalized learning.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">SkillSphere</span>
          </Link>

          <h2 className="text-2xl font-bold text-ink mb-1">Sign in</h2>
          <p className="text-sm text-ink-400 mb-6">Welcome back. Enter your credentials to continue.</p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter any password"
            />
            <Button type="submit" fullWidth size="lg">Sign In</Button>
          </form>

          <div className="mt-8 pt-6 border-t border-ink-100">
            <p className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-3">Demo Accounts</p>
            <div className="space-y-2">
              {[
                { role: 'Learner', email: 'learner@skillsphere.demo' },
                { role: 'Mentor', email: 'mentor@skillsphere.demo' },
                { role: 'Admin', email: 'admin@skillsphere.demo' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc.email)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-ink-100 hover:border-brand hover:bg-brand-50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{acc.role}</p>
                    <p className="text-xs text-ink-400 font-mono">{acc.email}</p>
                  </div>
                  <span className="text-xs text-brand font-medium">Use</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-sm text-ink-400 mt-6 text-center">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand font-medium hover:text-brand-700">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
