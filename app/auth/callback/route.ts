import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isUserRole } from '@/lib/supabase/authorization';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || 'Email verification failed or link expired.')}`,
        requestUrl.origin
      )
    );
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    const response = NextResponse.redirect(new URL('/login', requestUrl.origin));

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
      // Redirect based on role:
      // Learner -> /learner
      // Mentor -> /mentor/apply
      // Admin -> /admin
      let targetPath = '/learner';
      if (profile?.role === 'mentor') {
        targetPath = '/mentor/apply';
      } else if (profile?.role === 'admin') {
        targetPath = '/admin/dashboard';
      } else if (!isUserRole(profile?.role)) {
        targetPath = '/login?error=Your account profile is unavailable.';
      }

      const verifiedRedirect = NextResponse.redirect(new URL(targetPath, requestUrl.origin));
      // Copy cookies across
      response.cookies.getAll().forEach((cookie) => {
        verifiedRedirect.cookies.set(cookie.name, cookie.value);
      });
      return verifiedRedirect;
    }
  }

  // Fallback to login with message
  return NextResponse.redirect(new URL('/login?verified=true', requestUrl.origin));
}

