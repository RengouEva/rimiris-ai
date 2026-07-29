'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Send,
  Loader2,
  X,
  Check,
  Edit3,
  RefreshCw,
  Building2,
  Library,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import {
  useIrisStore,
  type InterviewAnswer,
  type SectionUnderstanding,
} from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ThemeToggle } from './theme-toggle'
import { cn } from '@/lib/utils'

// ============================================================================
// Onboarding orchestrates: Phase 0 (project collect) → Phase 1 (understanding)
// → Phase 2 (problem build) → plan review
// ============================================================================

type OnboardingStep = 'collect' | 'understanding' | 'problem' | 'plan'

export function OnboardingInterview() {
  const {
    interviewAnswers,
    addInterviewAnswer,
    project,
    updateProject,
    setProposedPlan,
    setThemeUnderstanding,
    setProblemContext,
    setView,
    themeUnderstanding,
    problemContext,
  } = useIrisStore()

  // Resume from where we left off, if any
  const initialStep: OnboardingStep = React.useMemo(() => {
    if (!themeUnderstanding?.validated) return 'collect'
    if (!problemContext?.selected) return 'problem'
    return 'plan'
  }, [themeUnderstanding, problemContext])

  const [step, setStep] = React.useState<OnboardingStep>(initialStep)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <OnboardingHeader step={step} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <AnimatePresence mode="wait">
            {step === 'collect' && (
              <motion.div
                key="collect"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CollectStep
                  onDone={() => setStep('understanding')}
                />
              </motion.div>
            )}
            {step === 'understanding' && (
              <motion.div
                key="understanding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <UnderstandingStep
                  onBack={() => setStep('collect')}
                  onValidated={() => setStep('problem')}
                />
              </motion.div>
            )}
            {step === 'problem' && (
              <motion.div
                key="problem"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ProblemBuildStep
                  onBack={() => setStep('understanding')}
                  onDone={() => setStep('plan')}
                />
              </motion.div>
            )}
            {step === 'plan' && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PlanStep />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// Header with phase progress
// ============================================================================

function OnboardingHeader({ step }: { step: OnboardingStep }) {
  const steps: { id: OnboardingStep; label: string; icon: any }[] = [
    { id: 'collect', label: 'Projet', icon: Building2 },
    { id: 'understanding', label: 'Compréhension', icon: Library },
    { id: 'problem', label: 'Problématique', icon: FlaskConical },
    { id: 'plan', label: 'Plan', icon: Sparkles },
  ]
  const currentIdx = steps.findIndex((s) => s.id === step)

  return (
    <header className="border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl iris-gradient flex items-center justify-center iris-glow">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base leading-none">Rimiris</p>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              Configuration du projet · étape {currentIdx + 1}/{steps.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            {steps.map((s, idx) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                  idx === currentIdx
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : idx < currentIdx
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground/50'
                )}
              >
                {idx < currentIdx ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <s.icon className="h-3 w-3" />
                )}
                <span className="hidden md:inline">{s.label}</span>
              </div>
            ))}
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
  )
}

// ============================================================================
// PHASE 0 — Project collect
// ============================================================================

