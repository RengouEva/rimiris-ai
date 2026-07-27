'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Circle,
  Edit3,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileText,
  ShieldCheck,
  PenLine,
  FlaskConical,
  Library,
  Quote,
  Calculator,
  SpellCheck,
  Presentation,
  Bot,
  GraduationCap,
  Globe,
  Target,
  HelpCircle,
  Flag,
  Layers,
  MessagesSquare,
  Compass,
  BarChart3,
  Lightbulb,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { CHAPTERS, type ChapterStatus } from '@/lib/iris/chapters'
import { AGENTS } from '@/lib/iris/agents'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Local helpers (computed in component to avoid zustand snapshot infinite loops)
function computeProgress(chapters: any) {
  const list = Object.values(chapters)
  const total = list.length
  const completed = list.filter((c: any) => c.status === 'completed' || c.status === 'validated').length
  const inProgress = list.filter((c: any) => c.status === 'in_progress' || c.status === 'draft').length
  return {
    total,
    completed,
    inProgress,
    notStarted: total - completed - inProgress,
    percent: Math.round((completed / total) * 100),
  }
}
function computeScores(chapters: any, coherenceIssues: any) {
  const list = Object.values(chapters)
  const totalWords = list.reduce((sum: number, c: any) => sum + c.wordCount, 0)
  const draftedCount = list.filter((c: any) => c.wordCount > 100).length
  const validatedCount = list.filter((c: any) => c.status === 'validated').length
  const highSeverityIssues = coherenceIssues.filter((i: any) => i.severity === 'high').length
  const progression = Math.round((draftedCount / list.length) * 100)
  const redaction = Math.min(100, Math.round(totalWords / 50))
  const methodologique = Math.min(
    100,
    Math.round(
      ((chapters['methodologie']?.wordCount || 0) / 30) +
        ((chapters['cadre']?.wordCount || 0) / 30) +
        ((chapters['hypotheses']?.wordCount || 0) / 30)
    )
  )
  const coherence = Math.max(0, 100 - highSeverityIssues * 20)
  const global = Math.round((progression + redaction + methodologique + coherence) / 4)
  return { progression, redaction, methodologique, coherence, global, totalWords, validatedCount }
}

const STATUS_CONFIG: Record<ChapterStatus, { label: string; color: string; icon: any }> = {
  not_started: { label: 'Non commencé', color: 'text-muted-foreground', icon: Circle },
  in_progress: { label: 'En cours', color: 'text-amber-500', icon: Edit3 },
  draft: { label: 'Brouillon', color: 'text-blue-500', icon: Edit3 },
  completed: { label: 'Terminé', color: 'text-emerald-500', icon: CheckCircle2 },
  validated: { label: 'Validé', color: 'text-emerald-600', icon: CheckCircle2 },
}

