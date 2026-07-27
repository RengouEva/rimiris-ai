'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react'
import { useIrisStore, type AuditScore, type AuditReport, htmlToPlainText } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DIMENSION_COLORS: Record<string, string> = {
  'Cohérence scientifique': 'text-red-500 bg-red-500/10 border-red-500/30',
  'Structure': 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  'Style académique': 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  'Bibliographie': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  'Transitions': 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-500'
  if (score >= 75) return 'text-amber-500'
  if (score >= 60) return 'text-orange-500'
  return 'text-red-500'
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Bon'
  if (score >= 60) return 'Acceptable'
  return 'À retravailler'
}

export function AuditView() {
  const { project, sections, auditReport, setAuditReport } = useIrisStore()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [scientificIssues, setScientificIssues] = React.useState<any[]>([])

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const canAudit = sections.filter((s) => s.content && s.content.trim()).length > 0

  async function runAudit() {
    setLoading(true)
    setError(null)
    setScientificIssues([])
    try {
      // 1. Scientific check (Phase 6)
      const sciRes = await fetch('/api/ai/scientific-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { title: project.title, level: project.level, filiere: project.filiere },
          sections: sections
            .filter((s) => s.content && s.content.trim())
            .map((s) => ({ title: s.title, content: htmlToPlainText(s.content) })),
        }),
      })
      const sciData = await sciRes.json()
      setScientificIssues(sciData.issues || [])

      // 2. Audit (Phase 7)
      const auditRes = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: { title: project.title, level: project.level, filiere: project.filiere, norme: project.norme },
          sections: sections
            .filter((s) => s.content && s.content.trim())
            .map((s) => ({ title: s.title, content: htmlToPlainText(s.content) })),
        }),
      })
      const auditData = await auditRes.json()
      const report: AuditReport = {
        scores: auditData.scores || [],
        globalScore: auditData.globalScore || 0,
        generatedAt: auditData.generatedAt || Date.now(),
      }
      setAuditReport(report)
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!auditReport && canAudit) {
      runAudit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!canAudit) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Aucun contenu à auditer</h2>
          <p className="text-sm text-muted-foreground">
            Rédigez au moins une section de votre mémoire pour lancer l'audit final.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Phase 7 · Audit final
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Audit global de votre mémoire</h1>
        <p className="text-sm text-muted-foreground">
          Le Contrôleur qualité analyse l'ensemble du mémoire et produit un rapport avec scores par
          dimension + améliorations précises.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground italic">
            L'audit analyse vos {sections.filter((s) => s.content).length} sections, vérifie la
            cohérence scientifique et calcule les scores...
          </p>
          <p className="text-xs text-muted-foreground">Peut prendre 1-2 minutes.</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2 mb-6">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={runAudit}>
            Réessayer
          </Button>
        </div>
      )}

      {!loading && auditReport && (
        <>
          {/* Global score */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-border bg-card p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(auditReport.globalScore / 100) * 264} 264`}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-3xl font-bold', scoreColor(auditReport.globalScore))}>
                    {auditReport.globalScore}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    / 100
                  </span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Score global
                </p>
                <h2 className="text-2xl font-bold mb-1">
                  {scoreLabel(auditReport.globalScore)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {totalWords} mots rédigés · {sections.filter((s) => s.content).length} sections auditées
                </p>
                <Button
                  onClick={runAudit}
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-full"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Relancer l'audit
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Per-dimension scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {auditReport.scores.map((s: AuditScore, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center border',
                        DIMENSION_COLORS[s.dimension] || 'text-muted-foreground bg-muted border-border'
                      )}
                    >
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="font-semibold text-sm">{s.dimension}</span>
                  </div>
                  <span className={cn('text-2xl font-bold', scoreColor(s.score))}>{s.score}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{s.notes}</p>
                {s.improvements && s.improvements.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Améliorations suggérées
                    </p>
                    {s.improvements.map((imp, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs">
                        <Lightbulb className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Scientific issues (Phase 6) */}
          {scientificIssues.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-sm">
                  Problèmes de cohérence scientifique ({scientificIssues.length})
                </h3>
              </div>
              <div className="space-y-2">
                {scientificIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-lg border p-3',
                      issue.severity === 'high'
                        ? 'border-red-500/40 bg-red-500/5'
                        : issue.severity === 'medium'
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border bg-muted/20'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          issue.severity === 'high'
                            ? 'border-red-500/40 text-red-600'
                            : issue.severity === 'medium'
                            ? 'border-amber-500/40 text-amber-600'
                            : 'border-border text-muted-foreground'
                        )}
                      >
                        {issue.severity === 'high' ? 'Bloquant' : issue.severity === 'medium' ? 'Faiblesse' : 'Amélioration'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {issue.chain}
                      </Badge>
                      <span className="text-xs font-medium">{issue.sectionTitle}</span>
                    </div>
                    <p className="text-xs text-foreground mb-1.5">{issue.message}</p>
                    <p className="text-[11px] text-muted-foreground italic">
                      <strong>Suggestion :</strong> {issue.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scientificIssues.length === 0 && !loading && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Aucun problème de cohérence scientifique détecté</p>
                <p className="text-xs text-muted-foreground">
                  Les chaînes objectifs ↔ problématique ↔ hypothèses ↔ méthodologie ↔ résultats ↔ conclusion
                  sont cohérentes.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !auditReport && !error && (
        <div className="text-center py-8">
          <Button onClick={runAudit} size="lg" className="rounded-full iris-gradient text-white">
            <ClipboardCheck className="h-4 w-4 mr-1.5" />
            Lancer l'audit
          </Button>
        </div>
      )}
    </div>
  )
}
