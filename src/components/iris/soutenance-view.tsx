'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Presentation,
  FileText,
  HelpCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Download,
  CheckCircle2,
  Lightbulb,
  Award,
  MessageSquare,
  Filter,
  Users,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'

type JuryRole = 'Président' | 'Rapporteur' | 'Directeur' | 'Examinateur' | string
type Difficulty = 'facile' | 'moyenne' | 'difficile'

const ROLE_COLORS: Record<string, string> = {
  Président: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  Rapporteur: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  Directeur: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  Examinateur: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
}

const ROLE_DEFAULT = 'bg-muted text-muted-foreground border-border'

export function SoutenanceView() {
  const { soutenanceData, setSoutenanceData, project, sections } = useIrisStore()
  const [loading, setLoading] = React.useState(false)
  const [tab, setTab] = React.useState('summary')
  const [roleFilter, setRoleFilter] = React.useState<JuryRole | 'all'>('all')

  const draftedCount = sections.filter((s) => s.content.trim().length > 100).length

  async function generate() {
    setLoading(true)
    try {
      const sectionsData = sections.map((s) => ({ title: s.title, content: s.content }))
      const res = await fetch('/api/ai/soutenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, sections: sectionsData }),
      })
      const data = await res.json()
      if (data.data) {
        setSoutenanceData(data.data)
        toast.success('Kit de soutenance généré avec succès')
      } else {
        toast.error("Avez-vous suffisamment rédigé votre mémoire ?")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  function exportAsMarkdown() {
    if (!soutenanceData) return
    const d = soutenanceData
    const lines: string[] = []
    lines.push(`# Kit de soutenance — ${project.title || 'Mémoire'}`)
    lines.push(`Niveau : ${project.level || 'Master'} · Filière : ${project.filiere || 'non précisée'}`)
    lines.push(`Généré le : ${new Date().toLocaleString('fr-FR')}`)
    lines.push('')
    lines.push('## Résumé académique')
    lines.push('')
    lines.push(d.summary || '')
    lines.push('')
    lines.push('## Plan de présentation')
    lines.push('')
    ;(d.presentationOutline || []).forEach((slide, i) => {
      lines.push(`### Diapo ${i + 1} — ${slide.title}`)
      ;(slide.bullets || []).forEach((b) => lines.push(`- ${b}`))
      lines.push('')
    })
    lines.push('## Questions probables du jury')
    lines.push('')
    ;(d.juryQuestions || []).forEach((q, i) => {
      const role = (q as any).juryRole || 'Jury'
      const diff = q.difficulty || 'moyenne'
      lines.push(`### Q${i + 1} [${role} · ${diff}]`)
      lines.push(`**Q :** ${q.question}`)
      lines.push('')
      lines.push(`**Réponse suggérée :** ${q.suggestedAnswer}`)
      lines.push('')
    })
    lines.push('## Points faibles à renforcer')
    lines.push('')
    ;(d.weakPoints || []).forEach((wp, i) => lines.push(`${i + 1}. ${wp}`))

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soutenance-${(project.title || 'memoire').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Kit exporté en Markdown')
  }

  if (!soutenanceData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl iris-gradient flex items-center justify-center mx-auto mb-4">
            <Presentation className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Préparation à la soutenance</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Quand votre mémoire est prêt, IRIS génère automatiquement : un résumé, un plan de
            présentation, les questions probables du jury (classées par rôle : président,
            rapporteur, directeur, examinateur), et les points faibles à renforcer.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Ce que vous obtiendrez :</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: FileText, label: 'Résumé académique', desc: '250-300 mots structurés' },
                { icon: Presentation, label: 'Plan de présentation', desc: '10-12 diapositives' },
                { icon: HelpCircle, label: 'Questions du jury', desc: 'Classées par rôle (Président, Rapporteur…)' },
                { icon: AlertTriangle, label: 'Points faibles', desc: 'À renforcer avant la soutenance' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={generate}
              disabled={loading || draftedCount === 0}
              className="w-full mt-6 iris-gradient text-white rounded-xl h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {draftedCount === 0
                    ? 'Rédigez au moins une section pour commencer'
                    : 'Générer mon kit de soutenance'}
                </>
              )}
            </Button>
            {draftedCount > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Basé sur {draftedCount} section{draftedCount > 1 ? 's' : ''} rédigée{draftedCount > 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = soutenanceData
  const availableRoles: JuryRole[] = Array.from(
    new Set(
      (data.juryQuestions || [])
        .map((q: any) => q.juryRole as JuryRole)
        .filter(Boolean)
    )
  )
  const filteredQuestions =
    roleFilter === 'all'
      ? data.juryQuestions || []
      : (data.juryQuestions || []).filter((q: any) => q.juryRole === roleFilter)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">Kit généré</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Préparation à la soutenance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.title || 'Mémoire sans titre'} · {project.level || 'Master'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportAsMarkdown}
            className="rounded-full"
            title="Télécharger le kit complet en Markdown"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" onClick={generate} disabled={loading} className="rounded-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Régénérer
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="summary" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1.5" />
            Résumé
          </TabsTrigger>
          <TabsTrigger value="slides" className="text-xs sm:text-sm">
            <Presentation className="h-4 w-4 mr-1.5" />
            Plan PPT
          </TabsTrigger>
          <TabsTrigger value="questions" className="text-xs sm:text-sm">
            <HelpCircle className="h-4 w-4 mr-1.5" />
            Jury
          </TabsTrigger>
          <TabsTrigger value="weak" className="text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Points faibles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Résumé académique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.summary}</p>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(data.summary)
                    toast.success('Résumé copié')
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Copier
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slides">
          <div className="space-y-3">
            {data.presentationOutline?.map((slide, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg iris-gradient text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2">{slide.title}</h3>
                        <ul className="space-y-1">
                          {slide.bullets?.map((b, bidx) => (
                            <li key={bidx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="questions">
          {/* Role filter chips */}
          {availableRoles.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Filtrer par rôle :
              </span>
              <button
                onClick={() => setRoleFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  roleFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/40'
                }`}
              >
                Toutes
              </button>
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    roleFilter === role
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/40'
                  }`}
                >
                  <Users className="h-3 w-3 inline mr-1" />
                  {role}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filteredQuestions.map((q, idx) => {
              const role = (q as any).juryRole
              const roleClass = role ? ROLE_COLORS[role] || ROLE_DEFAULT : ROLE_DEFAULT
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-muted-foreground">
                              Question {idx + 1}
                            </span>
                            {role && (
                              <Badge variant="outline" className={`text-[10px] ${roleClass}`}>
                                {role}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                q.difficulty === 'facile'
                                  ? 'text-emerald-600 border-emerald-500/30'
                                  : q.difficulty === 'difficile'
                                  ? 'text-red-500 border-red-500/30'
                                  : 'text-amber-600 border-amber-500/30'
                              }
                            >
                              {q.difficulty}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm">{q.question}</p>
                        </div>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-3 border border-border">
                        <p className="text-xs font-semibold text-primary mb-1">Réponse suggérée :</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{q.suggestedAnswer}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
            {filteredQuestions.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Aucune question pour ce rôle. Essayez un autre filtre.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="weak">
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Points faibles à renforcer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.weakPoints?.map((wp, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-sm">{wp}</p>
                </motion.div>
              ))}
              <div className="mt-4 pt-4 border-t flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Retournez dans votre mémoire et demandez à IRIS de vous aider à renforcer ces points.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Simulation de soutenance</h3>
            <p className="text-sm text-muted-foreground">
              Entraînez-vous avec un jury IA qui posera des questions en temps réel.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => toast.info("Simulation disponible bientôt. Utilisez les questions ci-dessus pour vous préparer.")}
          >
            Bientôt disponible
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
