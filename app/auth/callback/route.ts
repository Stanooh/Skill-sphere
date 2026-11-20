import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isUserRole } from '@/lib/supabase/authorization';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const verificationType = requestUrl.searchParams.get('type');
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

  if (code || tokenHash) {
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

    const exchangeResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          type: verificationType === 'signup' || verificationType === 'email'
            ? 'email'
            : 'email',
          token_hash: tokenHash!,
        });
    const data = 'data' in exchangeResult ? exchangeResult.data : null;
    const exchangeError = exchangeResult.error;

    if (!exchangeError && data?.user) {
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

      return NextResponse.redirect(
        new URL(targetPath, requestUrl.origin),
        {
          headers: response.headers,
        }
      );
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(exchangeError?.message || 'Email verification failed or the link has expired.')}`,
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      '/login?error=Email verification failed because no valid confirmation parameters were provided.',
      requestUrl.origin
    )
  );
}

