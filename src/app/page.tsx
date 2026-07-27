'use client'

import * as React from 'react'
import { useIrisStore } from '@/store/iris-store'
import { WelcomeScreen } from '@/components/iris/welcome-screen'
import { OnboardingWizard } from '@/components/iris/onboarding-wizard'
import { Sidebar } from '@/components/iris/sidebar'
import { Header } from '@/components/iris/header'
import { Dashboard } from '@/components/iris/dashboard'
import { ChapterWorkspace } from '@/components/iris/chapter-workspace'
import { CoherenceView } from '@/components/iris/coherence-view'
import { SoutenanceView } from '@/components/iris/soutenance-view'
import { ExportView } from '@/components/iris/export-view'
import { AgentsView } from '@/components/iris/agents-view'
import { BlockedModal } from '@/components/iris/blocked-modal'

export default function Home() {
  const { view, projectInitialized } = useIrisStore()

  // Welcome & onboarding are full-screen flows (no app shell)
  if (view === 'welcome' || !projectInitialized) {
    if (view === 'onboarding') return <OnboardingWizard />
    return <WelcomeScreen />
  }

  // App shell with sidebar + header
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1">
          {view === 'dashboard' && <Dashboard />}
          {view === 'chapter' && <ChapterWorkspace />}
          {view === 'coherence' && <CoherenceView />}
          {view === 'soutenance' && <SoutenanceView />}
          {view === 'export' && <ExportView />}
          {view === 'agents' && <AgentsView />}
        </main>
      </div>
      <BlockedModal />
    </div>
  )
}
