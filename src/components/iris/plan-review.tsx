'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Loader2,
  GripVertical,
  RefreshCw,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { RimirisLogo } from './rimiris-logo'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ThemeToggle } from './theme-toggle'
import { cn } from '@/lib/utils'

interface PlanItem {
  title: string
  description: string
}

export function PlanReview() {
  const {
    proposedPlan,
    setProposedPlan,
    acceptPlanAndCreateSections,
    setView,
    interviewAnswers,
  } = useIrisStore()

  const [items, setItems] = React.useState<PlanItem[]>(
    proposedPlan.length
      ? proposedPlan
      : [{ title: 'Introduction générale', description: 'Présentation du sujet.' }]
  )
  const [regenerating, setRegenerating] = React.useState(false)
  const [accepting, setAccepting] = React.useState(false)

  function updateItem(idx: number, patch: Partial<PlanItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function addItem() {
    setItems((prev) => [...prev, { title: 'Nouvelle section', description: '' }])
  }

  function moveItem(idx: number, dir: 'up' | 'down') {
    setItems((prev) => {
      const next = [...prev]
      const target = dir === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  async function regenerate() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: interviewAnswers }),
      })
      const data = await res.json()
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        setItems(data.sections)
        setProposedPlan(data.sections)
      }
    } catch {
      // ignore
    } finally {
      setRegenerating(false)
    }
  }

  function accept() {
    setAccepting(true)
    // Persist the (possibly edited) plan, then create sections
    setProposedPlan(items)
    setTimeout(() => {
      acceptPlanAndCreateSections()
      setAccepting(false)
    }, 200)
  }

  // Build a recap of the interview answers
  const topicAnswer = interviewAnswers.find((a) => a.questionId === 'topic')
  const levelAnswer = interviewAnswers.find((a) => a.questionId === 'level')
  const problemAnswer = interviewAnswers.find((a) => a.questionId === 'problem')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RimirisLogo size="lg" withWordmark />
            <div className="hidden sm:block pl-3 border-l border-border/60">
              <p className="text-xs text-muted-foreground leading-none">
                Proposition de plan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('interview')}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Revenir à l'entretien</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Intro */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Plan proposé par Rimiris
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">
              Voici le plan que je suggère pour votre mémoire
            </h1>
            <p className="text-sm text-muted-foreground">
              Basé sur vos réponses. Modifiez les titres, supprimez ce qui ne convient pas,
              ajoutez vos propres sections — puis validez pour commencer à rédiger.
            </p>
          </motion.div>

          {/* Recap of answers */}
          {(topicAnswer || levelAnswer || problemAnswer) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border bg-muted/30 p-4"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Ce que Rimiris a retenu de vous
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {topicAnswer && (
                  <div>
                    <p className="text-xs text-muted-foreground">Sujet</p>
                    <p className="font-medium">{topicAnswer.answer}</p>
                  </div>
                )}
                {levelAnswer && (
                  <div>
                    <p className="text-xs text-muted-foreground">Niveau</p>
                    <p className="font-medium">{levelAnswer.answer}</p>
                  </div>
                )}
                {problemAnswer && (
                  <div>
                    <p className="text-xs text-muted-foreground">Problématique</p>
                    <p className="font-medium line-clamp-2">{problemAnswer.answer}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Plan items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {items.map((item, idx) => (
              <PlanItemCard
                key={idx}
                index={idx}
                total={items.length}
                item={item}
                onChange={(patch) => updateItem(idx, patch)}
                onRemove={() => removeItem(idx)}
                onMove={(dir) => moveItem(idx, dir)}
              />
            ))}
          </motion.div>

          {/* Add section */}
          <Button
            variant="outline"
            onClick={addItem}
            className="w-full border-dashed rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter une section
          </Button>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-4 border-t"
          >
            <Button
              variant="ghost"
              onClick={regenerate}
              disabled={regenerating}
              className="text-muted-foreground"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1.5" />
              )}
              Demander un autre plan
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {items.length} sections
              </span>
              <Button
                onClick={accept}
                disabled={accepting || items.length === 0}
                size="lg"
                className="rounded-full iris-gradient text-white"
              >
                {accepting ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1.5" />
                )}
                Valider ce plan et commencer à rédiger
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// PlanItemCard
// ============================================================================

function PlanItemCard({
  index,
  total,
  item,
  onChange,
  onRemove,
  onMove,
}: {
  index: number
  total: number
  item: PlanItem
  onChange: (patch: Partial<PlanItem>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const [editingTitle, setEditingTitle] = React.useState(false)
  const [editingDesc, setEditingDesc] = React.useState(false)

  return (
    <div className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="text-xs font-mono text-muted-foreground w-5 text-center">
            {index + 1}
          </span>
          <div className="flex flex-col">
            <button
              onClick={() => onMove('up')}
              disabled={index === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Monter"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>
            <button
              onClick={() => onMove('down')}
              disabled={index === total - 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Descendre"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <Input
              autoFocus
              value={item.title}
              onChange={(e) => onChange({ title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false)
              }}
              className="font-semibold text-base h-8"
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="font-semibold text-base text-left hover:text-primary transition-colors flex items-center gap-1.5"
            >
              {item.title}
              <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            </button>
          )}

          {editingDesc ? (
            <Textarea
              autoFocus
              value={item.description}
              onChange={(e) => onChange({ description: e.target.value })}
              onBlur={() => setEditingDesc(false)}
              className="mt-1 text-sm min-h-[60px]"
              placeholder="Décrivez en 1-2 phrases ce que contiendra cette section..."
            />
          ) : (
            <button
              onClick={() => setEditingDesc(true)}
              className={cn(
                'block mt-1 text-sm text-left text-muted-foreground w-full',
                !item.description && 'italic'
              )}
            >
              {item.description || 'Cliquez pour ajouter une description...'}
            </button>
          )}
        </div>

        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
          title="Supprimer cette section"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
