import { Suspense } from 'react';
import { VerifyEmailView } from '@/views/VerifyEmailView';

export const metadata = {
  title: 'Verify Your Email — SkillSphere',
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-ink-50">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailView />
    </Suspense>
  );
}

