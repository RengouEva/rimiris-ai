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
  Users,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { AGENTS } from '@/lib/iris/agents'
import { CHAPTERS } from '@/lib/iris/chapters'
import { Card, CardContent } from '@/components/ui/card'
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

const CHAPTERS_MAP: Record<string, string> = Object.fromEntries(
  CHAPTERS.map((c) => [c.id, c.shortTitle])
)

export function AgentsView() {
  const { sections, setView, setActiveSection, setAIPanel } = useIrisStore()

  // An agent is "active" if at least one section uses its templateRef
  const agentActivity = React.useMemo(() => {
    const map: Record<string, boolean> = {}
    AGENTS.forEach((a) => {
      map[a.id] = sections.some((s) => {
        if (!s.templateRef) return false
        const chapter = CHAPTERS.find((c) => c.id === s.templateRef)
        return chapter && chapter.agent === a.id && (s.status === 'in_progress' || s.status === 'draft')
      })
    })
    return map
  }, [sections])

  function selectAgent(agentId: string) {
    // Find a section that uses this agent
    const agent = AGENTS.find((a) => a.id === agentId)
    if (!agent) return
    const matchingSection = sections.find((s) => {
      if (!s.templateRef) return agentId === 'directeur'
      const chapter = CHAPTERS.find((c) => c.id === s.templateRef)
      return chapter && chapter.agent === agentId
    })
    if (matchingSection) {
      setActiveSection(matchingSection.id)
      setView('workspace')
      setAIPanel(true)
    } else {
      // No matching section, go to workspace and open AI panel
      setView('workspace')
      setAIPanel(true)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Équipe IA</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">10 agents IA à votre service</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Rimiris choisit automatiquement le bon agent selon votre section. Vous pouvez aussi
          solliciter un agent spécifique via le panneau IA.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map((agent, idx) => {
          const Icon = ICON_MAP[agent.icon] || Bot
          const active = agentActivity[agent.id]

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className="h-full hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => selectAgent(agent.id)}
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
                      <span className="text-xs text-muted-foreground">Spécialiste :</span>
                      {agent.triggerChapters.slice(0, 3).map((cid) => (
                        <span
                          key={cid}
                          className="text-xs px-1.5 py-0.5 rounded bg-muted text-foreground"
                        >
                          {CHAPTERS_MAP[cid] || cid}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Disponible sur demande
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-5 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Comment ça marche ?</p>
            <p className="text-muted-foreground">
              Quand vous écrivez dans une section importée du template académique, Rimiris active
              automatiquement l'agent correspondant (méthodologie, bibliographie, etc.). Pour les
              sections que vous créez librement, c'est Pr. Rimiris (directeur de mémoire) qui vous
              accompagne par défaut.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap — coming soon */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold">Sur la roadmap</h2>
          <Badge variant="outline" className="text-xs text-muted-foreground">Bientôt</Badge>
        </div>
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold">Mode collaboratif directeur ↔ étudiant</h3>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    En conception
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Partagez votre projet Rimiris avec votre véritable directeur de mémoire. Il pourra
                  laisser des annotations paragraphe par paragraphe, valider ou invalider les
                  phases du workflow, et co-rédiger les commentaires méthodologiques.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              {[
                { title: 'Lien de partage', desc: 'Générez un lien sécurisé à envoyer à votre directeur' },
                { title: 'Annotations in-line', desc: 'Commentaires paragraphe par paragraphe, comme Google Docs' },
                { title: 'Validation des phases', desc: 'Le directeur valide ou demande des révisions sur chaque phase' },
              ].map((item) => (
                <div key={item.title} className="p-2.5 rounded-lg border border-border bg-background">
                  <p className="text-xs font-medium mb-0.5">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Cette fonctionnalité nécessite une synchronisation cloud (backend temps réel). Elle
              sera déployée dans une prochaine version de Rimiris AI.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
