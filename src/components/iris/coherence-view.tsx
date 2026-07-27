'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useIrisStore, type CoherenceIssue } from '@/store/iris-store'
import { CHAPTERS } from '@/lib/iris/chapters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function CoherenceView() {
  const { coherenceIssues, lastCoherenceCheck, setCoherenceIssues, project, chapters, setActiveChapter } =
    useIrisStore()
  const [loading, setLoading] = React.useState(false)

  async function runCheck() {
    setLoading(true)
    try {
      const chaptersData: Record<string, { content: string; status: string }> = {}
      Object.entries(chapters).forEach(([id, c]) => {
        chaptersData[id] = { content: c.content, status: c.status }
      })

      const res = await fetch('/api/ai/coherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, chapters: chaptersData }),
      })
      const data = await res.json()
      setCoherenceIssues(data.issues || [])
      toast.success('Vérification de cohérence terminée')
    } catch {
      toast.error('Erreur lors de la vérification')
    } finally {
      setLoading(false)
    }
  }

  const highCount = coherenceIssues.filter((i) => i.severity === 'high').length
  const mediumCount = coherenceIssues.filter((i) => i.severity === 'medium').length
  const lowCount = coherenceIssues.filter((i) => i.severity === 'low').length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-primary">Contrôle qualité</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cohérence globale</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            IRIS vérifie que votre titre, problématique, objectifs, hypothèses, méthodologie,
            résultats et conclusion sont parfaitement alignés.
          </p>
        </div>
        <Button
          onClick={runCheck}
          disabled={loading}
          className="rounded-full iris-gradient text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Lancer la vérification
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Grave</p>
              <p className="text-2xl font-bold text-red-500">{highCount}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-500/40" />
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Modéré</p>
              <p className="text-2xl font-bold text-amber-500">{mediumCount}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-500/40" />
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Mineur</p>
              <p className="text-2xl font-bold text-blue-500">{lowCount}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-blue-500/40" />
          </CardContent>
        </Card>
      </div>

      {/* Last check */}
      {lastCoherenceCheck && (
        <p className="text-xs text-muted-foreground text-center">
          Dernière vérification : {new Date(lastCoherenceCheck).toLocaleString('fr-FR')}
        </p>
      )}

      {/* Issues list */}
      {coherenceIssues.length === 0 ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Tout est cohérent !</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {lastCoherenceCheck
                ? "Aucune incohérence détectée lors de la dernière analyse. Continuez votre rédaction en toute confiance."
                : "Lancez la vérification pour analyser la cohérence de votre mémoire."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coherenceIssues.map((issue, idx) => (
            <IssueCard key={issue.id || idx} issue={issue} onGoToChapter={setActiveChapter} />
          ))}
        </div>
      )}

      {/* Coherence checklist info */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ce que IRIS vérifie
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            "Le titre reflète la problématique",
            "La problématique est cohérente avec les questions de recherche",
            "Les objectifs sont alignés avec la problématique",
            "Les hypothèses répondent aux questions",
            "La méthodologie permet de tester les hypothèses",
            "Les résultats répondent aux questions de recherche",
            "La conclusion apporte une réponse explicite",
            "Aucune contradiction interne entre chapitres",
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function IssueCard({
  issue,
  onGoToChapter,
}: {
  issue: CoherenceIssue
  onGoToChapter: (id: string) => void
}) {
  const config = {
    high: { color: 'red', label: 'Grave', border: 'border-red-500/30 bg-red-500/5' },
    medium: { color: 'amber', label: 'Modéré', border: 'border-amber-500/30 bg-amber-500/5' },
    low: { color: 'blue', label: 'Mineur', border: 'border-blue-500/30 bg-blue-500/5' },
  }
  const c = config[issue.severity]
  const chapterDef = CHAPTERS.find((ch) => ch.id === issue.chapter)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border p-4', c.border)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              'border-current',
              c.color === 'red' && 'text-red-500',
              c.color === 'amber' && 'text-amber-500',
              c.color === 'blue' && 'text-blue-500'
            )}
          >
            {c.label}
          </Badge>
          {chapterDef && (
            <Badge variant="secondary" className="text-xs">
              {chapterDef.shortTitle}
            </Badge>
          )}
        </div>
        {chapterDef && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onGoToChapter(chapterDef.id)}
            className="text-xs"
          >
            Aller au chapitre
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      <p className="text-sm font-medium mb-2">{issue.message}</p>
      <div className="text-xs text-muted-foreground bg-background/60 rounded-lg p-2 border border-border">
        <span className="font-semibold text-foreground">Suggestion : </span>
        {issue.suggestion}
      </div>
    </motion.div>
  )
}
