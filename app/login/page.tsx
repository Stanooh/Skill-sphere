import { Suspense } from 'react';
import { LoginPage } from '@/views/LoginPage';

export const metadata = {
  title: 'Sign In — SkillSphere',
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-ink-50">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
