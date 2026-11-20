import { redirect } from 'next/navigation';
import { getAuthenticatedProfile } from '@/lib/supabase/authorization';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await getAuthenticatedProfile();

  if (!authenticated) {
    redirect('/login?next=/admin/dashboard');
  }

  if (authenticated.profile.role !== 'admin') {
    redirect(authenticated.profile.role === 'mentor' ? '/mentor/apply' : '/learner');
  }

  return children;
}
