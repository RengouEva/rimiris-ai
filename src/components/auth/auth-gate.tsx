'use client'

import * as React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { LoginScreen } from './login-screen'

/**
 * Wrap any subtree with AuthGate to force a logged-in session.
 * If no session is present, the LoginScreen is shown instead.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return <>{children}</>
}
