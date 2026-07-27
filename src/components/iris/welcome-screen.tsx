'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  Brain,
  MessagesSquare,
  FileText,
  Presentation,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './theme-toggle'

export function WelcomeScreen() {
  const setView = useIrisStore((s) => s.setView)
  const projectInitialized = useIrisStore((s) => s.projectInitialized)

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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
                onClick={() => setView('dashboard')}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Reprendre mon mémoire
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Votre directeur de mémoire virtuel
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
            De l'idée de recherche
            <br />
            <span className="iris-gradient-text">jusqu'à la soutenance.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            IRIS Thesis AI vous accompagne à chaque étape de votre mémoire : choix du sujet,
            problématique, méthodologie, rédaction, vérification de cohérence et préparation à la
            soutenance. Vous ne serez jamais bloqué.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              size="lg"
              onClick={() => setView('onboarding')}
              className="rounded-full px-8 h-12 text-base iris-gradient text-white hover:opacity-90 transition-opacity"
            >
              {projectInitialized ? 'Démarrer un nouveau mémoire' : 'Commencer mon mémoire'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            {projectInitialized && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('dashboard')}
                className="rounded-full px-8 h-12 text-base"
              >
                Reprendre où j'en étais
              </Button>
            )}
          </div>
        </motion.div>

        {/* Key features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16"
        >
          {[
            {
              icon: Brain,
              title: '10 agents IA spécialisés',
              desc: 'Directeur, méthodologie, rédaction, bibliographie, citations, statistiques, correction, mise en forme, soutenance, qualité.',
            },
            {
              icon: MessagesSquare,
              title: 'Dialogue intelligent',
              desc: "L'IA pose les bonnes questions, propose des formulations adaptées et construit chaque chapitre AVEC vous.",
            },
            {
              icon: ShieldCheck,
              title: 'Cohérence garantie',
              desc: "Aucune contradiction entre titre, problématique, objectifs, hypothèses, méthodologie et conclusion.",
            },
            {
              icon: Presentation,
              title: 'Soutenance préparée',
              desc: "Résumé, plan de présentation, questions probables du jury et simulation orale générés automatiquement.",
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

        {/* Chapters preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
            15 chapitres accompagnés
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Chaque partie du mémoire a son propre expert IA
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: Lightbulb, label: 'Sujet' },
              { icon: BookOpen, label: 'Introduction' },
              { icon: Target, label: 'Problématique' },
              { icon: FileText, label: 'Méthodologie' },
              { icon: Presentation, label: 'Soutenance' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Philosophy */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-center"
        >
          <p className="text-base text-muted-foreground italic max-w-3xl mx-auto">
            « L'IA ne fait jamais le travail à la place de l'étudiant. Elle travaille AVEC lui. »
          </p>
          <p className="text-xs text-muted-foreground mt-2">— Philosophie IRIS Thesis AI</p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          IRIS Thesis AI — Plateforme d'accompagnement à la rédaction académique
        </div>
      </footer>
    </div>
  )
}
