'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Loader2,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  Copy,
  FileText,
  Layers,
  Quote,
  ArrowLeft,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SEVERITY_STYLES = {
  high: {
    badge: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    cardBorder: 'border-rose-500/20',
  },
  medium: {
    badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    cardBorder: 'border-amber-500/20',
  },
  low: {
    badge: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    icon: Info,
    iconColor: 'text-blue-500',
    cardBorder: 'border-blue-500/20',
  },
}

const TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  internal_redundancy: { label: 'Redondance interne', icon: Layers },
  boilerplate: { label: 'Formulation passe-partout', icon: Copy },
  short_section: { label: 'Section courte', icon: FileText },
  unsupported_claim: { label: 'Affirmation non sourcée', icon: Quote },
}

export function PlagiarismView() {
  const {
    project,
    sections,
    plagiarismReport,
    setPlagiarismReport,
    setView,
  } = useIrisStore() as any

  const [loading, setLoading] = React.useState(false)

  const draftedCount = sections.filter((s: any) => s.content.trim().length > 50).length

  async function runCheck() {
    if (draftedCount === 0) {
      toast.error("Rédigez au moins une section avant de lancer la vérification.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/plagiarism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          sections: sections.map((s: any) => ({ title: s.title, content: s.content })),
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPlagiarismReport(data.report)
      toast.success(`${data.report.flags.length} signalement(s) — similarité interne ${data.report.globalSimilarity}%`)
    } catch (err: any) {
      toast.error("Erreur lors de la vérification : " + (err?.message || 'réessayez.'))
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // Empty state — no report yet
  // ============================================================
  if (!plagiarismReport && !loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => setView('workspace')}
          className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au mémoire
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Vérification anti-plagiat</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Avant l'audit final, IRIS scanne votre mémoire pour détecter les redondances internes,
            les formulations passe-partout, les sections sous-développées et les affirmations non
            sourcées. <strong>Cette vérification est interne</strong> — elle ne remplace pas un
            outil comme Turnitin, mais elle vous aide à retravailler les zones à risque.
          </p>
        </div>

        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-3 text-sm">Ce qui est vérifié :</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Layers, label: 'Redondance interne', desc: 'Deux sections qui se répètent (similarité Jaccard sur shingles de mots)' },
                  { icon: Copy, label: 'Formules passe-partout', desc: '"De nos jours", "il convient de noter que", etc.' },
                  { icon: FileText, label: 'Sections courtes', desc: 'Sections de moins de 80 mots — probablement sous-développées' },
                  { icon: Quote, label: 'Affirmations non sourcées', desc: '"De nombreuses études montrent que…" — sans référence' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Cette vérification est <strong>locale</strong> et basée sur des règles + IA. Elle
                  ne détecte pas le plagiat externe (copié-collé depuis Internet). Pour une
                  soumission officielle, utilisez Turnitin ou un équivalent agréé par votre
                  université.
                </span>
              </p>
            </div>

            <Button
              onClick={runCheck}
              disabled={loading || draftedCount === 0}
              className="w-full iris-gradient text-white rounded-xl h-12"
            >
              {draftedCount === 0 ? (
                'Rédigez au moins une section pour commencer'
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Lancer la vérification
                </>
              )}
            </Button>
            {draftedCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Vérification sur {draftedCount} section{draftedCount > 1 ? 's' : ''} rédigée{draftedCount > 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================
  // Loading state
  // ============================================================
  if (loading && !plagiarismReport) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Vérification en cours…</h1>
          <p className="text-muted-foreground">
            IRIS analyse vos sections (règles + IA) — cela peut prendre 20 à 40 secondes.
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // Report view
  // ============================================================
  const report = plagiarismReport
  const highCount = report.flags.filter((f: any) => f.severity === 'high').length
  const mediumCount = report.flags.filter((f: any) => f.severity === 'medium').length
  const lowCount = report.flags.filter((f: any) => f.severity === 'low').length

  // Group flags by type for the summary
  const byType = report.flags.reduce((acc: any, f: any) => {
    acc[f.type] = (acc[f.type] || 0) + 1
    return acc
  }, {})

  const globalColor =
    report.globalSimilarity >= 30
      ? 'rose'
      : report.globalSimilarity >= 15
      ? 'amber'
      : 'emerald'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Rapport anti-plagiat</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Vérification interne</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {project.title || 'Mémoire'} · {report.sectionsChecked} section{report.sectionsChecked > 1 ? 's' : ''} vérifiée{report.sectionsChecked > 1 ? 's' : ''}
            {' · '}Généré le {new Date(report.checkedAt).toLocaleString('fr-FR')}
          </p>
        </div>
        <Button variant="outline" onClick={runCheck} disabled={loading} className="rounded-full">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Revérifier
        </Button>
      </div>

      {/* Global similarity banner */}
      <Card className={cn('border-2', globalColor === 'rose' ? 'border-rose-500/30' : globalColor === 'amber' ? 'border-amber-500/30' : 'border-emerald-500/30')}>
        <CardContent className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Similarité interne
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-5xl font-bold',
                    globalColor === 'rose' && 'text-rose-600',
                    globalColor === 'amber' && 'text-amber-600',
                    globalColor === 'emerald' && 'text-emerald-600'
                  )}
                >
                  {report.globalSimilarity}
                </span>
                <span className="text-xl text-muted-foreground">%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Synthèse</p>
              <p className="text-xs text-muted-foreground mb-3">
                {report.globalSimilarity >= 30
                  ? 'Similarité élevée — des sections se recoupent trop. Travaillez les redondances avant l\'audit.'
                  : report.globalSimilarity >= 15
                  ? 'Similarité modérée — quelques recoupements à surveiller, mais le texte est globalement distinct.'
                  : 'Similarité faible — vos sections sont bien différenciées les unes des autres.'}
              </p>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {highCount > 0 && (
                  <Badge variant="outline" className="bg-rose-500/15 text-rose-600 border-rose-500/30">
                    {highCount} élevée{highCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {mediumCount > 0 && (
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30">
                    {mediumCount} moyenne{mediumCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {lowCount > 0 && (
                  <Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30">
                    {lowCount} faible{lowCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {report.flags.length === 0 && (
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                    Aucun signalement
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type breakdown */}
      {Object.keys(byType).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(TYPE_LABELS).map(([type, { label, icon: Icon }]) => {
            const count = byType[type] || 0
            return (
              <Card key={type} className={cn(count === 0 && 'opacity-40')}>
                <CardContent className="p-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1">
                      {label}
                    </p>
                    <p className="text-lg font-bold leading-none">{count}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Flags list */}
      {report.flags.length === 0 ? (
        <Card className="border-emerald-500/30">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Aucun signalement</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Votre mémoire ne présente pas de redondance interne notable, ni de formulations
              passe-partout détectées, ni de sections excessivement courtes. Vous pouvez passer à
              l'audit final en toute confiance.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => setView('audit')}
            >
              Aller à l'audit final
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {report.flags.map((flag: any, idx: number) => {
              const style = SEVERITY_STYLES[flag.severity as keyof typeof SEVERITY_STYLES]
              const typeInfo = TYPE_LABELS[flag.type]
              const Icon = style.icon
              const TypeIcon = typeInfo?.icon
              return (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className={cn(style.cardBorder)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted',
                            style.iconColor
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge variant="outline" className={cn('text-[10px]', style.badge)}>
                              {flag.severity}
                            </Badge>
                            {TypeIcon && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {typeInfo.label}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {flag.sectionA}
                              {flag.sectionB && ` ↔ ${flag.sectionB}`}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{flag.message}</p>
                        </div>
                      </div>

                      {flag.excerpt && (
                        <div className="ml-11 mb-2 p-2.5 rounded-lg bg-muted/40 border border-border">
                          <p className="text-xs italic text-muted-foreground leading-relaxed">
                            {flag.excerpt}
                          </p>
                        </div>
                      )}

                      <div className="ml-11 flex items-start gap-1.5 text-xs">
                        <TrendingDown className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
                        <p className="text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground">Recommandation : </span>
                          {flag.suggestion}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Info className="h-4 w-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1 min-w-0">
            Cette vérification est <strong>interne</strong> (règles + IA). Pour une soumission
            officielle, complétez par un scan Turnitin ou équivalent.
          </p>
          <Button size="sm" variant="outline" onClick={() => setView('audit')} className="rounded-full">
            Continuer vers l'audit
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
