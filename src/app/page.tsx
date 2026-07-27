'use client'

import * as React from 'react'
import { useIrisStore } from '@/store/iris-store'
import { WelcomeScreen } from '@/components/iris/welcome-screen'
import { QuickStart } from '@/components/iris/quick-start'
import { Sidebar } from '@/components/iris/sidebar'
import { Header } from '@/components/iris/header'
import { Workspace } from '@/components/iris/workspace'
import { CoherenceView } from '@/components/iris/coherence-view'
import { SoutenanceView } from '@/components/iris/soutenance-view'
import { ExportView } from '@/components/iris/export-view'
import { AgentsView } from '@/components/iris/agents-view'

export default function Home() {
  const { view, projectInitialized, sections } = useIrisStore()
  const [quickStartOpen, setQuickStartOpen] = React.useState(false)

  // Welcome is full-screen
  if (view === 'welcome' || !projectInitialized) {
    if (quickStartOpen) {
      return <QuickStart open={quickStartOpen} onOpenChange={setQuickStartOpen} />
    }
    return <WelcomeScreen />
  }

  // App shell
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1">
          {view === 'workspace' && <Workspace />}
          {view === 'coherence' && <CoherenceView />}
          {view === 'soutenance' && <SoutenanceView />}
          {view === 'export' && <ExportView />}
          {view === 'agents' && <AgentsView />}
        </main>
      </div>
    </div>
  )
}
