'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  Building2,
  BookMarked,
  FileText,
  Sparkles,
  Lightbulb,
  Loader2,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ThemeToggle } from './theme-toggle'

const STEPS = [
  { id: 0, title: 'Établissement', icon: Building2 },
  { id: 1, title: 'Niveau & filière', icon: GraduationCap },
  { id: 2, title: 'Thématique', icon: BookMarked },
  { id: 3, title: 'Normes & encadrement', icon: FileText },
  { id: 4, title: 'Sujet & validation', icon: Lightbulb },
]

const NORMS = ['APA', 'Vancouver', 'IEEE', 'ISO 690', 'Harvard'] as const
const LEVELS = ['Licence', 'Master', 'Doctorat'] as const
const LANGUAGES = ['Français', 'English', 'Español', 'Português', 'Deutsch', 'العربية'] as const

export function OnboardingWizard() {
  const { project, updateProject, completeOnboarding, setView } = useIrisStore()
  const [step, setStep] = React.useState(0)
  const [subjectsLoading, setSubjectsLoading] = React.useState(false)
  const [subjectsResult, setSubjectsResult] = React.useState<string | null>(null)
  const [keywords, setKeywords] = React.useState('')

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const canNext = () => {
    switch (step) {
      case 0:
        return project.university.trim() && project.country.trim()
      case 1:
        return project.level && project.filiere.trim()
      case 2:
        return project.theme.trim()
      default:
        return true
    }
  }

  async function generateSubjects() {
    setSubjectsLoading(true)
    setSubjectsResult(null)
    try {
      const res = await fetch('/api/ai/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project, keywords }),
      })
      const data = await res.json()
      setSubjectsResult(data.reply || 'Aucune proposition pour le moment.')
    } catch (err) {
      toast.error("Erreur lors de la génération des sujets")
      setSubjectsResult("Impossible de générer des sujets pour le moment. Vous pouvez saisir votre sujet manuellement.")
    } finally {
      setSubjectsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl iris-gradient flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-none">IRIS</p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Nouveau mémoire</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('welcome')}
              className="text-muted-foreground"
            >
              Annuler
            </Button>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-border/40 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => {
              const Icon = s.icon
              const done = idx < step
              const active = idx === step
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => idx < step && setStep(idx)}
                    className="flex flex-col items-center gap-1.5 group"
                    disabled={idx > step}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        done
                          ? 'bg-primary border-primary text-primary-foreground'
                          : active
                          ? 'border-primary text-primary iris-glow'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {done ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={`text-xs hidden sm:block ${
                        active ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                        idx < step ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Votre établissement</h2>
                  <p className="text-muted-foreground text-sm">
                    Ces informations permettent à IRIS d'adapter ses conseils à votre contexte académique.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="university">Université *</Label>
                    <Input
                      id="university"
                      value={project.university}
                      onChange={(e) => updateProject({ university: e.target.value })}
                      placeholder="Ex : Université de Yaoundé I"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty">Faculté</Label>
                    <Input
                      id="faculty"
                      value={project.faculty}
                      onChange={(e) => updateProject({ faculty: e.target.value })}
                      placeholder="Ex : FSEG"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Département</Label>
                    <Input
                      id="department"
                      value={project.department}
                      onChange={(e) => updateProject({ department: e.target.value })}
                      placeholder="Ex : Management"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays *</Label>
                    <Input
                      id="country"
                      value={project.country}
                      onChange={(e) => updateProject({ country: e.target.value })}
                      placeholder="Ex : Cameroun"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Langue de rédaction</Label>
                    <Select
                      value={project.language}
                      onValueChange={(v) => updateProject({ language: v })}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Niveau d'études & filière</h2>
                  <p className="text-muted-foreground text-sm">
                    Le niveau détermine le style de rédaction et l'exigence académique attendus.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Niveau *</Label>
                  <RadioGroup
                    value={project.level}
                    onValueChange={(v) => updateProject({ level: v as any })}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    {LEVELS.map((lvl) => (
                      <Label
                        key={lvl}
                        htmlFor={`lvl-${lvl}`}
                        className={`flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          project.level === lvl
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{lvl}</span>
                          <RadioGroupItem value={lvl} id={`lvl-${lvl}`} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {lvl === 'Licence' && 'Clarté, rigueur, structuration'}
                          {lvl === 'Master' && 'Analyse, synthèse, esprit critique'}
                          {lvl === 'Doctorat' && 'Contribution originale, théorisation'}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filiere">Filière / Spécialité *</Label>
                  <Input
                    id="filiere"
                    value={project.filiere}
                    onChange={(e) => updateProject({ filiere: e.target.value })}
                    placeholder="Ex : Gestion financière, Informatique, Sociologie..."
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Thématique de recherche</h2>
                  <p className="text-muted-foreground text-sm">
                    Décrivez le thème général qui vous intéresse. IRIS vous aidera à le préciser.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Thème du mémoire *</Label>
                  <Textarea
                    id="theme"
                    value={project.theme}
                    onChange={(e) => updateProject({ theme: e.target.value })}
                    placeholder="Ex : L'impact du numérique sur la gestion des PME en Afrique centrale. Décrivez en 2-3 phrases le domaine qui vous intéresse."
                    className="min-h-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entreprise">Entreprise / terrain de stage (optionnel)</Label>
                  <Input
                    id="entreprise"
                    value={project.entreprise}
                    onChange={(e) => updateProject({ entreprise: e.target.value })}
                    placeholder="Ex : MTN Cameroun, Ministère des Finances, ONG..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Si votre mémoire s'appuie sur un terrain ou une organisation, indiquez-le ici.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Normes & encadrement</h2>
                  <p className="text-muted-foreground text-sm">
                    Indiquez la norme bibliographique exigée par votre établissement.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Norme de citation</Label>
                  <RadioGroup
                    value={project.norme}
                    onValueChange={(v) => updateProject({ norme: v as any })}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {NORMS.map((n) => (
                      <Label
                        key={n}
                        htmlFor={`norm-${n}`}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          project.norme === n
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <span className="font-medium">{n}</span>
                        <RadioGroupItem value={n} id={`norm-${n}`} />
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="directeur">Directeur de mémoire (optionnel)</Label>
                  <Input
                    id="directeur"
                    value={project.directeur}
                    onChange={(e) => updateProject({ directeur: e.target.value })}
                    placeholder="Ex : Pr. Jean-Paul Kamga"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Sujet & validation</h2>
                  <p className="text-muted-foreground text-sm">
                    IRIS peut vous proposer des sujets pertinents, ou vous pouvez saisir le vôtre.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Mots-clés additionnels (optionnel)</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Ex : fintech, inclusion financière, mobile money"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={generateSubjects}
                    disabled={subjectsLoading}
                    className="iris-gradient text-white rounded-xl"
                  >
                    {subjectsLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Proposer 5 sujets
                      </>
                    )}
                  </Button>
                </div>

                {subjectsResult && (
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Propositions de sujets</span>
                        <Badge variant="secondary" className="text-xs ml-auto">IA</Badge>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap">
                        {subjectsResult}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="title">Titre de votre mémoire</Label>
                  <Input
                    id="title"
                    value={project.title}
                    onChange={(e) => updateProject({ title: e.target.value })}
                    placeholder="Saisissez le titre définitif (vous pourrez le modifier plus tard)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Choisissez un sujet parmi les propositions ci-dessus, ou formulez le vôtre. Vous
                    pourrez l'affiner avec l'agent "Directeur de mémoire" une fois dans la plateforme.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer nav */}
      <footer className="border-t border-border/40 bg-background/60 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prev}
            disabled={step === 0}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          <div className="text-xs text-muted-foreground">
            Étape {step + 1} sur {STEPS.length}
          </div>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={next}
              disabled={!canNext()}
              className="rounded-full"
            >
              Suivant
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                completeOnboarding()
                toast.success("Bienvenue ! Votre mémoire est prêt à être rédigé.")
              }}
              className="rounded-full iris-gradient text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Démarrer
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
