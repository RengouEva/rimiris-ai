'use client'

import * as React from 'react'

// Detects whether the app is running as an installed PWA (display-mode: standalone).
export function useIsStandalone() {
  const [standalone, setStandalone] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(display-mode: standalone)')
    const update = () => setStandalone(mql.matches || (window.navigator as any).standalone === true)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return standalone
}

// Detects whether the user is on iOS (for PWA install hint workarounds).
export function useIsIOS() {
  const [ios, setIos] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)
  }, [])
  return ios
}
