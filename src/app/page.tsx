'use client'

import * as React from 'react'
import { useIrisStore, type ViewMode } from '@/store/iris-store'
import { WelcomeScreen } from '@/components/iris/welcome-screen'
import { OnboardingInterview } from '@/components/iris/onboarding-interview'
import { Sidebar } from '@/components/iris/sidebar'
import { Header } from '@/components/iris/header'
import { Workspace } from '@/components/iris/workspace'
import { CoherenceView } from '@/components/iris/coherence-view'
import { SoutenanceView } from '@/components/iris/soutenance-view'
import { SimulationView } from '@/components/iris/simulation-view'
import { PlagiarismView } from '@/components/iris/plagiarism-view'
import { ExportView } from '@/components/iris/export-view'
import { AgentsView } from '@/components/iris/agents-view'
import { AuditView } from '@/components/iris/audit-view'
import { GuideView } from '@/components/iris/guide-view'

// Valid view IDs that can be passed via ?view= for PWA shortcuts.
const VALID_VIEWS: ViewMode[] = [
  'workspace',
  'guide',
  'audit',
  'coherence',
  'soutenance',
  'simulation',
  'plagiarism',
  'export',
  'agents',
]

export default function Home() {
  const { view, projectInitialized, setView } = useIrisStore()

  // Honor ?view=... from PWA shortcuts (only if the project is initialized).
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!projectInitialized) return
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('view') as ViewMode | null
    if (requested && VALID_VIEWS.includes(requested)) {
      setView(requested)
      // Clean up the URL so a refresh doesn't keep jumping to that view.
      const url = new URL(window.location.href)
      url.searchParams.delete('view')
      window.history.replaceState({}, '', url.toString())
    }
  }, [projectInitialized, setView])

  // Full-screen views (no app shell)
  if (view === 'welcome' || (!projectInitialized && view !== 'onboarding')) {
    return <WelcomeScreen />
  }
  if (view === 'onboarding') {
    return <OnboardingInterview />
  }

  // App shell (workspace + nav views).
  // Using min-h-[100dvh] for mobile-friendly dynamic viewport height
  // (accounts for iOS Safari's URL bar that grows/shrinks).
  return (
    <div className="min-h-[100dvh] flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 min-h-0">
          {view === 'workspace' && <Workspace />}
          {view === 'guide' && <GuideView />}
          {view === 'audit' && <AuditView />}
          {view === 'coherence' && <CoherenceView />}
          {view === 'soutenance' && <SoutenanceView />}
          {view === 'simulation' && <SimulationView />}
          {view === 'plagiarism' && <PlagiarismView />}
          {view === 'export' && <ExportView />}
          {view === 'agents' && <AgentsView />}
        </main>
      </div>
    </div>
  )
}
