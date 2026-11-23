/**
 * authUrl.ts
 *
 * Provides the canonical application base URL for auth redirects, email confirmation,
 * and password recovery callbacks.
 *
 * Precedence hierarchy:
 * 1. window.location.origin (when running in client browser - automatically adapts
 *    to localhost, Vercel preview deployments, or production domain)
 * 2. NEXT_PUBLIC_SITE_URL (custom canonical site URL set in Vercel or environment)
 * 3. NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL (Vercel automatic production domain, e.g. skill-sphere-navy.vercel.app)
 * 4. NEXT_PUBLIC_VERCEL_URL (Vercel deployment URL)
 * 5. Default fallback for local server/testing: http://localhost:3000
 */

export function getAuthBaseUrl(): string {
  // 1. Client-side runtime: window.location.origin is always the actual origin user is on
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  // 2. Explicit site URL from environment (e.g. https://skill-sphere-navy.vercel.app)
  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSiteUrl && envSiteUrl.trim()) {
    let url = envSiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, '');
  }

  // 3. Vercel Project Production URL (stable alias across builds)
  const vercelProdUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdUrl && vercelProdUrl.trim()) {
    let url = vercelProdUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, '');
  }

  // 4. Vercel deployment URL
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl && vercelUrl.trim()) {
    let url = vercelUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, '');
  }

  // 5. Fallback for local development
  return 'http://localhost:3000';
}

/**
 * Returns the full callback URL for email confirmation and auth callbacks.
 * Path defaults to '/auth/callback'.
 */
export function getEmailCallbackUrl(path: string = '/auth/callback'): string {
  const base = getAuthBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
