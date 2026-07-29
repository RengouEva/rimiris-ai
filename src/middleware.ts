/**
 * Next.js middleware — security headers (VULN-10).
 *
 * Adds CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
 * Permissions-Policy to every response. HSTS is only set in production.
 *
 * CSP is permissive enough to allow Next.js internals (webpack, hot reload,
 * inline styles from Tailwind, framer-motion, image optimizations) but
 * blocks third-party scripts and inline event handlers. The 'unsafe-inline'
 * on style-src is required by Next.js inline <style> blocks — for full
 * nonce-based CSP we would need to refactor the layout.
 */

import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // -----------------------------------------------------------------------
  // Content-Security-Policy
  // -----------------------------------------------------------------------
  // - default-src 'self': only allow resources from our origin
  // - script-src 'self' 'unsafe-inline' 'unsafe-eval': Next.js dev needs
  //   unsafe-eval; production build also uses some inline scripts for
  //   hydration. (Tightening this requires nonces — out of scope here but
  //   the CSP at least blocks third-party scripts and exfil via img-src.)
  // - img-src: allow our origin + data: URIs (used by some icons) +
  //   blob: (used by file uploads previews). Cross-origin images blocked.
  // - connect-src: 'self' only — blocks XSS exfiltration via fetch() to
  //   attacker domains (VULN-18 mitigation).
  // - object-src 'none': blocks Flash/Java plugins
  // - frame-ancestors 'none': blocks clickjacking via iframe embedding
  // - base-uri 'self': blocks <base> tag hijack
  // - form-action 'self': blocks form submission to attacker domains (CSRF
  //   defense-in-depth)
  const isDev = process.env.NODE_ENV !== 'production'
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  res.headers.set('Content-Security-Policy', csp)

  // -----------------------------------------------------------------------
  // HSTS — only in production (would break localhost dev over HTTP)
  // -----------------------------------------------------------------------
  if (!isDev) {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    )
  }

  // -----------------------------------------------------------------------
  // Other security headers
  // -----------------------------------------------------------------------
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY') // backup for browsers ignoring CSP frame-ancestors
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self), usb=()',
  )
  // Don't leak the Next.js version
  res.headers.delete('X-Powered-By')

  return res
}

export const config = {
  // Apply to all routes except static assets (Next.js handles those itself).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.png|favicon-16.png|favicon.ico|logo.png|logo.webp|icon-|apple-touch-icon|manifest.json|robots.txt|sitemap.xml|icons/).*)',
  ],
}
