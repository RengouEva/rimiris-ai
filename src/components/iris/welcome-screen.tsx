'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  PenLine,
  Library,
  ShieldCheck,
  Presentation,
  Lightbulb,
  Layers,
  Bot,
  FileText,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'
import { QuickStart } from './quick-start'

export function WelcomeScreen() {
  const { setView, projectInitialized, project } = useIrisStore()
  const [quickStartOpen, setQuickStartOpen] = React.useState(false)

  function handleStart() {
    if (projectInitialized) {
      setView('workspace')
    } else {
      setQuickStartOpen(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <header className="border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl iris-gradient flex items-center justify-center iris-glow">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-none">IRIS</p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">Thesis AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {projectInitialized && (
              <Button
                onClick={() => setView('workspace')}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Reprendre
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Votre directeur de mémoire virtuel
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
            Écrivez votre mémoire.
            <br />
            <span className="iris-gradient-text">Pas à ma place, avec moi.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            IRIS vous laisse créer votre propre structure. Pas de chapitres imposés.
            Écrivez comme vous pensez, demandez de l'aide quand vous bloquez.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              size="lg"
              onClick={handleStart}
              className="rounded-full px-8 h-12 text-base iris-gradient text-white hover:opacity-90"
            >
              {projectInitialized ? 'Reprendre mon mémoire' : 'Commencer à écrire'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {projectInitialized && project.title ? `« ${project.title} »` : 'Aucune inscription. Gratuit.'}
            </span>
          </div>
        </motion.div>

        {/* Key principles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          {[
            {
              icon: PenLine,
              title: 'Vous créez votre structure',
              desc: "Ajoutez, renommez, réordonnez vos sections comme vous voulez. Le template académique est disponible si vous le souhaitez, mais jamais imposé.",
            },
            {
              icon: Lightbulb,
              title: 'Aide contextuelle sur demande',
              desc: "Un bouton « Demander à IRIS » ou « Je suis bloqué » à portée de clic. L'IA connaît votre titre, votre niveau et ce que vous avez déjà écrit.",
            },
            {
              icon: ShieldCheck,
              title: 'Cohérence et soutenance',
              desc: "Quand vous êtes prêt, IRIS vérifie la cohérence globale et génère votre kit de soutenance : résumé, plan, questions du jury.",
            },
          ].map((feat, idx) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold mb-1.5">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { icon: FileText, label: '1. Donnez un titre', desc: 'Une seule question' },
              { icon: Layers, label: '2. Créez vos sections', desc: 'Ou importez le template' },
              { icon: PenLine, label: '3. Écrivez', desc: 'IRIS à côté quand besoin' },
              { icon: Presentation, label: '4. Préparez la soutenance', desc: 'Résumé, jury, PPT' },
            ].map((step, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-muted/30"
              >
                <step.icon className="h-6 w-6 text-primary" />
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Philosophy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-10 text-center"
        >
          <p className="text-base text-muted-foreground italic max-w-3xl mx-auto">
            « L'IA ne fait jamais le travail à la place de l'étudiant. Elle travaille AVEC lui. »
          </p>
        </motion.div>
      </main>

      <footer className="border-t border-border/40 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-muted-foreground">
          IRIS Thesis AI — Plateforme d'accompagnement à la rédaction académique
        </div>
      </footer>

      <QuickStart open={quickStartOpen} onOpenChange={setQuickStartOpen} />
    </div>
  )
}
