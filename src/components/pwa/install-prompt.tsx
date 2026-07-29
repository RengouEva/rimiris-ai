'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// PWAInstallPrompt — listens for `beforeinstallprompt`, shows a dismissable
// banner offering to install the app. Also handles iOS (which doesn't fire
// beforeinstallprompt) by detecting standalone mode and showing a hint.
// ============================================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  platforms: string[]
}

const DISMISS_KEY = 'rimiris.pwa.install.dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)
  const [isStandalone, setIsStandalone] = React.useState(false)
  const [isIOS, setIsIOS] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect standalone mode (already installed).
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Detect iOS (no beforeinstallprompt support).
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Don't show anything if already installed.
    if (standalone) return

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      const evt = e as BeforeInstallPromptEvent

      // Respect previous dismissal (within 7 days).
      try {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0')
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) return
      } catch {}

      setDeferredPrompt(evt)
      setVisible(true)
    }

    function onAppInstalled() {
      setVisible(false)
      setDeferredPrompt(null)
      try {
        localStorage.removeItem(DISMISS_KEY)
      } catch {}
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  // For iOS, show a one-time hint after 30 seconds if not dismissed.
  React.useEffect(() => {
    if (isStandalone || !isIOS || deferredPrompt) return
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0')
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) return
    } catch {}

    const t = setTimeout(() => setVisible(true), 30000)
    return () => clearTimeout(t)
  }, [isStandalone, isIOS, deferredPrompt])

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
  }

  async function install() {
    if (!deferredPrompt) {
      // iOS path — no programmatic prompt, just dismiss the hint.
      dismiss()
      return
    }
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'dismissed') {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {}
    }
    setDeferredPrompt(null)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && !isStandalone && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 p-4 rounded-2xl border border-primary/30 bg-card shadow-2xl backdrop-blur-md"
          style={{
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl iris-gradient flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">
                Installer Rimiris AI
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {isIOS
                  ? "Sur Safari, appuyez sur l'icône Partager puis « Sur l'écran d'accueil » pour installer l'app."
                  : "Installez Rimiris AI pour un accès rapide et un usage hors ligne."}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <Button
                  size="sm"
                  onClick={install}
                  className="rounded-full iris-gradient text-white h-8"
                >
                  {isIOS ? (
                    <>
                      <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                      J'ai compris
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Installer
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={dismiss}
                  className="rounded-full h-8 text-muted-foreground"
                >
                  Plus tard
                </Button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted flex-shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {!isIOS && (
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span>Fonctionne sur ordinateur et mobile · hors ligne disponible</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
