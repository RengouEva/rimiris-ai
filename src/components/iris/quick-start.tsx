'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Sparkles, ArrowRight, X, Lightbulb } from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

interface QuickStartProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SUGGESTIONS = [
  "L'impact du numérique sur les PME en Afrique",
  "Santé mentale et télétravail post-Covid",
  "Transition écologique et comportements citoyens",
  "IA générative et apprentissage universitaire",
]

export function QuickStart({ open, onOpenChange }: QuickStartProps) {
  const { completeQuickStart, project, updateProject } = useIrisStore()
  const [title, setTitle] = React.useState('')
  const [level, setLevel] = React.useState<'Licence' | 'Master' | 'Doctorat'>('Master')

  React.useEffect(() => {
    if (open) {
      setTitle(project.title || '')
      setLevel(project.level || 'Master')
    }
  }, [open])

  function handleSubmit() {
    if (!title.trim()) return
    updateProject({ level })
    completeQuickStart(title.trim(), level)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Démarrer un mémoire</DialogTitle>

        {/* Header gradient */}
        <div className="iris-gradient p-6 text-white relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-6 w-6" />
            <span className="text-sm font-medium opacity-90">Nouveau mémoire</span>
          </div>
          <h2 className="text-2xl font-bold">Comment s'appelle votre mémoire ?</h2>
          <p className="text-sm opacity-90 mt-1">
            Donnez juste un titre. Tout le reste, vous le construirez au fur et à mesure.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Titre de votre mémoire</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : L'impact du télétravail sur la productivité"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) handleSubmit()
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Niveau</Label>
            <RadioGroup
              value={level}
              onValueChange={(v) => setLevel(v as any)}
              className="grid grid-cols-3 gap-2"
            >
              {(['Licence', 'Master', 'Doctorat'] as const).map((lvl) => (
                <Label
                  key={lvl}
                  htmlFor={`qs-${lvl}`}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    level === lvl
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span className="text-sm font-semibold">{lvl}</span>
                  <RadioGroupItem value={lvl} id={`qs-${lvl}`} className="sr-only" />
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              Besoin d'inspiration ?
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setTitle(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Vous pourrez tout modifier ensuite.
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="iris-gradient text-white rounded-full"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Commencer à écrire
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
