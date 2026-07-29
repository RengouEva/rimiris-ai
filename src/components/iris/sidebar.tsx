'use client'

import * as React from 'react'
import {
  GraduationCap,
  PenLine,
  ShieldCheck,
  Presentation,
  FileDown,
  Bot,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  ClipboardCheck,
  Users,
  Shield,
  BookOpen,
  Crown,
  Settings,
} from 'lucide-react'
import { useIrisStore, type ViewMode } from '@/store/iris-store'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RimirisLogo } from './rimiris-logo'
import { getCurrentUser } from '@/lib/iris/analytics'
import { getTier } from '@/lib/iris/tiers'

export const NAV_ITEMS: { id: ViewMode; label: string; icon: any }[] = [
  { id: 'guide', label: 'Guide méthodo', icon: BookOpen },
  { id: 'workspace', label: 'Mon mémoire', icon: PenLine },
  { id: 'plagiarism', label: 'Anti-plagiat', icon: Shield },
  { id: 'audit', label: 'Audit final', icon: ClipboardCheck },
  { id: 'coherence', label: 'Cohérence', icon: ShieldCheck },
  { id: 'soutenance', label: 'Soutenance', icon: Presentation },
  { id: 'simulation', label: 'Simulation', icon: Users },
  { id: 'export', label: 'Exporter', icon: FileDown },
  { id: 'agents', label: 'Agents IA', icon: Bot },
]

export function Sidebar() {
  const { view, setView, sidebarCollapsed, toggleSidebar, project, sections } = useIrisStore() as any
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Current user's tier — for showing a badge + upgrade CTA
  const [currentUser, setCurrentUser] = React.useState(() => getCurrentUser())
  React.useEffect(() => {
    const i = setInterval(() => setCurrentUser(getCurrentUser()), 2000)
    return () => clearInterval(i)
  }, [])
  const tier = getTier(currentUser.tier)

  const totalWords = sections.reduce((sum: number, s: any) => sum + s.wordCount, 0)
  const completed = sections.filter((s: any) => s.status === 'completed').length

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Brand — clickable → landing page */}
      <div className="h-16 flex items-center justify-center px-3 border-b border-sidebar-border">
        <button
          onClick={() => setView('welcome')}
          className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
          aria-label="Rimiris AI — retour à l'accueil"
          title="Retour à l'accueil"
        >
          {sidebarCollapsed ? (
            <RimirisLogo size="md" />
          ) : (
            <RimirisLogo size="lg" withWordmark centered />
          )}
        </button>
      </div>
      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          // Petite pastille verte sur "Guide méthodo" quand un guide est actif
          const guideActive = item.id === 'guide' && project?.guideText && project.guideText.trim().length > 0
          return (
            <TooltipProvider key={item.id} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setView(item.id)}
                    className={cn(
                      'relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {guideActive && !sidebarCollapsed && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 flex-shrink-0"
                        title="Guide actif"
                      />
                    )}
                    {guideActive && sidebarCollapsed && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    )}
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
            <span className="text-xs font-medium text-muted-foreground">Avancement</span>
            <span className="text-xs font-bold">{completed}/{sections.length || 0}</span>
          </div>
          <div className="h-1.5 rounded-full bg-sidebar-border overflow-hidden">
            <div
              className="h-full iris-gradient transition-all"
              style={{
                width: `${sections.length ? (completed / sections.length) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{totalWords} mots rédigés</p>
        </div>
      )}

      {/* Tier badge + upgrade CTA */}
      {!sidebarCollapsed && (
        <div className="p-2 mx-2 mb-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-2 h-2 rounded-full" style={{ background: tier.color }} />
            <span className="text-xs font-medium">Plan {tier.name}</span>
            {currentUser.tier === 'free' && (
              <span className="ml-auto text-[10px] text-muted-foreground">Gratuit</span>
            )}
          </div>
          {currentUser.tier === 'free' && (
            <button
              onClick={() => setView('pricing')}
              className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium iris-gradient text-white hover:opacity-90 transition-opacity"
            >
              <Crown className="h-3 w-3" />
              Passer à Pro
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {/* Pricing link */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setView('pricing')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  view === 'pricing'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent',
                )}
              >
                <Crown className="h-4 w-4" />
                {!sidebarCollapsed && <span>Tarifs & Plans</span>}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">Tarifs & Plans</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        {/* Admin link (subtle — accessible but not loud) */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setView('admin')}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  view === 'admin'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground/70 hover:bg-sidebar-accent hover:text-muted-foreground',
                )}
              >
                <Settings className="h-4 w-4" />
                {!sidebarCollapsed && <span className="text-xs">Portail Admin</span>}
              </button>
            </TooltipTrigger>
            {sidebarCollapsed && <TooltipContent side="right">Portail Admin</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

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
