import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { isUserRole } from '@/lib/supabase/authorization';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const rawType = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Support custom next destination if provided (with open-redirect prevention)
  const nextParam = requestUrl.searchParams.get('next');
  const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

  // Derive origin safely, accounting for reverse proxies (e.g. Vercel)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const effectiveOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(errorDescription || 'Email verification failed or link expired.')}`,
        effectiveOrigin
      )
    );
  }

  if (code || tokenHash) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    const response = NextResponse.redirect(new URL('/login', effectiveOrigin));

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

    // Map verification type to valid EmailOtpType
    const otpType: EmailOtpType =
      rawType === 'signup' ||
      rawType === 'invite' ||
      rawType === 'magiclink' ||
      rawType === 'recovery' ||
      rawType === 'email_change' ||
      rawType === 'email'
        ? (rawType as EmailOtpType)
        : 'email';

    const exchangeResult = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({
          type: otpType,
          token_hash: tokenHash!,
        });

    const data = 'data' in exchangeResult ? exchangeResult.data : null;
    const exchangeError = exchangeResult.error;

    if (!exchangeError && data?.user) {
      // If a recovery link was used, direct immediately to reset-password
      if (otpType === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', effectiveOrigin), {
          headers: response.headers,
        });
      }

      // If user provided a specific safe destination (e.g. via ?next=/...)
      if (safeNext) {
        return NextResponse.redirect(new URL(safeNext, effectiveOrigin), {
          headers: response.headers,
        });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      // Redirect based on role:
      // Learner -> /learner
      // Mentor -> /mentor/apply
      // Admin -> /admin/dashboard
      let targetPath = '/learner';
      if (profile?.role === 'mentor') {
        targetPath = '/mentor/apply';
      } else if (profile?.role === 'admin') {
        targetPath = '/admin/dashboard';
      } else if (!isUserRole(profile?.role)) {
        targetPath = '/login?error=Your account profile is unavailable.';
      }

      return NextResponse.redirect(
        new URL(targetPath, effectiveOrigin),
        {
          headers: response.headers,
        }
      );
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(exchangeError?.message || 'Email verification failed or the link has expired.')}`,
        effectiveOrigin
      )
    );
  }

  return NextResponse.redirect(
    new URL(
      '/login?error=Email verification failed because no valid confirmation parameters were provided.',
      effectiveOrigin
    )
  );
}

