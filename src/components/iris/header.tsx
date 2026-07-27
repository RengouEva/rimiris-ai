'use client'

import * as React from 'react'
import { GraduationCap, Menu, HelpCircle } from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from './theme-toggle'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { CHAPTERS } from '@/lib/iris/chapters'

export function Header() {
  const { project, setBlockedModal, view, setActiveChapter, setView, chapters } = useIrisStore()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const completed = Object.values(chapters).filter(
    (c) => c.status === 'completed' || c.status === 'validated'
  ).length

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
              <Sidebar />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg iris-gradient flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">IRIS</span>
          </div>
        </div>

        {/* Project title */}
        <div className="hidden lg:flex flex-col min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-none">
            {project.level || 'Mémoire'} · {project.filiere || 'Filière non précisée'}
          </p>
          <p className="text-sm font-semibold truncate leading-tight mt-0.5">
            {project.title || project.theme || 'Mémoire sans titre'}
          </p>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {completed}/{CHAPTERS.length} chapitres
          </Badge>
          <Button
            onClick={() => setBlockedModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-full"
            size="sm"
          >
            <HelpCircle className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Je suis bloqué</span>
            <span className="sm:hidden">Bloqué</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
