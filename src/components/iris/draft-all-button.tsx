'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  FileText,
} from 'lucide-react'
import { useIrisStore, plainTextToHtml } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// DraftAllButton — triggers the "IRIS rédige toutes les sections vides" orchestrator.
// Shows a progress modal while the API generates drafts sequentially, then
// inserts each draft into its corresponding section.
// ============================================================================

interface ProgressState {
  open: boolean
  status: 'idle' | 'generating' | 'done' | 'error'
  current: number
  total: number
  currentTitle: string
  results: { sectionId: string; title: string; wordCount: number; error?: string }[]
  totalWords: number
}

const initialState: ProgressState = {
  open: false,
  status: 'idle',
  current: 0,
  total: 0,
  currentTitle: '',
  results: [],
  totalWords: 0,
}

export function DraftAllButton({ compact = false }: { compact?: boolean }) {
  const {
    project,
    sections,
    themeUnderstanding,
    problemContext,
    updateSectionContent,
    setSectionStatus,
    setActiveSection,
  } = useIrisStore()

  const [progress, setProgress] = React.useState<ProgressState>(initialState)
  const abortRef = React.useRef(false)

  // Filter empty sections (less than 50 chars of content = essentially empty)
  const emptySections = sections.filter(
    (s) => !s.content || s.content.replace(/<[^>]+>/g, '').trim().length < 50
  )

  async function handleGenerateAll() {
    if (emptySections.length === 0) {
      toast.info('Toutes vos sections ont déjà du contenu.')
      return
    }

    if (
      !themeUnderstanding?.validated ||
      !problemContext?.selected
    ) {
      toast.error(
        'Vous devez valider la Phase 1 (compréhension du thème) et la Phase 2 (problématique) avant de générer toutes les sections.'
      )
      return
    }

    abortRef.current = false
    setProgress({
      open: true,
      status: 'generating',
      current: 0,
      total: emptySections.length,
      currentTitle: emptySections[0]?.title || '',
      results: [],
      totalWords: 0,
    })

    try {
      const res = await fetch('/api/ai/draft-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          themeUnderstanding,
          problemContext,
          sections: sections.map((s) => ({ id: s.id, title: s.title, content: s.content })),
          mode: 'all_empty',
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Erreur ${res.status}`)
      }

      const data = await res.json()

      // Insert each draft into its section
      let totalWords = 0
      const results: ProgressState['results'] = []
      let firstInsertedId: string | null = null

      for (const draft of data.drafts || []) {
        if (abortRef.current) break

        if (draft.error || !draft.html) {
          results.push({
            sectionId: draft.sectionId,
            title: draft.title,
            wordCount: 0,
            error: draft.error || 'Brouillon vide',
          })
          continue
        }

        // Convert the AI's HTML to plain HTML for the editor if needed
        const html = plainTextToHtml(draft.html)
        updateSectionContent(draft.sectionId, html)
        setSectionStatus(draft.sectionId, 'draft')
        totalWords += draft.wordCount || 0
        results.push({
          sectionId: draft.sectionId,
          title: draft.title,
          wordCount: draft.wordCount || 0,
        })

        if (!firstInsertedId) firstInsertedId = draft.sectionId

        // Update progress modal step-by-step for visual feedback
        setProgress((p) => ({
          ...p,
          current: results.length,
          currentTitle: draft.title,
          results,
          totalWords,
        }))
      }

      setProgress((p) => ({
        ...p,
        status: 'done',
        current: results.length,
        results,
        totalWords,
      }))

      if (firstInsertedId) {
        setActiveSection(firstInsertedId)
      }

      const successCount = results.filter((r) => !r.error).length
      if (successCount > 0) {
        toast.success(
          `${successCount} section${successCount > 1 ? 's' : ''} rédigée${successCount > 1 ? 's' : ''} (${totalWords} mots)`
        )
      }
      if (results.some((r) => r.error)) {
        toast.warning('Certaines sections n\'ont pas pu être rédigées.')
      }
    } catch (err: any) {
      console.error('[DraftAllButton] Error:', err)
      setProgress((p) => ({ ...p, status: 'error' }))
      toast.error(err?.message || 'Erreur lors de la génération multiple.')
    }
  }

  function handleClose() {
    setProgress((p) => ({ ...p, open: false }))
  }

  function handleAbort() {
    abortRef.current = true
    setProgress((p) => ({ ...p, status: 'done' }))
  }

  if (emptySections.length === 0) return null

  return (
    <>
      <Button
        onClick={handleGenerateAll}
        variant="outline"
        size={compact ? 'sm' : 'default'}
        className={cn(
          'rounded-full border-primary/40 text-primary hover:bg-primary/5',
          !compact && 'iris-gradient-text font-semibold'
        )}
        title={`Rédiger automatiquement les ${emptySections.length} sections vides`}
      >
        <Wand2 className="h-3.5 w-3.5 mr-1.5" />
        {compact ? (
          <span>Rédiger tout ({emptySections.length})</span>
        ) : (
          <span>Rimiris rédige les {emptySections.length} sections vides</span>
        )}
      </Button>

      <AnimatePresence>
        {progress.open && (
          <DraftAllProgressModal
            progress={progress}
            onClose={handleClose}
            onAbort={handleAbort}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================================
// Progress Modal
// ============================================================================
function DraftAllProgressModal({
  progress,
  onClose,
  onAbort,
}: {
  progress: ProgressState
  onClose: () => void
  onAbort: () => void
}) {
  const pct =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const isGenerating = progress.status === 'generating'
  const isDone = progress.status === 'done'
  const isError = progress.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={isGenerating ? undefined : onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl iris-gradient flex items-center justify-center flex-shrink-0">
              {isGenerating ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : isError ? (
                <AlertCircle className="h-5 w-5 text-white" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">
                {isGenerating
                  ? 'Rimiris rédige vos sections…'
                  : isDone
                  ? 'Rédaction terminée'
                  : 'Erreur'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isGenerating
                  ? `Section ${progress.current + 1} / ${progress.total} · ${progress.currentTitle}`
                  : isDone
                  ? `${progress.results.filter((r) => !r.error).length} section(s) rédigée(s), ${progress.totalWords} mots générés`
                  : 'Une erreur est survenue pendant la génération.'}
              </p>
            </div>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Progression
              </span>
              <span className="text-[11px] font-bold">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full iris-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Results list */}
        <div className="max-h-[300px] overflow-y-auto p-3 space-y-1.5">
          {progress.results.length === 0 && isGenerating && (
            <div className="py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Préparation de la première section…
              </p>
            </div>
          )}
          {progress.results.map((r, idx) => (
            <div
              key={r.sectionId}
              className={cn(
                'flex items-center gap-2.5 p-2 rounded-lg border text-xs',
                r.error
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground w-5 text-right">
                {idx + 1}
              </span>
              {r.error ? (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              )}
              <span className="flex-1 font-medium truncate">{r.title}</span>
              {r.error ? (
                <Badge variant="outline" className="text-[9px] text-red-600 border-red-500/30">
                  Échec
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30">
                  {r.wordCount} mots
                </Badge>
              )}
            </div>
          ))}

          {/* Current section being generated */}
          {isGenerating && progress.current < progress.total && (
            <div className="flex items-center gap-2.5 p-2 rounded-lg border border-primary/30 bg-primary/5 text-xs">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />
              <span className="flex-1 font-medium truncate">
                {progress.currentTitle}
              </span>
              <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                En cours
              </Badge>
            </div>
          )}

          {/* Pending sections (not yet started) */}
          {isGenerating &&
            progress.results.length + 1 < progress.total &&
            Array.from({ length: progress.total - progress.results.length - 1 })
              .map((_, i) => i + progress.results.length + 1)
              .map((idx) => (
                <div
                  key={`pending-${idx}`}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-border/50 text-xs text-muted-foreground/50"
                >
                  <span className="font-mono text-[10px] w-5 text-right">{idx + 1}</span>
                  <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1 italic">En attente…</span>
                </div>
              ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            {isDone
              ? `${progress.totalWords} mots générés au total`
              : isGenerating
              ? 'Ne fermez pas cette fenêtre pendant la génération'
              : 'Vérifiez le contenu généré dans chaque section.'}
          </div>
          <div className="flex gap-2">
            {isGenerating && (
              <Button variant="outline" size="sm" onClick={onAbort} className="rounded-full">
                Arrêter
              </Button>
            )}
            {!isGenerating && (
              <Button onClick={onClose} size="sm" className="rounded-full iris-gradient text-white">
                Fermer
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
