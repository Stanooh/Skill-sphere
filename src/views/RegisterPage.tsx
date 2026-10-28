'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, AlertCircle, Compass, GraduationCap as LearnerIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/types';

export function RegisterPage() {
  const { register } = useAuth();
  const { show } = useToast();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    const user = register(name, email, role);
    if (!user) {
      setError('An account with that email already exists.');
      return;
    }
    show(`Account created. Welcome, ${user.name.split(' ')[0]}!`, 'success');
    const base = user.role === 'learner' ? '/learner' : user.role === 'mentor' ? '/mentor' : '/admin';
    router.push(base);
  };

  const roles: { value: Exclude<UserRole, 'admin'>; label: string; icon: typeof LearnerIcon; desc: string }[] = [
    { value: 'learner', label: 'Learner', icon: LearnerIcon, desc: 'Find mentors and learn skills' },
    { value: 'mentor', label: 'Mentor', icon: Compass, desc: 'Guide learners and host workshops' },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-ink-800 flex-col justify-between p-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">SkillSphere</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white mb-4 max-w-md">
            Join SkillSphere and start your learning journey.
          </h1>
          <p className="text-ink-400 max-w-md">
            Create a profile, get matched with mentors, and follow a personalized roadmap to your goals.
          </p>
        </div>
        <p className="text-sm text-ink-300">Skill-sharing, mentorship, and personalized learning.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-ink tracking-tight">SkillSphere</span>
          </Link>

          <h2 className="text-2xl font-bold text-ink mb-1">Create your account</h2>
          <p className="text-sm text-ink-400 mb-6">Choose your role and get started in seconds.</p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">I want to join as a</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                      role === r.value
                        ? 'border-brand bg-brand-50 text-brand-700'
                        : 'border-ink-200 text-ink-500 hover:border-ink-300'
                    }`}
                  >
                    <r.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-400 mt-2">{roles.find((r) => r.value === role)?.desc}</p>
            </div>

            <Input label="Full name" type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Brian Mwangi" />
            <Input label="Email" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <Input label="Password" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password" />
            <Button type="submit" fullWidth size="lg">Create Account</Button>
          </form>

          <p className="text-sm text-ink-400 mt-6 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-brand font-medium hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
