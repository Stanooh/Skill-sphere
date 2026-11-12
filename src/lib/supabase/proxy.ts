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

  await supabase.auth.getClaims();

  return supabaseResponse;
}