function CollectStep({ onDone }: { onDone: () => void }) {
  const { project, updateProject, interviewAnswers, addInterviewAnswer, setThemeUnderstanding } =
    useIrisStore()

  // Pre-fill from existing answers if any
  const initialForm = React.useMemo(() => {
    const answerMap: Record<string, string> = {}
    for (const a of interviewAnswers) answerMap[a.questionId] = a.answer
    return {
      title: answerMap['topic'] || project.title || '',
      level: (answerMap['level'] || project.level || 'Master') as 'Licence' | 'Master' | 'Doctorat',
      university: project.university || '',
      faculty: project.faculty || '',
      department: project.department || '',
      filiere: answerMap['field'] || project.filiere || '',
      country: project.country || '',
      language: project.language || 'Français',
      norme: (project.norme || 'APA') as typeof project.norme,
    }
  }, [interviewAnswers, project])

  const [form, setForm] = React.useState(initialForm)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit() {
    // Save to project
    updateProject({
      title: form.title.trim(),
      level: form.level,
      university: form.university.trim(),
      faculty: form.faculty.trim(),
      department: form.department.trim(),
      filiere: form.filiere.trim(),
      country: form.country.trim(),
      language: form.language,
      norme: form.norme,
      theme: form.title.trim(),
    })
    // Record as interview answers (so we keep a paper trail)
    const fieldsToRecord: { questionId: string; question: string; answer: string }[] = [
      { questionId: 'topic', question: 'Quel est le titre de votre mémoire ?', answer: form.title.trim() },
      { questionId: 'level', question: 'Quel est votre niveau ?', answer: form.level },
      { questionId: 'field', question: 'Quelle est votre filière ?', answer: form.filiere.trim() },
    ]
    // Clear existing answers then add the new ones (idempotent on this step)
    for (const f of fieldsToRecord) {
      // Only add if not already there
      if (!interviewAnswers.find((a) => a.questionId === f.questionId)) {
        addInterviewAnswer(f)
      }
    }
    onDone()
  }

  const requiredOk = form.title.trim().length > 3 && form.level

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
          <Building2 className="h-3.5 w-3.5" />
          Phase 0 · Configuration du projet
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">
          Construisons le contexte permanent de votre mémoire
        </h1>
        <p className="text-sm text-muted-foreground">
          Ces informations seront utilisées par tous les agents Rimiris tout au long de votre
          mémoire. Plus elles sont précises, plus l'accompagnement sera adapté.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">
            Titre de votre mémoire <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Ex : L'impact du télétravail sur la productivité"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Niveau <span className="text-red-500">*</span></Label>
            <RadioGroup
              value={form.level}
              onValueChange={(v) => update('level', v as any)}
              className="grid grid-cols-3 gap-2"
            >
              {(['Licence', 'Master', 'Doctorat'] as const).map((lvl) => (
                <Label
                  key={lvl}
                  htmlFor={`lvl-${lvl}`}
                  className={cn(
                    'flex items-center justify-center p-2.5 rounded-lg border-2 cursor-pointer transition-all text-center text-sm font-medium',
                    form.level === lvl
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {lvl}
                  <RadioGroupItem value={lvl} id={`lvl-${lvl}`} className="sr-only" />
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              placeholder="Ex : Cameroun"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="university">Université</Label>
            <Input
              id="university"
              value={form.university}
              onChange={(e) => update('university', e.target.value)}
              placeholder="Ex : Université de Yaoundé I"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faculty">Faculté</Label>
            <Input
              id="faculty"
              value={form.faculty}
              onChange={(e) => update('faculty', e.target.value)}
              placeholder="Ex : FSEG"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department">Département</Label>
            <Input
              id="department"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              placeholder="Ex : Sciences de gestion"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filiere">Filière</Label>
            <Input
              id="filiere"
              value={form.filiere}
              onChange={(e) => update('filiere', e.target.value)}
              placeholder="Ex : Management"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Langue de rédaction</Label>
            <Input
              id="language"
              value={form.language}
              onChange={(e) => update('language', e.target.value)}
              placeholder="Ex : Français"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="norme">Norme de citation</Label>
            <RadioGroup
              value={form.norme}
              onValueChange={(v) => update('norme', v as any)}
              className="grid grid-cols-5 gap-1.5"
            >
              {(['APA', 'Vancouver', 'IEEE', 'ISO 690', 'Harvard'] as const).map((n) => (
                <Label
                  key={n}
                  htmlFor={`norme-${n}`}
                  className={cn(
                    'flex items-center justify-center px-2 py-2 rounded-lg border cursor-pointer text-[11px] font-medium transition-all text-center',
                    form.norme === n
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {n}
                  <RadioGroupItem value={n} id={`norme-${n}`} className="sr-only" />
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          <span className="text-red-500">*</span> Champs obligatoires
        </p>
        <Button
          onClick={handleSubmit}
          disabled={!requiredOk}
          size="lg"
          className="rounded-full iris-gradient text-white"
        >
          Étape suivante : Compréhension
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// PHASE 1 — Understanding (IRIS analyzes theme, student validates)
// ============================================================================

function UnderstandingStep({
  onBack,
  onValidated,
}: {
  onBack: () => void
  onValidated: () => void
}) {
  const { project, themeUnderstanding, setThemeUnderstanding } = useIrisStore()
  const [loading, setLoading] = React.useState(!themeUnderstanding)
  const [understanding, setUnderstanding] = React.useState<SectionUnderstanding | null>(
    themeUnderstanding || null
  )
  const [error, setError] = React.useState<string | null>(null)

  async function fetchUnderstanding() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/understand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: project.title,
          level: project.level,
          field: project.filiere,
          country: project.country,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const u: SectionUnderstanding = {
        concepts: data.concepts || [],
        keywords: data.keywords || [],
        domain: data.domain || '',
        disciplines: data.disciplines || [],
        similarResearch: data.similarResearch || [],
        applications: data.applications || [],
        limits: data.limits || [],
        summary: data.summary || '',
        validated: false,
      }
      setUnderstanding(u)
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!understanding) fetchUnderstanding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function validate() {
    if (!understanding) return
    const validated = { ...understanding, validated: true }
    setUnderstanding(validated)
    setThemeUnderstanding(validated)
    onValidated()
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
          <Library className="h-3.5 w-3.5" />
          Phase 1 · Compréhension du sujet
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">
          Rimiris analyse votre thème
        </h1>
        <p className="text-sm text-muted-foreground">
          L'agent Chercheur documentaire identifie les concepts clés, le domaine, les disciplines
          concernées et les recherches similaires. Vérifiez que c'est bien ce que vous voulez étudier.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground italic">
            Rimiris analyse votre thème et identifie les concepts clés...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchUnderstanding}>
            Réessayer
          </Button>
        </div>
      )}

      {understanding && !loading && (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Résumé de Rimiris
              </p>
              <p className="text-[15px] leading-relaxed">{understanding.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Concepts clés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {understanding.concepts.map((c, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Mots-clés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {understanding.keywords.map((k, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-full bg-muted text-foreground border border-border"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Domaine scientifique
                </p>
                <p className="text-sm font-medium">{understanding.domain || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Disciplines concernées
                </p>
                <p className="text-sm font-medium">
                  {understanding.disciplines.join(', ') || '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Recherches similaires
                </p>
                <ul className="space-y-1">
                  {understanding.similarResearch.map((r, i) => (
                    <li key={i} className="text-sm flex gap-1.5">
                      <span className="text-primary">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Applications pratiques
                </p>
                <ul className="space-y-1">
                  {understanding.applications.map((a, i) => (
                    <li key={i} className="text-sm flex gap-1.5">
                      <span className="text-emerald-500">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Limites potentielles
                </p>
                <ul className="space-y-1">
                  {understanding.limits.map((l, i) => (
                    <li key={i} className="text-sm flex gap-1.5">
                      <span className="text-amber-500">•</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
            <p className="text-sm font-semibold mb-1">
              Est-ce bien ce que vous souhaitez étudier ?
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Sans validation, impossible de continuer vers la phase suivante.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                onClick={fetchUnderstanding}
                className="rounded-full"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Régénérer l'analyse
              </Button>
              <Button
                onClick={validate}
                className="rounded-full iris-gradient text-white"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Oui, c'est bien mon sujet
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={onBack} className="rounded-full">
          ← Revenir au projet
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// PHASE 2 — Problem building (hypotheses of context)
// ============================================================================

function ProblemBuildStep({
  onBack,
  onDone,
}: {
  onBack: () => void
  onDone: () => void
}) {
  const { project, themeUnderstanding, problemContext, setProblemContext } = useIrisStore()
  const [loading, setLoading] = React.useState(!problemContext?.hypotheses?.length)
  const [reasoning, setReasoning] = React.useState(problemContext?.rationale || '')
  const [hypotheses, setHypotheses] = React.useState<{ id: string; label: string; statement: string; rationale: string; methodologicalConsequence: string }[]>(
    problemContext?.hypotheses?.map((s, i) => ({
      id: `h${i + 1}`,
      label: s.slice(0, 60),
      statement: s,
      rationale: '',
      methodologicalConsequence: '',
    })) || []
  )
  const [selected, setSelected] = React.useState<string | null>(problemContext?.selected || null)
  const [rejected, setRejected] = React.useState<string[]>([])
  const [error, setError] = React.useState<string | null>(null)

  async function fetchHypotheses() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/problem-build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: project.title,
          understanding: themeUnderstanding,
          level: project.level,
          field: project.filiere,
          rejected,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReasoning(data.reasoning || '')
      setHypotheses(data.hypotheses || [])
      setSelected(null)
    } catch (e: any) {
      setError(e.message || 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!hypotheses.length) fetchHypotheses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function chooseHypothesis(h: { id: string; statement: string; rationale: string }) {
    setSelected(h.statement)
    setProblemContext({
      hypotheses: hypotheses.map((x) => x.statement),
      selected: h.statement,
      rationale: h.rationale || reasoning,
    })
    onDone()
  }

  function rejectAll() {
    setRejected((r) => [...r, ...hypotheses.map((h) => h.statement)])
    fetchHypotheses()
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
          <FlaskConical className="h-3.5 w-3.5" />
          Phase 2 · Construction du problème de recherche
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">
          Choisissez l'hypothèse de contexte qui vous correspond
        </h1>
        <p className="text-sm text-muted-foreground">
          Au lieu de vous demander « depuis quand ce problème existe-t-il », Rimiris raisonne à partir
          de votre thème et propose 3 hypothèses argumentées. Choisissez celle qui correspond le
          mieux — vous pourrez la modifier plus tard.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground italic">
            Le Coach méthodologique raisonne sur votre thème...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button size="sm" variant="ghost" onClick={fetchHypotheses}>
            Réessayer
          </Button>
        </div>
      )}

      {!loading && reasoning && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Le raisonnement de Rimiris
          </p>
          <p className="text-sm leading-relaxed">{reasoning}</p>
        </div>
      )}

      {!loading && hypotheses.length > 0 && (
        <div className="space-y-3">
          {hypotheses.map((h, idx) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                'rounded-2xl border-2 bg-card p-5 transition-all cursor-pointer',
                selected === h.statement
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/40'
              )}
              onClick={() => setSelected(h.statement)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm transition-all',
                    selected === h.statement
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  {h.label && (
                    <p className="font-semibold text-sm mb-1">{h.label}</p>
                  )}
                  <p className="text-[15px] leading-relaxed mb-2">{h.statement}</p>
                  {h.rationale && (
                    <p className="text-xs text-muted-foreground italic mb-1">
                      <strong>Pourquoi :</strong> {h.rationale}
                    </p>
                  )}
                  {h.methodologicalConsequence && (
                    <p className="text-xs text-primary">
                      <strong>Conséquence méthodologique :</strong> {h.methodologicalConsequence}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && hypotheses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-2">
          <Button
            variant="ghost"
            onClick={rejectAll}
            className="text-muted-foreground rounded-full"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Aucune ne me convient, propose d'autres hypothèses
          </Button>
          <Button
            onClick={() => {
              const h = hypotheses.find((x) => x.statement === selected)
              if (h) chooseHypothesis(h)
            }}
            disabled={!selected}
            size="lg"
            className="rounded-full iris-gradient text-white"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Valider cette hypothèse et générer le plan
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <div className="flex justify-start pt-2">
        <Button variant="ghost" onClick={onBack} className="rounded-full">
          ← Revenir à la compréhension
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// PHASE — Plan generation
// ============================================================================

function PlanStep() {
  const { project, interviewAnswers, themeUnderstanding, problemContext, proposedPlan, setProposedPlan, acceptPlanAndCreateSections, setView } =
    useIrisStore()
  const [loading, setLoading] = React.useState(!proposedPlan.length)
  const [error, setError] = React.useState<string | null>(null)

  async function fetchPlan() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: interviewAnswers,
          level: project.level,
          understanding: themeUnderstanding,
          problem: problemContext?.selected,
        }),
      })
      const data = await res.json()
      if (Array.isArray(data.sections) && data.sections.length > 0) {
        setProposedPlan(data.sections)
      } else {
        setError("Rimiris n'a pas pu proposer de plan. Réessayez.")
      }
    } catch {
      setError('Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (!proposedPlan.length) fetchPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">
          L'Architecte construit un plan adapté à votre université et votre niveau...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1">{error}</span>
        <Button size="sm" variant="ghost" onClick={fetchPlan}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          Plan proposé par Rimiris
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">
          Voici le plan que je suggère pour votre mémoire
        </h1>
        <p className="text-sm text-muted-foreground">
          Basé sur votre contexte projet, votre thème validé et l'hypothèse retenue.
          Validez pour commencer la rédaction section par section.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Problématique retenue
        </p>
        <p className="text-[15px] leading-relaxed italic">
          « {problemContext?.selected || '(non précisée)'} »
        </p>
      </div>

      <div className="space-y-2">
        {proposedPlan.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-between items-center pt-2">
        <Button
          variant="ghost"
          onClick={fetchPlan}
          className="text-muted-foreground rounded-full"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Demander un autre plan
        </Button>
        <Button
          onClick={() => {
            acceptPlanAndCreateSections()
          }}
          size="lg"
          className="rounded-full iris-gradient text-white"
        >
          <Check className="h-4 w-4 mr-1.5" />
          Valider ce plan et commencer la rédaction
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
