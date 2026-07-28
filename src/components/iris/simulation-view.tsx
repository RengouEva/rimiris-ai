'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  RefreshCw,
  Award,
  ArrowLeft,
  Hand,
  Square,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertCircle,
} from 'lucide-react'
import { useIrisStore, type JuryRole } from '@/store/iris-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<JuryRole, { badge: string; bubble: string; avatar: string }> = {
  Président: {
    badge: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
    bubble: 'bg-violet-500/5 border-violet-500/20',
    avatar: 'bg-gradient-to-br from-violet-500 to-purple-600',
  },
  Rapporteur: {
    badge: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
    bubble: 'bg-cyan-500/5 border-cyan-500/20',
    avatar: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  },
  Directeur: {
    badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    bubble: 'bg-emerald-500/5 border-emerald-500/20',
    avatar: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  Examinateur: {
    badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    bubble: 'bg-amber-500/5 border-amber-500/20',
    avatar: 'bg-gradient-to-br from-amber-500 to-orange-600',
  },
}

const ALL_ROLES: JuryRole[] = ['Président', 'Rapporteur', 'Directeur', 'Examinateur']

export function SimulationView() {
  const {
    project,
    sections,
    soutenanceData,
    simulationMessages,
    simulationActive,
    simulationDebrief,
    addSimulationMessage,
    clearSimulation,
    setSimulationActive,
    setSimulationDebrief,
    setView,
  } = useIrisStore() as any

  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState<null | 'start' | 'next' | 'debrief'>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const draftedCount = sections.filter((s: any) => s.content.trim().length > 100).length

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [simulationMessages, loading])

  // Focus input when simulation becomes active
  React.useEffect(() => {
    if (simulationActive && !loading && !simulationDebrief) {
      inputRef.current?.focus()
    }
  }, [simulationActive, loading, simulationDebrief])

  // ========================================================================
  // Start a new simulation
  // ========================================================================
  async function handleStart() {
    if (draftedCount === 0) {
      toast.error("Rédigez au moins une section de votre mémoire avant de simuler la soutenance.")
      return
    }
    setLoading('start')
    clearSimulation()
    setSimulationActive(true)
    addSimulationMessage({
      role: 'system',
      content: `Démarrage de la simulation de soutenance — ${project.title || 'Mémoire'} (${project.level || 'Master'}). Le jury va prendre la parole.`,
    })

    try {
      const res = await fetch('/api/ai/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          project,
          sections: sections.map((s: any) => ({ title: s.title, content: s.content })),
          soutenanceData,
          history: [],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      addSimulationMessage({
        role: 'jury',
        juryRole: data.juryRole || 'Président',
        content: data.reply,
        feedback: data.feedback || undefined,
      })
    } catch (err: any) {
      toast.error("Erreur lors du démarrage : " + (err?.message || 'réessayez.'))
      setSimulationActive(false)
    } finally {
      setLoading(null)
    }
  }

  // ========================================================================
  // Send student answer and get jury reply
  // ========================================================================
  async function handleSend() {
    if (!input.trim() || loading) return
    const studentText = input.trim()
    setInput('')

    addSimulationMessage({ role: 'student', content: studentText })
    setLoading('next')

    try {
      const res = await fetch('/api/ai/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'next',
          project,
          sections: sections.map((s: any) => ({ title: s.title, content: s.content })),
          soutenanceData,
          history: simulationMessages.map((m: any) => ({
            role: m.role,
            juryRole: m.juryRole,
            content: m.content,
            feedback: m.feedback,
          })),
          studentAnswer: studentText,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      addSimulationMessage({
        role: 'jury',
        juryRole: data.juryRole || 'Président',
        content: data.reply,
        feedback: data.feedback || undefined,
      })

      if (data.debriefReady) {
        addSimulationMessage({
          role: 'system',
          content:
            "Le jury a indiqué que la séance touche à sa fin. Vous pouvez continuer ou demander le délibéré final.",
        })
      }
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || 'réessayez.'))
    } finally {
      setLoading(null)
    }
  }

  // ========================================================================
  // Force a role switch (student clicks "Passer au rôle suivant")
  // ========================================================================
  async function handleRoleSwitch(nextRole: JuryRole) {
    if (loading) return
    setLoading('next')
    addSimulationMessage({
      role: 'system',
      content: `Le candidat demande à passer la parole au ${nextRole}.`,
    })

    try {
      const res = await fetch('/api/ai/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'next',
          project,
          sections: sections.map((s: any) => ({ title: s.title, content: s.content })),
          soutenanceData,
          history: simulationMessages.map((m: any) => ({
            role: m.role,
            juryRole: m.juryRole,
            content: m.content,
            feedback: m.feedback,
          })),
          studentAnswer: '(Pas de réponse — passage au rôle suivant)',
          forceRole: nextRole,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      addSimulationMessage({
        role: 'jury',
        juryRole: data.juryRole || nextRole,
        content: data.reply,
        feedback: data.feedback || undefined,
      })
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || 'réessayez.'))
    } finally {
      setLoading(null)
    }
  }

  // ========================================================================
  // Request debrief
  // ========================================================================
  async function handleDebrief() {
    setLoading('debrief')
    addSimulationMessage({
      role: 'system',
      content: 'Fin de la soutenance. Le jury se retire pour délibérer.',
    })

    try {
      const res = await fetch('/api/ai/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'debrief',
          project,
          sections: sections.map((s: any) => ({ title: s.title, content: s.content })),
          soutenanceData,
          history: simulationMessages.map((m: any) => ({
            role: m.role,
            juryRole: m.juryRole,
            content: m.content,
            feedback: m.feedback,
          })),
        }),
      })
      const data = await res.json()
      if (data.error || !data.debrief) throw new Error(data.error || 'Débrief vide')

      setSimulationDebrief(data.debrief)
      addSimulationMessage({
        role: 'system',
        content: `Le jury a rendu son délibéré. Note globale : ${data.debrief.globalScore}/100.`,
      })
    } catch (err: any) {
      toast.error("Erreur lors du délibéré : " + (err?.message || 'réessayez.'))
    } finally {
      setLoading(null)
    }
  }

  // ========================================================================
  // Empty state — no simulation started
  // ========================================================================
  if (!simulationActive && !simulationMessages.length && !simulationDebrief) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => setView('soutenance')}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au kit de soutenance
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Simulation de soutenance</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Le jury IA prend la parole en temps réel. Président, Rapporteur, Directeur et
            Examinateur vous posent des questions à tour de rôle. Vous répondez comme si vous
            étiez en soutenance réelle — à la fin, le jury délibère et vous attribue une note sur
            5 critères.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-3 text-sm">Le jury que vous allez affronter :</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_ROLES.map((role) => (
                  <div
                    key={role}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        ROLE_COLORS[role].avatar
                      )}
                    >
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{role}</p>
                      <p className="text-xs text-muted-foreground">
                        {role === 'Président' && 'Questions transversales, enjeux'}
                        {role === 'Rapporteur' && 'Méthodologie, rigueur scientifique'}
                        {role === 'Directeur' && 'Évolution, choix, apprentissages'}
                        {role === 'Examinateur' && 'Contribution, perspectives'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  La simulation est constructive : le jury s'adapte à votre mémoire et
                  s'arrête avant la 10<sup>e</sup> question pour le délibéré. Vous pouvez forcer
                  un changement de rôle à tout moment.
                </span>
              </p>
            </div>

            <Button
              onClick={handleStart}
              disabled={loading !== null || draftedCount === 0}
              className="w-full iris-gradient text-white rounded-xl h-12"
            >
              {loading === 'start' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Le jury s'installe...
                </>
              ) : draftedCount === 0 ? (
                'Rédigez au moins une section pour commencer'
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Commencer la simulation
                </>
              )}
            </Button>
            {draftedCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Basé sur {draftedCount} section{draftedCount > 1 ? 's' : ''} rédigée{draftedCount > 1 ? 's' : ''}
                {soutenanceData ? ' · kit de soutenance disponible' : ' · aucun kit de soutenance généré'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========================================================================
  // Debrief screen — replaces the chat when debrief is available
  // ========================================================================
  if (simulationDebrief) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Délibéré du jury</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Simulation terminée</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {project.title || 'Mémoire'} · {project.level || 'Master'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('soutenance')} className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" /> Kit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearSimulation()
              }}
              className="rounded-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Recommencer
            </Button>
          </div>
        </div>

        {/* Global score banner */}
        <Card className="border-primary/30 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Note globale
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-primary">
                    {simulationDebrief.globalScore}
                  </span>
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Synthèse du jury</p>
                <p className="text-xs text-muted-foreground">
                  {simulationDebrief.globalScore >= 85
                    ? 'Excellent — le candidat maîtrise son sujet et sait le défendre avec recul.'
                    : simulationDebrief.globalScore >= 70
                    ? 'Très satisfaisant — le candidat a démontré une bonne maîtrise, quelques points à consolider.'
                    : simulationDebrief.globalScore >= 55
                    ? 'Satisfaisant — le candidat a répondu mais doit approfondir plusieurs aspects.'
                    : 'Insuffisant — le candidat doit retravailler son mémoire et sa préparation orale.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Criterion scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {simulationDebrief.criteria.map((c: any, idx: number) => {
            const score = Number(c.score) || 0
            const color =
              score >= 80 ? 'emerald' : score >= 65 ? 'amber' : 'rose'
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{c.criterion}</p>
                      <span
                        className={cn(
                          'text-lg font-bold',
                          color === 'emerald' && 'text-emerald-600',
                          color === 'amber' && 'text-amber-600',
                          color === 'rose' && 'text-rose-600'
                        )}
                      >
                        {score}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                        className={cn(
                          'h-full',
                          color === 'emerald' && 'bg-emerald-500',
                          color === 'amber' && 'bg-amber-500',
                          color === 'rose' && 'bg-rose-500'
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.notes}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Strengths & weaknesses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Points forts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {simulationDebrief.strengths?.map((s: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{s}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-rose-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                Points à améliorer
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {simulationDebrief.weaknesses?.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{w}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recommandations du jury
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {simulationDebrief.recommendations?.map((r: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {i + 1}
                </div>
                <p className="text-sm">{r}</p>
              </motion.div>
            ))}
            <div className="mt-4 pt-4 border-t flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Retournez dans votre mémoire pour renforcer les points faibles identifiés par le
                jury. Vous pouvez relancer une simulation après avoir révisé.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========================================================================
  // Active chat — simulation in progress
  // ========================================================================
  const turnCount = simulationMessages.filter((m: any) => m.role === 'jury').length
  const lastJuryRole = [...simulationMessages].reverse().find((m: any) => m.role === 'jury')?.juryRole
  const canDebrief = turnCount >= 4

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setView('soutenance')}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">Simulation de soutenance</p>
              <p className="text-xs text-muted-foreground truncate">
                Tour {turnCount} · Dernier rôle : {lastJuryRole || '—'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDebrief}
            disabled={loading !== null || !canDebrief}
            className="rounded-full flex-shrink-0"
            title={canDebrief ? 'Terminer et demander le délibéré' : 'Répondez à au moins 4 questions avant de terminer'}
          >
            <Square className="h-3.5 w-3.5 mr-1.5" />
            Terminer
          </Button>
        </div>
      </div>

      {/* Chat scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <AnimatePresence initial={false}>
            {simulationMessages.map((m: any) => {
              if (m.role === 'system') {
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center"
                  >
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 max-w-md text-center">
                      {m.content}
                    </div>
                  </motion.div>
                )
              }

              if (m.role === 'student') {
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  </motion.div>
                )
              }

              // jury message
              const role = m.juryRole as JuryRole
              const colors = ROLE_COLORS[role] || ROLE_COLORS.Président
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      colors.avatar
                    )}
                  >
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={cn('text-[10px]', colors.badge)}>
                        {role}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {m.feedback && (
                      <div className="mb-1.5 text-xs italic text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>{m.feedback}</span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl rounded-tl-md border px-4 py-2.5',
                        colors.bubble
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Loading bubble */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600'
                )}
              >
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
              <div className="bg-muted/40 border border-border rounded-2xl rounded-tl-md px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {loading === 'start' && 'Le jury sinstalle...'}
                  {loading === 'next' && 'Le jury réfléchit...'}
                  {loading === 'debrief' && 'Le jury délibère...'}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Role switcher + input */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2.5">
          {/* Role switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Hand className="h-3 w-3" />
              Passer à :
            </span>
            {ALL_ROLES.filter((r) => r !== lastJuryRole).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSwitch(role)}
                disabled={loading !== null}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full border transition-all flex-shrink-0',
                  'bg-background border-border hover:border-primary/40',
                  ROLE_COLORS[role].badge,
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Répondez au jury... (Entrée pour envoyer, Shift+Entrée pour un saut de ligne)"
                rows={2}
                disabled={loading !== null}
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={loading !== null || !input.trim()}
              size="icon"
              className="rounded-full h-11 w-11 flex-shrink-0 iris-gradient text-white"
              title="Envoyer (Entrée)"
            >
              {loading === 'next' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
