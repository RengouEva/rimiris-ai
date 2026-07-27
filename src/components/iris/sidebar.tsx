'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Presentation,
  FileDown,
  Bot,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Settings,
} from 'lucide-react'
import { useIrisStore, type ViewMode } from '@/store/iris-store'
import { CHAPTERS } from '@/lib/iris/chapters'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const NAV_ITEMS: { id: ViewMode; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'chapter', label: 'Chapitres', icon: ListChecks },
  { id: 'coherence', label: 'Cohérence', icon: ShieldCheck },
  { id: 'soutenance', label: 'Soutenance', icon: Presentation },
  { id: 'export', label: 'Exporter', icon: FileDown },
  { id: 'agents', label: 'Agents IA', icon: Bot },
]

export function Sidebar() {
  const { view, setView, setActiveChapter, sidebarCollapsed, toggleSidebar, project, chapters } =
    useIrisStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const completed = Object.values(chapters).filter(
    (c) => c.status === 'completed' || c.status === 'validated'
  ).length
  const totalChapters = CHAPTERS.length

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl iris-gradient flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none">IRIS Thesis AI</p>
            <p className="text-xs text-muted-foreground leading-none mt-1 truncate">
              {project.title || 'Nouveau mémoire'}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = view === item.id || (item.id === 'chapter' && view === 'chapter')
          return (
            <TooltipProvider key={item.id} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      if (item.id === 'chapter') {
                        setActiveChapter('sujet')
                      } else {
                        setView(item.id)
                      }
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {sidebarCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </nav>

      {/* Progress */}
      {!sidebarCollapsed && (
        <div className="p-3 mx-2 mb-2 rounded-lg bg-sidebar-accent/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Progression</span>
            <span className="text-xs font-bold">{completed}/{totalChapters}</span>
          </div>
          <div className="h-1.5 rounded-full bg-sidebar-border overflow-hidden">
            <div
              className="h-full iris-gradient transition-all"
              style={{ width: `${(completed / totalChapters) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Réduire</span>
            </>
          )}
        </button>
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>}
          </button>
        )}
      </div>
    </aside>
  )
}
