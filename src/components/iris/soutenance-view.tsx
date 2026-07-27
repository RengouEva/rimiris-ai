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
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function SoutenanceView() {
  const { soutenanceData, setSoutenanceData, project, chapters } = useIrisStore()
  const [loading, setLoading] = React.useState(false)
  const [tab, setTab] = React.useState('summary')

  async function generate() {
    setLoading(true)
    try {
      const chaptersData: Record<string, { content: string }> = {}
      Object.entries(chapters).forEach(([id, c]) => {
        chaptersData[id] = { content: c.content }
      })

      const res = await fetch('/api/ai/soutenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, chapters: chaptersData }),
      })
      const data = await res.json()
      if (data.data) {
        setSoutenanceData(data.data)
        toast.success('Kit de soutenance généré avec succès')
      } else {
        toast.error("Erreur lors de la génération. Avez-vous suffisamment rédigé votre mémoire ?")
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
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
            Quand votre mémoire est prêt, IRIS génère automatiquement : un résumé structuré, un plan
            de présentation PowerPoint, les questions probables du jury avec réponses suggérées, et
            les points faibles à renforcer.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Ce que vous obtiendrez :</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: FileText, label: 'Résumé académique', desc: '250-300 mots structurés' },
                { icon: Presentation, label: 'Plan de présentation', desc: '10-12 diapositives' },
                { icon: HelpCircle, label: 'Questions du jury', desc: '8-10 questions anticipées' },
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
              disabled={loading}
              className="w-full mt-6 iris-gradient text-white rounded-xl h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération du kit de soutenance...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer mon kit de soutenance
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Pour un résultat optimal, ayez rédigé au moins quelques chapitres clés (problématique,
              méthodologie, résultats, conclusion).
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = soutenanceData

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
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
        <Button
          variant="outline"
          onClick={generate}
          disabled={loading}
          className="rounded-full"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Régénérer
        </Button>
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

        {/* Summary */}
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

        {/* Slides */}
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

        {/* Jury questions */}
        <TabsContent value="questions">
          <div className="space-y-3">
            {data.juryQuestions?.map((q, idx) => (
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Question {idx + 1}
                          </span>
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
            ))}
          </div>
        </TabsContent>

        {/* Weak points */}
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
                  Pour chaque point faible, retournez dans le chapitre concerné et demandez à l'agent
                  IRIS de vous aider à le renforcer avant la soutenance.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Simulation banner */}
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
