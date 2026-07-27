'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
  X,
  Check,
} from 'lucide-react'
import { useIrisStore, type InterviewAnswer } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThemeToggle } from './theme-toggle'
import { cn } from '@/lib/utils'

interface InterviewStep {
  id: string
  field: string
  question: string
  placeholder: string
  helper: string
}

interface InterviewResponse {
  done: boolean
  progress: { current: number; total: number }
  step?: InterviewStep
  suggestions?: string[]
}

export function OnboardingInterview() {
  const { interviewAnswers, addInterviewAnswer, setProposedPlan, setView } = useIrisStore()
  const [step, setStep] = React.useState<InterviewStep | null>(null)
  const [progress, setProgress] = React.useState<{ current: number; total: number }>({
    current: 1,
    total: 5,
  })
  const [input, setInput] = React.useState('')
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [transitioning, setTransitioning] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Fetch the next question whenever answers change
  const fetchNextQuestion = React.useCallback(async (answers: InterviewAnswer[]) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data: InterviewResponse = await res.json()
      if (data.done) {
        // Move to plan review
        await generatePlan(answers)
        return
      }
      if (data.step) {
        setStep(data.step)
        setProgress(data.progress)
        setSuggestions(data.suggestions || [])
      }
    } catch (e) {
      setError('Connexion impossible. Réessayez dans un instant.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generatePlan(answers: InterviewAnswer[]) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        setProposedPlan(data.sections)
        setView('plan_review')
      } else {
        setError("IRIS n'a pas pu proposer de plan. Réessayez.")
      }
    } catch {
      setError('Connexion impossible. Réessayez dans un instant.')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  React.useEffect(() => {
    fetchNextQuestion(interviewAnswers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to bottom on new content
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [step, loading, suggestions])

  async function handleSubmit() {
    const trimmed = input.trim()
    if (!trimmed || !step || transitioning) return
    setTransitioning(true)

    const answer: InterviewAnswer = {
      questionId: step.id,
      question: step.question,
      answer: trimmed,
    }
    addInterviewAnswer(answer)
    setInput('')

    // Build the new answers list locally so we don't wait for state update
    const newAnswers = [...interviewAnswers, answer]
    await fetchNextQuestion(newAnswers)
    setTransitioning(false)
  }

  function handleSuggestion(s: string) {
    setInput(s)
  }

  function handleSkip() {
    if (!step || transitioning) return
    setTransitioning(true)
    const answer: InterviewAnswer = {
      questionId: step.id,
      question: step.question,
      answer: '(non précisé)',
    }
    addInterviewAnswer(answer)
    setInput('')
    const newAnswers = [...interviewAnswers, answer]
    fetchNextQuestion(newAnswers).finally(() => setTransitioning(false))
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl iris-gradient flex items-center justify-center iris-glow">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-none">IRIS</p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                Entretien de démarrage · étape {progress.current}/{progress.total}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block w-40 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full iris-gradient"
                initial={{ width: 0 }}
                animate={{
                  width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('welcome')}
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
            {/* Previous answers as a recap */}
            {interviewAnswers.length > 0 && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Vos réponses précédentes
                </p>
                {interviewAnswers.map((a, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="text-muted-foreground text-xs italic">
                      Q{idx + 1} · {a.questionId}
                    </p>
                    <p className="font-medium">{a.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* IRIS question bubble */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step?.id || 'loading'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-full iris-gradient flex items-center justify-center flex-shrink-0 iris-glow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground italic">
                        IRIS prépare sa question...
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[15px] leading-relaxed">{step?.question}</p>
                      {step?.helper && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{step.helper}</p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Suggestions */}
            {suggestions.length > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-13 pl-13 space-y-1.5"
              >
                <p className="text-xs text-muted-foreground italic mb-1">
                  Suggestions de problématiques :
                </p>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(s)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <span className="text-primary mr-1.5">→</span>
                    {s}
                  </button>
                ))}
              </motion.div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 h-7"
                  onClick={() => fetchNextQuestion(interviewAnswers)}
                >
                  Réessayer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && input.trim()) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={step?.placeholder || 'Votre réponse...'}
              disabled={loading || transitioning}
              className="resize-none min-h-[80px] max-h-[200px] text-[15px]"
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={loading || transitioning}
                  className="text-muted-foreground"
                >
                  Passer cette question
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Cmd/Ctrl+Entrée
                </span>
                <Button
                  onClick={handleSubmit}
                  disabled={!input.trim() || loading || transitioning}
                  className="rounded-full iris-gradient text-white"
                >
                  {transitioning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="h-4 w-4 mr-1.5" />
                  )}
                  Répondre
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
