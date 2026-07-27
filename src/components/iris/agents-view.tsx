'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  FlaskConical,
  PenLine,
  Library,
  Quote,
  Calculator,
  SpellCheck,
  FileText,
  Presentation,
  ShieldCheck,
  Bot,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { AGENTS } from '@/lib/iris/agents'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, any> = {
  GraduationCap,
  FlaskConical,
  PenLine,
  Library,
  Quote,
  Calculator,
  SpellCheck,
  FileText,
  Presentation,
  ShieldCheck,
  Bot,
}

const COLOR_MAP: Record<string, string> = {
  violet: 'from-violet-500 to-purple-600',
  cyan: 'from-cyan-500 to-blue-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
  rose: 'from-rose-500 to-pink-600',
  blue: 'from-blue-500 to-indigo-600',
  teal: 'from-teal-500 to-cyan-600',
  orange: 'from-orange-500 to-amber-600',
  fuchsia: 'from-fuchsia-500 to-purple-600',
  red: 'from-red-500 to-rose-600',
}

export function AgentsView() {
  const { chapters, setActiveChapter, activeAgentId, setActiveAgent } = useIrisStore()

  const agentActivity = React.useMemo(() => {
    const map: Record<string, boolean> = {}
    AGENTS.forEach((a) => {
      map[a.id] = a.triggerChapters.some((cid) => {
        const c = chapters[cid]
        return c && (c.status === 'in_progress' || c.status === 'draft')
      })
    })
    return map
  }, [chapters])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Équipe IA</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Vos 10 agents spécialisés</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Chaque agent a une expertise propre et intervient au moment pertinent. Ils travaillent en
          coordination sous la supervision du directeur de mémoire virtuel.
        </p>
      </div>

      {/* Agents grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map((agent, idx) => {
          const Icon = ICON_MAP[agent.icon] || Bot
          const active = agentActivity[agent.id]
          const selected = activeAgentId === agent.id

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={cn(
                  'h-full hover:border-primary/40 transition-all cursor-pointer group',
                  selected && 'border-primary iris-glow',
                  active && 'border-emerald-500/30'
                )}
                onClick={() => setActiveAgent(selected ? null : agent.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        'w-11 h-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center',
                        COLOR_MAP[agent.color] || 'from-violet-500 to-purple-600'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {active && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 pulse-glow" />
                        Actif
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-base mb-0.5">{agent.name}</h3>
                  <p className="text-xs text-primary font-medium mb-2">{agent.role}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {agent.specialty}
                  </p>

                  {agent.triggerChapters.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">Intervient sur :</span>
                      {agent.triggerChapters.slice(0, 2).map((cid) => {
                        const ch = CHAPTERS_MAP[cid]
                        return ch ? (
                          <span
                            key={cid}
                            className="text-xs px-1.5 py-0.5 rounded bg-muted text-foreground"
                          >
                            {ch}
                          </span>
                        ) : null
                      })}
                      {agent.triggerChapters.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{agent.triggerChapters.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Disponible sur demande
                    </p>
                  )}

                  {selected && (
                    <Button
                      size="sm"
                      className="w-full mt-3 iris-gradient text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (agent.triggerChapters[0]) {
                          setActiveChapter(agent.triggerChapters[0])
                        }
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Travailler avec cet agent
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Info banner */}
      <Card className="bg-muted/30">
        <CardContent className="p-5 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Comment ça marche ?</p>
            <p className="text-muted-foreground">
              Lorsque vous travaillez sur un chapitre, IRIS active automatiquement l'agent le plus
              pertinent. Vous pouvez aussi solliciter un autre agent via le mode « Je suis bloqué »
              pour obtenir une expertise spécifique (méthodologie, statistiques, citations, etc.).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const CHAPTERS_MAP: Record<string, string> = {
  sujet: 'Sujet',
  introduction: 'Introduction',
  contexte: 'Contexte',
  problematique: 'Problématique',
  questions: 'Questions',
  objectifs: 'Objectifs',
  hypotheses: 'Hypothèses',
  justification: 'Justification',
  literature: 'Littérature',
  cadre: 'Cadre théorique',
  methodologie: 'Méthodologie',
  resultats: 'Résultats',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  recommandations: 'Recommandations',
}
