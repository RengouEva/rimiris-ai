'use client'

import * as React from 'react'
import { Menu, ChevronLeft } from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { ThemeToggle } from './theme-toggle'
import { NAV_ITEMS } from './sidebar'
import { RimirisLogo } from './rimiris-logo'

export function Header() {
  const {
    project,
    sections,
    view,
    setView,
  } = useIrisStore()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const completed = sections.filter((s) => s.status === 'completed').length

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="h-full px-4 flex items-center justify-between gap-3">
        {/* Mobile menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <RimirisLogo size="sm" withWordmark />
          </div>
        </div>

        {/* Project title (center on desktop) */}
        <div className="hidden lg:flex flex-col min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-none">
            {project.level || 'Mémoire'}{project.filiere ? ` · ${project.filiere}` : ''}
          </p>
          <button
            onClick={() => setView('workspace')}
            className="text-sm font-semibold truncate leading-tight mt-0.5 hover:text-primary transition-colors text-left"
          >
            {project.title || 'Mémoire sans titre'}
          </button>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
          <span>{sections.length} sections</span>
          <span>·</span>
          <span>{totalWords} mots</span>
          {completed > 0 && (
            <>
              <span>·</span>
              <span className="text-emerald-500">{completed} terminées</span>
            </>
          )}
        </div>

        {/* Right actions
            - Sur Mon Mémoire : juste le toggle thème (l'IA se lance via l'icône Sparkles
              sur chaque section dans la sidebar gauche, et l'export via le bouton Exporter
              dans la barre d'outils de l'éditeur).
            - Sur les autres vues : bouton "Retour au mémoire". */}
        <div className="flex items-center gap-1.5">
          {view !== 'workspace' && view !== 'export' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setView('workspace')}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mémoire</span>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const { view, setView } = useIrisStore()
  return (
    <div className="p-3 space-y-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => {
              setView(item.id)
              onNavigate()
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
