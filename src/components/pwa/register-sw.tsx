'use client'

import * as React from 'react'

// ============================================================================
// ServiceWorkerRegistration — registers /sw.js on mount, unregisters on unmount.
// Skipped in development to avoid caching surprises during local dev.
// ============================================================================

export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // Only register in production — dev mode caching causes more harm than good.
    if (process.env.NODE_ENV !== 'production') return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        // Listen for updates — when a new SW takes over, reload the page once
        // so the user gets the new app shell.
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          window.location.reload()
        })

        // Check for updates every 60 minutes.
        setInterval(() => {
          reg.update().catch(() => {})
        }, 60 * 60 * 1000)
      } catch (err) {
        // Silent failure — service worker is a progressive enhancement.
        console.warn('[PWA] Service worker registration failed:', err)
      }
    }

    // Defer registration until the page is fully loaded to avoid competing
    // with first-paint network requests.
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