export function Dashboard() {
  const { project, chapters, setActiveChapter, setView, coherenceIssues, setActiveAgent } = useIrisStore()
  const progress = React.useMemo(() => computeProgress(chapters), [chapters])
  const scores = React.useMemo(
    () => computeScores(chapters, coherenceIssues),
    [chapters, coherenceIssues]
  )

  const activeAgents = React.useMemo(() => {
    const inProgressChapters = Object.values(chapters).filter(
      (c) => c.status === 'in_progress' || c.status === 'draft'
    )
    const agentIds = new Set<string>()
    inProgressChapters.forEach((c) => {
      const chapter = CHAPTERS.find((ch) => ch.id === c.id)
      if (chapter) agentIds.add(chapter.agent)
    })
    return AGENTS.filter((a) => agentIds.has(a.id))
  }, [chapters])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 iris-gradient opacity-[0.03]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Tableau de bord</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Bon retour dans votre mémoire
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            {project.title
              ? `« ${project.title} »`
              : "Définissez votre titre définitif dans le premier chapitre."}{' '}
            · {project.level || 'Master'} · {project.filiere || 'Filière à préciser'} ·{' '}
            {project.university || 'Université à préciser'}
          </p>
        </div>
      </motion.div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          icon={TrendingUp}
          label="Score global"
          value={scores.global}
          color="violet"
          delay={0.05}
        />
        <ScoreCard
          icon={BookOpen}
          label="Progression"
          value={scores.progression}
          color="blue"
          delay={0.1}
        />
        <ScoreCard
          icon={PenLine}
          label="Qualité rédaction"
          value={scores.redaction}
          color="amber"
          delay={0.15}
        />
        <ScoreCard
          icon={ShieldCheck}
          label="Cohérence"
          value={scores.coherence}
          color="emerald"
          delay={0.2}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chapters list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Vos chapitres</h2>
            <Button variant="outline" size="sm" onClick={() => setActiveChapter('sujet')}>
              Reprendre
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-2">
            {CHAPTERS.map((chapter, idx) => {
              const ch = chapters[chapter.id]
              const status = STATUS_CONFIG[ch.status]
              const StatusIcon = status.icon
              const IconComp = ICON_MAP[chapter.icon] || BookOpen
              const isNext =
                ch.status === 'not_started' &&
                (idx === 0 || chapters[CHAPTERS[idx - 1].id].status !== 'not_started')

              return (
                <motion.button
                  key={chapter.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => setActiveChapter(chapter.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all group',
                    isNext && 'border-primary/50 iris-glow'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        ch.status === 'completed' || ch.status === 'validated'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : ch.status === 'in_progress' || ch.status === 'draft'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-medium">
                          Chapitre {chapter.order}
                        </span>
                        {isNext && (
                          <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                            À faire
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {chapter.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {chapter.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={cn('inline-flex items-center gap-1', status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        {ch.wordCount > 0 && (
                          <span className="text-muted-foreground">
                            {ch.wordCount} mots
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-2" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Right column: agents + coherence */}
        <div className="space-y-6">
          {/* Active agents */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  Agents IA actifs
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setView('agents')}>
                  Voir tous
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucun agent actif pour le moment.
                </p>
              ) : (
                activeAgents.slice(0, 4).map((agent) => {
                  const IconComp = ICON_MAP[agent.icon] || Bot
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setActiveAgent(agent.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Coherence summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Cohérence globale
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coherenceIssues.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">Aucune incohérence détectée</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Lancez une vérification pour analyser votre mémoire.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {coherenceIssues.slice(0, 3).map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 text-sm">
                      <AlertTriangle
                        className={cn(
                          'h-4 w-4 flex-shrink-0 mt-0.5',
                          issue.severity === 'high'
                            ? 'text-red-500'
                            : issue.severity === 'medium'
                            ? 'text-amber-500'
                            : 'text-blue-500'
                        )}
                      />
                      <p className="text-xs">{issue.message}</p>
                    </div>
                  ))}
                  {coherenceIssues.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{coherenceIssues.length - 3} autres problèmes
                    </p>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => setView('coherence')}
              >
                Vérifier la cohérence
              </Button>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StatRow label="Mots rédigés" value={scores.totalWords} icon={FileText} />
              <StatRow label="Chapitres terminés" value={`${progress.completed}/${progress.total}`} icon={CheckCircle2} />
              <StatRow label="En cours" value={progress.inProgress} icon={Clock} />
              <StatRow label="Validés" value={scores.validatedCount} icon={ShieldCheck} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: any
  label: string
  value: number
  color: 'violet' | 'blue' | 'amber' | 'emerald'
  delay?: number
}) {
  const colorMap = {
    violet: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-600',
    amber: 'from-amber-500 to-orange-600',
    emerald: 'from-emerald-500 to-teal-600',
  }
  const textMap = {
    violet: 'text-violet-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="overflow-hidden relative">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', colorMap[color])}>
              <Icon className="h-4 w-4" />
            </div>
            <span className={cn('text-2xl font-bold', textMap[color])}>{value}</span>
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="mt-2">
            <Progress value={value} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatRow({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

// Map icon string names to lucide components
const ICON_MAP: Record<string, any> = {
  Lightbulb,
  BookOpen,
  Globe,
  Target,
  HelpCircle,
  Flag,
  Sparkles,
  Library,
  Layers,
  FlaskConical,
  BarChart3,
  MessagesSquare,
  CheckCircle2,
  Compass,
  GraduationCap,
  PenLine,
  Quote,
  Calculator,
  SpellCheck,
  FileText,
  Presentation,
  ShieldCheck,
  Bot,
}
