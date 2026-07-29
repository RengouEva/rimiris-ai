'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  RefreshCw,
  Lightbulb,
  ListChecks,
  Eye,
  PenLine,
  Wand2,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
} from 'lucide-react'
import {
  useIrisStore,
  type Section,
  type InterviewAnswer,
  type SectionValidation,
  type HumanizationResult,
  htmlToPlainText,
} from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// SectionWorkflowPanel — the right-side sliding panel that runs the per-section
// mini-workflow: interview (4 modes) → validation → drafting → humanization.
// Replaces the old AIPanel.
// ============================================================================

type PanelStep = 'interview' | 'validation' | 'draft' | 'humanization' | 'done'

export function SectionWorkflowPanel({
  section,
  onClose,
  onInsertDraft,
  onReplaceDraft,
}: {
  section: Section
  onClose: () => void
  onInsertDraft: (html: string) => void
  onReplaceDraft: (html: string) => void
}) {
  const {
    project,
    sections,
    themeUnderstanding,
    problemContext,
    addSectionInterviewAnswer,
    setSectionInterviewAnswers,
    setSectionValidation,
    setSectionHumanization,
    setSectionStatus,
    updateSectionContent,
  } = useIrisStore()

  // Determine initial step based on section state
  const initialStep: PanelStep = React.useMemo(() => {
    if (section.status === 'completed') return 'done'
    if (section.humanization) return 'done'
    if (section.wordCount > 100 && section.validation) return 'humanization'
    if (section.validation?.overallOk) return 'draft'
    if (section.interviewAnswers.length > 0) return 'validation'
    return 'interview'
  }, [section])

  const [step, setStep] = React.useState<PanelStep>(initialStep)

  const allSections = sections.map((s) => ({ title: s.title, content: s.content }))

  return (
    <>
      {/* Backdrop on mobile — fades out the editor behind the panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed sm:relative inset-y-0 right-0 z-50 sm:z-auto w-full sm:w-[460px] sm:flex-shrink-0 border-l border-border bg-background flex flex-col h-[calc(100dvh-3.5rem)] sm:h-[calc(100dvh-3.5rem)] max-h-[100dvh] sm:max-h-none"
      >
        <PanelHeader step={step} section={section} onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'interview' && (
            <motion.div
              key="interview"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <InterviewStep
                section={section}
                project={project}
                themeUnderstanding={themeUnderstanding}
                problemContext={problemContext}
                onAnswer={(a) => addSectionInterviewAnswer(section.id, a)}
                onSetAnswers={(as) => setSectionInterviewAnswers(section.id, as)}
                onContinue={() => setStep('validation')}
              />
            </motion.div>
          )}
          {step === 'validation' && (
            <motion.div
              key="validation"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <ValidationStep
                section={section}
                project={project}
                onValidated={(v) => {
                  setSectionValidation(section.id, v)
                  // Always allow the student to continue (validation is informative, not blocking).
                  setStep('draft')
                }}
                onBack={() => setStep('interview')}
              />
            </motion.div>
          )}
          {step === 'draft' && (
            <motion.div
              key="draft"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <DraftStep
                section={section}
                project={project}
                themeUnderstanding={themeUnderstanding}
                problemContext={problemContext}
                allSections={allSections}
                onInsert={(html) => {
                  // Insert into the editor (which triggers onChange → updateSectionContent)
                  onInsertDraft(html)
                  setStep('humanization')
                }}
                onBack={() => setStep('validation')}
              />
            </motion.div>
          )}
          {step === 'humanization' && (
            <motion.div
              key="humanization"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <HumanizationStep
                section={section}
                project={project}
                onHumanized={(h) => {
                  setSectionHumanization(section.id, h)
                  // Replace (not append) the editor content with the humanized version.
                  // replaceHtml triggers onChange → updateSectionContent automatically.
                  onReplaceDraft(h.finalHtml)
                  setStep('done')
                }}
                onSkip={() => setStep('done')}
                onBack={() => setStep('draft')}
              />
            </motion.div>
          )}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <DoneStep
                section={section}
                onClose={onClose}
                onMarkCompleted={() => {
                  setSectionStatus(section.id, 'completed')
                  onClose()
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
    </>
  )
}

// ============================================================================
// Panel header with step indicator
// ============================================================================

function PanelHeader({
  step,
  section,
  onClose,
}: {
  step: PanelStep
  section: Section
  onClose: () => void
}) {
  const steps: { id: PanelStep; label: string; icon: any }[] = [
    { id: 'interview', label: 'Entretien', icon: HelpCircle },
    { id: 'validation', label: 'Validation', icon: ShieldCheck },
    { id: 'draft', label: 'Rédaction', icon: PenLine },
    { id: 'humanization', label: 'Humanisation', icon: Wand2 },
    { id: 'done', label: 'Terminé', icon: CheckCircle2 },
  ]
  const currentIdx = steps.findIndex((s) => s.id === step)

  return (
    <div className="border-b border-border p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-none">Workflow de section</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{section.title}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-0.5">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all',
                idx === currentIdx
                  ? 'bg-primary/10 text-primary'
                  : idx < currentIdx
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground/40'
              )}
            >
              {idx < currentIdx ? <Check className="h-2.5 w-2.5" /> : <s.icon className="h-2.5 w-2.5" />}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'w-3 h-px',
                  idx < currentIdx ? 'bg-emerald-500/40' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// STEP 1 — Interview (4 modes)
// ============================================================================

type InterviewMode = 'know' | 'dont_know' | 'propose' | 'example'

function InterviewStep({
  section,
  project,
  themeUnderstanding,
  problemContext,
  onAnswer,
  onSetAnswers,
  onContinue,
}: {
  section: Section
  project: any
  themeUnderstanding: any
  problemContext: any
  onAnswer: (a: InterviewAnswer) => void
  onSetAnswers: (a: InterviewAnswer[]) => void
  onContinue: () => void
}) {
  const [currentQuestion, setCurrentQuestion] = React.useState<{
    questionId: string
    question: string
    helper: string
  } | null>(null)
  const [mode, setMode] = React.useState<InterviewMode | null>(null)
  const [studentInput, setStudentInput] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [explanation, setExplanation] = React.useState<string | null>(null)
  const [proposals, setProposals] = React.useState<
    { id: string; label: string; content: string; rationale: string }[]
  >([])
  const [example, setExample] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState({ current: 0, total: 5 })
  // Track the number of answers we've already loaded a question for
  const [lastLoadedCount, setLastLoadedCount] = React.useState(section.interviewAnswers.length)

  async function fetchNextQuestion() {
    setLoading(true)
    setError(null)
    setMode(null)
    setStudentInput('')
    setExplanation(null)
    setProposals([])
    setExample(null)
    try {
      const res = await fetch('/api/ai/section-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: section.title,
          sectionDescription: '',
          project,
          themeUnderstanding,
          problemContext,
          answers: section.interviewAnswers,
          action: 'next_question',
        }),
      })
      const data = await res.json()
      if (data.done) {
        // All questions answered — go to validation
        onContinue()
        return
      }
      setCurrentQuestion(data.nextQuestion)
      setProgress(data.progress || progress)
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  React.useEffect(() => {
    fetchNextQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the answers array grows (i.e. student just answered), fetch the next question.
  // Skip the initial mount (handled above).
  React.useEffect(() => {
    if (section.interviewAnswers.length > lastLoadedCount) {
      setLastLoadedCount(section.interviewAnswers.length)
      fetchNextQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.interviewAnswers.length])

  async function handleModeAction(selectedMode: InterviewMode) {
    if (!currentQuestion) return
    setMode(selectedMode)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/section-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: section.title,
          project,
          themeUnderstanding,
          problemContext,
          answers: section.interviewAnswers,
          action: selectedMode,
          studentInput: selectedMode === 'know' ? studentInput : undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (selectedMode === 'know') {
        // Register answer and move on
        onAnswer({
          questionId: currentQuestion.questionId,
          question: currentQuestion.question,
          answer: studentInput.trim(),
        })
        setStudentInput('')
        setMode(null)
        fetchNextQuestion()
      } else if (selectedMode === 'dont_know') {
        setExplanation(data.explanation)
      } else if (selectedMode === 'propose') {
        setProposals(data.proposals || [])
      } else if (selectedMode === 'example') {
        setExample(data.example)
      }
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  function acceptProposal(p: { id: string; content: string }) {
    if (!currentQuestion) return
    onAnswer({
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      answer: p.content,
    })
    setProposals([])
    setMode(null)
    fetchNextQuestion()
  }

  function handleSkipQuestion() {
    if (!currentQuestion) return
    onAnswer({
      questionId: currentQuestion.questionId,
      question: currentQuestion.question,
      answer: '(non précisé)',
    })
    setMode(null)
    fetchNextQuestion()
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <Badge variant="outline" className="mb-2 text-[10px]">
          Question {progress.current + 1} / {progress.total}
        </Badge>
        <p className="text-xs text-muted-foreground mb-1.5">Phase 3 · Entretien structuré</p>
      </div>

      {loading && !currentQuestion && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {currentQuestion && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-muted/40 p-3 space-y-1"
        >
          <p className="text-sm font-medium leading-relaxed">{currentQuestion.question}</p>
          {currentQuestion.helper && (
            <p className="text-[11px] text-muted-foreground italic">{currentQuestion.helper}</p>
          )}
        </motion.div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-2.5 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Mode selection (4 modes) */}
      {currentQuestion && !mode && !loading && (
        <div className="grid grid-cols-2 gap-1.5">
          <ModeButton
            icon={<PenLine className="h-3.5 w-3.5" />}
            label="Je sais"
            desc="J'écris ma réponse"
            onClick={() => setMode('know')}
            color="primary"
          />
          <ModeButton
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            label="Je ne sais pas"
            desc="Rimiris m'explique"
            onClick={() => handleModeAction('dont_know')}
            color="amber"
          />
          <ModeButton
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label="Propose-moi"
            desc="Plusieurs options"
            onClick={() => handleModeAction('propose')}
            color="violet"
          />
          <ModeButton
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Montre-moi"
            desc="Un exemple concret"
            onClick={() => handleModeAction('example')}
            color="cyan"
          />
        </div>
      )}

      {/* Mode know: textarea + submit */}
      {mode === 'know' && currentQuestion && (
        <div className="space-y-2">
          <Textarea
            value={studentInput}
            onChange={(e) => setStudentInput(e.target.value)}
            placeholder="Votre réponse..."
            autoFocus
            className="resize-none min-h-[100px] text-sm"
            disabled={loading}
          />
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode(null)}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => handleModeAction('know')}
              disabled={!studentInput.trim() || loading}
              className="flex-1 iris-gradient text-white"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* Mode dont_know: explanation */}
      {mode === 'dont_know' && explanation && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{explanation}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(null)}
            className="w-full text-xs"
          >
            Maintenant je veux répondre
          </Button>
        </motion.div>
      )}

      {/* Mode propose: 3 proposals */}
      {mode === 'propose' && proposals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs text-muted-foreground italic">
            Choisissez une proposition (vous pourrez l'éditer après) :
          </p>
          {proposals.map((p) => (
            <button
              key={p.id}
              onClick={() => acceptProposal(p)}
              className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              {p.label && <p className="text-xs font-semibold mb-0.5">{p.label}</p>}
              <p className="text-sm">{p.content}</p>
              {p.rationale && (
                <p className="text-[11px] text-muted-foreground italic mt-1">{p.rationale}</p>
              )}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode(null)}
            className="w-full text-xs"
          >
            Annuler
          </Button>
        </motion.div>
      )}

      {/* Mode example */}
      {mode === 'example' && example && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-cyan-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{example}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(null)}
            className="w-full text-xs"
          >
            Maintenant je veux répondre
          </Button>
        </motion.div>
      )}

      {currentQuestion && !loading && (
        <div className="flex justify-between items-center pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipQuestion}
            className="text-xs text-muted-foreground"
          >
            Passer cette question
          </Button>
          {section.interviewAnswers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onContinue}
              className="text-xs"
            >
              Aller à la validation →
            </Button>
          )}
        </div>
      )}

      {/* Recap of answers */}
      {section.interviewAnswers.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Réponses collectées ({section.interviewAnswers.length})
          </p>
          {section.interviewAnswers.map((a, i) => (
            <div key={i} className="text-xs">
              <p className="text-muted-foreground italic">{a.question}</p>
              <p className="font-medium">{a.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModeButton({
  icon,
  label,
  desc,
  onClick,
  color,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  onClick: () => void
  color: 'primary' | 'amber' | 'violet' | 'cyan'
}) {
  const colorClasses = {
    primary: 'border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary',
    amber: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400',
    violet: 'border-violet-500/30 hover:border-violet-500/60 hover:bg-violet-500/5 text-violet-600 dark:text-violet-400',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5 text-cyan-600 dark:text-cyan-400',
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center',
        colorClasses[color]
      )}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[10px] text-muted-foreground">{desc}</span>
    </button>
  )
}

// ============================================================================
// STEP 2 — Validation
// ============================================================================

function ValidationStep({
  section,
  project,
  onValidated,
  onBack,
}: {
  section: Section
  project: any
  onValidated: (v: SectionValidation) => void
  onBack: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [validation, setValidation] = React.useState<SectionValidation | null>(section.validation || null)
  const [error, setError] = React.useState<string | null>(null)

  async function runValidation() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/section-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: section.title,
          project,
          answers: section.interviewAnswers,
          action: 'validate',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const v: SectionValidation = {
        coherence: data.coherence || { ok: true, notes: '' },
        feasibility: data.feasibility || { ok: true, notes: '' },
        precision: data.precision || { ok: true, notes: '' },
        logic: data.logic || { ok: true, notes: '' },
        overallOk: Boolean(data.overallOk),
      }
      setValidation(v)
      // Do NOT auto-advance — let the student review the report and click "Continuer"
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <Badge variant="outline" className="mb-2 text-[10px]">
          Phase 4 · Validation
        </Badge>
        <p className="text-sm font-semibold">Vérification avant rédaction</p>
        <p className="text-xs text-muted-foreground mt-1">
          Le Contrôleur qualité vérifie la cohérence, la faisabilité, la précision et la logique
          de vos réponses collectées. La rédaction ne peut commencer que si tout est validé.
        </p>
      </div>

      {!validation && !loading && (
        <Button
          onClick={runValidation}
          className="w-full iris-gradient text-white rounded-full"
        >
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          Lancer la validation
        </Button>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground italic">Vérification en cours...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-2.5 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={runValidation} className="h-6 text-xs">
            Réessayer
          </Button>
        </div>
      )}

      {validation && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <ValidationRow label="Cohérence" v={validation.coherence} />
          <ValidationRow label="Faisabilité" v={validation.feasibility} />
          <ValidationRow label="Précision" v={validation.precision} />
          <ValidationRow label="Logique" v={validation.logic} />

          <div
            className={cn(
              'rounded-xl p-3 border-2',
              validation.overallOk
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-amber-500/40 bg-amber-500/5'
            )}
          >
            <div className="flex items-start gap-2">
              {validation.overallOk ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {validation.overallOk ? 'Validation réussie' : 'Validation partielle'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {validation.overallOk
                    ? 'Toutes les conditions sont réunies pour rédiger cette section.'
                    : 'Vous pouvez tout de même continuer, mais prévoyez de compléter les informations manquantes.'}
                </p>
              </div>
            </div>
          </div>

          {/* Always allow the student to proceed */}
          <Button
            onClick={() => onValidated(validation)}
            className="w-full iris-gradient text-white rounded-full"
          >
            <PenLine className="h-4 w-4 mr-1.5" />
            Continuer vers la rédaction
          </Button>
        </motion.div>
      )}

      <div className="flex gap-1.5 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
          ← Revenir à l'entretien
        </Button>
      </div>
    </div>
  )
}

function ValidationRow({
  label,
  v,
}: {
  label: string
  v: { ok: boolean; notes: string }
}) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-card">
      {v.ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        {v.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{v.notes}</p>}
      </div>
    </div>
  )
}

// ============================================================================
// STEP 3 — Drafting
// ============================================================================

function DraftStep({
  section,
  project,
  themeUnderstanding,
  problemContext,
  allSections,
  onInsert,
  onBack,
}: {
  section: Section
  project: any
  themeUnderstanding: any
  problemContext: any
  allSections: { title: string; content: string }[]
  onInsert: (html: string) => void
  onBack: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [draftHtml, setDraftHtml] = React.useState<string | null>(null)
  const [instruction, setInstruction] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setDraftHtml(null)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: section.title,
          sectionContent: section.content,
          project,
          allSections,
          interviewAnswers: section.interviewAnswers,
          themeUnderstanding,
          problemContext,
          userInstruction: instruction.trim() || 'Génère un brouillon structuré basé sur les réponses collectées.',
          mode: 'generate',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDraftHtml(data.html)
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <Badge variant="outline" className="mb-2 text-[10px]">
          Phase 5 · Rédaction
        </Badge>
        <p className="text-sm font-semibold">Le Rédacteur produit un brouillon</p>
        <p className="text-xs text-muted-foreground mt-1">
          À partir des {section.interviewAnswers.length} réponses collectées et validées, l'agent
          Rédacteur produit un texte structuré, en HTML sémantique déjà formaté. Il n'invente
          rien : tout vient de vos réponses.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Sources utilisées
        </p>
        <p className="text-xs">
          {section.interviewAnswers.length} réponse(s) collectée(s) · Problématique :{' '}
          <em>{problemContext?.selected?.slice(0, 60) || '—'}...</em>
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Instruction optionnelle : « insistez sur l'aspect méthodologique », « ton neutre, 500 mots », etc."
          className="resize-none min-h-[60px] text-sm"
          disabled={loading}
        />
        <Button
          onClick={generate}
          disabled={loading}
          className="w-full iris-gradient text-white rounded-full"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <PenLine className="h-4 w-4 mr-1.5" />
          )}
          {loading ? 'Rédaction en cours...' : 'Générer le brouillon'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-2.5 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {draftHtml && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Aperçu du brouillon
          </p>
          <div
            className="rounded-xl border border-border bg-white text-black p-4 prose-iris max-h-[400px] overflow-y-auto text-sm"
            style={{ fontSize: '11pt', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: draftHtml }}
          />
          <div className="flex gap-1.5">
            <Button
              onClick={() => {
                onInsert(draftHtml)
                toast.success('Brouillon inséré dans l\'éditeur. Passons à l\'humanisation.')
              }}
              size="sm"
              className="flex-1 iris-gradient text-white rounded-full"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Insérer et humaniser
            </Button>
            <Button
              onClick={generate}
              size="sm"
              variant="outline"
              className="rounded-full"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="flex gap-1.5 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
          ← Revenir à la validation
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// STEP 4 — Humanization (5-engine pipeline)
// ============================================================================

type PassState = 'pending' | 'running' | 'done' | 'error'

interface PassRuntime {
  state: PassState
  report?: string
  error?: string
}

function HumanizationStep({
  section,
  project,
  onHumanized,
  onSkip,
  onBack,
}: {
  section: Section
  project: any
  onHumanized: (h: HumanizationResult) => void
  onSkip: () => void
  onBack: () => void
}) {
  // État par passe — chaque passe a son propre état indépendant
  // 'pending' → 'running' → 'done' (ou 'error' si échec)
  const [passesState, setPassesState] = React.useState<Record<string, PassRuntime>>(
    () => {
      // Si la section a déjà une humanisation complète, on marque les 5 passes comme 'done'
      if (section.humanization) {
        return {
          grammar: { state: 'done' as PassState, report: section.humanization.grammar },
          fluidity: { state: 'done' as PassState, report: section.humanization.fluidity },
          style: { state: 'done' as PassState, report: section.humanization.style },
          academic: { state: 'done' as PassState, report: section.humanization.academic },
          level: { state: 'done' as PassState, report: section.humanization.level },
        }
      }
      return {} as Record<string, PassRuntime>
    }
  )

  // HTML courant au fil des passes (on enchaîne passe 1 → 2 → 3 → 4 → 5)
  const currentHtmlRef = React.useRef<string>(section.content)
  // HTML final (après passe 5) — utilisé pour mettre à jour l'éditeur
  const [finalHtml, setFinalHtml] = React.useState<string | null>(null)
  const [globalError, setGlobalError] = React.useState<string | null>(null)
  const [isRunning, setIsRunning] = React.useState(false)

  const passes = [
    { name: 'Correction grammaticale', key: 'grammar', desc: 'Orthographe, accords, ponctuation' },
    { name: 'Fluidité', key: 'fluidity', desc: 'Transitions et connecteurs logiques' },
    { name: 'Variation du style', key: 'style', desc: 'Éviter les répétitions' },
    { name: 'Registre académique', key: 'academic', desc: 'Vocabulaire soutenu' },
    { name: 'Adaptation au niveau', key: 'level', desc: `${project.level || 'Master'}` },
  ]

  function setPassState(key: string, state: PassState, extra?: Partial<PassRuntime>) {
    setPassesState((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { state: 'pending' }), state, ...extra },
    }))
  }

  async function runPipeline() {
    if (isRunning) return
    setIsRunning(true)
    setGlobalError(null)
    currentHtmlRef.current = section.content

    // Marquer toutes les passes non 'done' comme 'pending' (réinitialiser)
    const initial: Record<string, PassRuntime> = {}
    passes.forEach((p) => {
      const prev = passesState[p.key]
      initial[p.key] = prev && prev.state === 'done' ? prev : { state: 'pending' }
    })
    setPassesState(initial)

    // Exécuter les passes une par une (sequenciellement)
    for (let i = 0; i < passes.length; i++) {
      const p = passes[i]
      // Si déjà fait (relance partielle), on garde le résultat
      if (passesState[p.key]?.state === 'done' && passesState[p.key]?.report) {
        // On ne relance pas — mais il faut quand même avancer le HTML courant
        // On ne peut pas reconstruire le HTML intermédiaire, donc on relance
        // réellement pour être sûr de l'enchaînement.
      }
      setPassState(p.key, 'running')
      try {
        const res = await fetch('/api/ai/humanize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: currentHtmlRef.current,
            level: project.level,
            filiere: project.filiere,
            norme: project.norme,
            language: project.language,
            mode: 'pass',
            passIndex: i + 1,
          }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        currentHtmlRef.current = data.outputHtml
        setPassState(p.key, 'done', { report: data.report || '' })

        // Petite pause pour laisser l'animation se voir
        await new Promise((r) => setTimeout(r, 250))
      } catch (e: any) {
        setPassState(p.key, 'error', { error: e.message || 'Échec' })
        setGlobalError(e.message || 'Connexion impossible.')
        setIsRunning(false)
        return
      }
    }

    // Toutes les passes sont done — construire le HumanizationResult final
    const h: HumanizationResult = {
      grammar: passesState.grammar?.report || '',
      fluidity: passesState.fluidity?.report || '',
      style: passesState.style?.report || '',
      academic: passesState.academic?.report || '',
      level: passesState.level?.report || '',
      finalHtml: currentHtmlRef.current,
    }
    setFinalHtml(currentHtmlRef.current)
    onHumanized(h)
    setIsRunning(false)
  }

  // Vrai état "terminé" : les 5 passes sont 'done'
  const allDone = passes.every((p) => passesState[p.key]?.state === 'done')

  return (
    <div className="p-4 space-y-4">
      <div>
        <Badge variant="outline" className="mb-2 text-[10px]">
          Phase 5 · Humanisation
        </Badge>
        <p className="text-sm font-semibold">Pipeline en 5 passes</p>
        <p className="text-xs text-muted-foreground mt-1">
          L'Humaniseur passe le brouillon dans 5 moteurs successifs pour produire un texte naturel,
          fluide, académique et adapté à votre niveau d'études. Chaque passe s'affiche en temps réel.
        </p>
      </div>

      {/* Liste des passes avec état individuel */}
      <div className="space-y-1.5">
        {passes.map((p, idx) => {
          const st = passesState[p.key]?.state || 'pending'
          const report = passesState[p.key]?.report
          const err = passesState[p.key]?.error
          return (
            <motion.div
              key={p.key}
              layout
              initial={false}
              animate={{
                backgroundColor:
                  st === 'done'
                    ? 'rgba(16,185,129,0.05)'
                    : st === 'running'
                    ? 'rgba(124,58,237,0.08)'
                    : st === 'error'
                    ? 'rgba(239,68,68,0.05)'
                    : 'rgba(0,0,0,0)',
              }}
              className={cn(
                'flex items-start gap-2 p-2.5 rounded-lg border text-xs transition-colors',
                st === 'done'
                  ? 'border-emerald-500/30'
                  : st === 'running'
                  ? 'border-primary/40'
                  : st === 'error'
                  ? 'border-red-500/40'
                  : 'border-border bg-card'
              )}
            >
              {/* Indicateur d'état — change selon st */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 mt-0.5',
                  st === 'done'
                    ? 'bg-emerald-500 text-white'
                    : st === 'running'
                    ? 'bg-primary text-primary-foreground'
                    : st === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {st === 'done' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : st === 'running' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : st === 'error' ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </div>

              {/* Texte de la passe */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{p.name}</span>
                  {st === 'running' && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-primary italic"
                    >
                      traitement…
                    </motion.span>
                  )}
                  {st === 'done' && report && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 italic truncate">
                      · {report}
                    </span>
                  )}
                  {st === 'error' && err && (
                    <span className="text-[10px] text-red-500 italic truncate">· {err}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Barre de progression globale */}
      {isRunning && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progression</span>
            <span>
              {passes.filter((p) => passesState[p.key]?.state === 'done').length}/{passes.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full iris-gradient"
              initial={{ width: 0 }}
              animate={{
                width: `${(passes.filter((p) => passesState[p.key]?.state === 'done').length / passes.length) * 100}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Erreur globale */}
      {globalError && !isRunning && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-2.5 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1">{globalError}</span>
          <Button size="sm" variant="ghost" onClick={runPipeline} className="h-6 text-xs">
            Réessayer
          </Button>
        </div>
      )}

      {/* Bouton de lancement */}
      {!isRunning && !allDone && (
        <Button
          onClick={runPipeline}
          className="w-full iris-gradient text-white rounded-full"
        >
          <Wand2 className="h-4 w-4 mr-1.5" />
          Lancer le pipeline d'humanisation
        </Button>
      )}

      {/* Bouton relancer si déjà fini */}
      {!isRunning && allDone && (
        <Button
          onClick={runPipeline}
          variant="outline"
          className="w-full rounded-full"
          size="sm"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Relancer l'humanisation
        </Button>
      )}

      {/* Succès */}
      {allDone && finalHtml && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Humanisation terminée</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Le texte a été remplacé dans l'éditeur par la version humanisée. Vous pouvez
                encore l'éditer librement.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-1.5 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs" disabled={isRunning}>
          ← Revenir à la rédaction
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-xs ml-auto"
          disabled={isRunning}
        >
          Passer l'humanisation →
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// STEP 5 — Done
// ============================================================================

function DoneStep({
  section,
  onClose,
  onMarkCompleted,
}: {
  section: Section
  onClose: () => void
  onMarkCompleted: () => void
}) {
  return (
    <div className="p-4 space-y-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center"
      >
        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
      </motion.div>

      <div>
        <p className="text-lg font-bold">Section finalisée</p>
        <p className="text-sm text-muted-foreground mt-1">
          La section « {section.title} » a parcouru tout le workflow :
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5 text-left">
        <DoneCheck label="Entretien structuré" done={section.interviewAnswers.length > 0} />
        <DoneCheck label="Validation" done={Boolean(section.validation?.overallOk)} />
        <DoneCheck label="Rédaction" done={section.wordCount > 0} />
        <DoneCheck label="Humanisation" done={Boolean(section.humanization)} />
      </div>

      <div className="space-y-1.5">
        <Button
          onClick={onMarkCompleted}
          className="w-full iris-gradient text-white rounded-full"
        >
          <Check className="h-4 w-4 mr-1.5" />
          Marquer comme terminée
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full text-xs">
          Fermer et continuer à éditer
        </Button>
      </div>
    </div>
  )
}

function DoneCheck({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span className={done ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
