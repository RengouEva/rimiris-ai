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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function CoherenceView() {
  const { coherenceIssues, lastCoherenceCheck, setCoherenceIssues, project, sections, setActiveSection, setView } =
    useIrisStore()
  const [loading, setLoading] = React.useState(false)

  async function runCheck() {
    setLoading(true)
    try {
      const sectionsData = sections.map((s) => ({ title: s.title, content: s.content }))
      const res = await fetch('/api/ai/coherence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, sections: sectionsData }),
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-primary">Contrôle qualité</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Cohérence globale</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
            Rimiris vérifie que toutes vos sections s'enchaînent logiquement et qu'il n'y a pas de
            contradiction entre vos objectifs, votre méthodologie et vos conclusions.
          </p>
        </div>
        <Button
          onClick={runCheck}
          disabled={loading || sections.filter((s) => s.content.trim().length > 100).length === 0}
          className="rounded-full iris-gradient text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Vérifier
            </>
          )}
        </Button>
      </div>

      {sections.filter((s) => s.content.trim().length > 100).length === 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-amber-700 dark:text-amber-300">
            Rédigez au moins une section (plus de 100 mots) avant de lancer la vérification.
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {lastCoherenceCheck && (
        <p className="text-xs text-muted-foreground text-center">
          Dernière vérification : {new Date(lastCoherenceCheck).toLocaleString('fr-FR')}
        </p>
      )}

      {coherenceIssues.length === 0 ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Tout est cohérent !</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {lastCoherenceCheck
                ? "Aucune incohérence détectée. Continuez votre rédaction en toute confiance."
                : "Lancez la vérification pour analyser la cohérence de votre mémoire."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coherenceIssues.map((issue, idx) => (
            <IssueCard
              key={issue.id || idx}
              issue={issue}
              onGoToSection={() => {
                const target = sections.find(
                  (s) => s.title.toLowerCase() === issue.sectionTitle.toLowerCase()
                )
                if (target) {
                  setActiveSection(target.id)
                  setView('workspace')
                }
              }}
            />
          ))}
        </div>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ce que Rimiris vérifie
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            "Le titre reflète le contenu global",
            "Une problématique claire est identifiable",
            "Les objectifs sont alignés avec la problématique",
            "La méthodologie permet de répondre aux questions",
            "Les résultats répondent aux questions posées",
            "La conclusion apporte une réponse explicite",
            "Aucune contradiction entre sections",
            "Progression logique d'une section à l'autre",
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
  onGoToSection,
}: {
  issue: CoherenceIssue
  onGoToSection: () => void
}) {
  const config = {
    high: { color: 'red', label: 'Grave', border: 'border-red-500/30 bg-red-500/5' },
    medium: { color: 'amber', label: 'Modéré', border: 'border-amber-500/30 bg-amber-500/5' },
    low: { color: 'blue', label: 'Mineur', border: 'border-blue-500/30 bg-blue-500/5' },
  }
  const c = config[issue.severity]

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
          {issue.sectionTitle && issue.sectionTitle !== 'global' && (
            <Badge variant="secondary" className="text-xs">
              {issue.sectionTitle}
            </Badge>
          )}
        </div>
        {issue.sectionTitle && issue.sectionTitle !== 'global' && (
          <Button size="sm" variant="ghost" onClick={onGoToSection} className="text-xs">
            Aller à la section
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
