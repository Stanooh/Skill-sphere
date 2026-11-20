import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase proxy environment configuration.');
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        const existingCookies = supabaseResponse.cookies.getAll();
        const existingHeaders = new Headers(supabaseResponse.headers);
        supabaseResponse = NextResponse.next({ request });

        existingCookies.forEach((cookie) => {
          supabaseResponse.cookies.set(cookie);
        });
        existingHeaders.forEach((value, name) => {
          if (name.toLowerCase() !== 'set-cookie') {
            supabaseResponse.headers.set(name, value);
          }
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  // Get current user claims/session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protected paths that require authentication and email verification
  const isProtectedPath =
    path === '/learner' ||
    path.startsWith('/learner/') ||
    path === '/mentor' ||
    path.startsWith('/mentor/') ||
    path === '/admin' ||
    path.startsWith('/admin/');

  if (isProtectedPath) {
    if (!user) {
      // Not authenticated -> redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (!user.email_confirmed_at) {
      // Authenticated but unverified email -> redirect to verify-email
      const url = request.nextUrl.clone();
      url.pathname = '/verify-email';
      if (user.email) {
        url.searchParams.set('email', user.email);
      }
      return NextResponse.redirect(url);
    }
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id ?? '')
      .maybeSingle();

    if (profileError || profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      if (profile?.role === 'mentor') {
        url.pathname = '/mentor/apply';
        url.search = '';
      } else if (profile?.role === 'learner') {
        url.pathname = '/learner';
        url.search = '';
      } else {
        url.pathname = '/login';
        url.search = '';
        url.searchParams.set('error', 'Your account profile could not be verified.');
        url.searchParams.set('next', request.nextUrl.pathname);
      }
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
