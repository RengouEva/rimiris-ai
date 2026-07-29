'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User as UserIcon, ArrowRight, LogIn, UserPlus, Crown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RimirisLogo } from '@/components/iris/rimiris-logo'
import { ImmersiveBackground } from '@/components/iris/immersive-background'
import { ThemeToggle } from '@/components/iris/theme-toggle'
import { signIn, signUp, ADMIN_EMAIL } from '@/lib/iris/auth'
import { toast } from 'sonner'

type Mode = 'signin' | 'signup'

export function LoginScreen() {
  const [mode, setMode] = React.useState<Mode>('signin')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name)
      if (!res.ok) {
        setError(res.error)
      } else {
        const isAdmin = res.session.email === ADMIN_EMAIL
        toast.success(
          isAdmin
            ? `Bienvenue, ${res.session.name} — accès super administrateur accordé.`
            : `Bienvenue, ${res.session.name} !`
        )
        // AuthGate will re-render automatically via the subscriber.
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ImmersiveBackground />

      <header className="relative z-10 border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <RimirisLogo size="lg" withWordmark />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 border-primary/20 shadow-xl">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <RimirisLogo size="xl" glow />
              <h1 className="text-2xl font-bold mt-4">
                {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === 'signin'
                  ? 'Accédez à votre mémoire et à vos projets.'
                  : 'Rejoignez Rimiris AI pour rédiger votre mémoire.'}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted mb-6">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError('') }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'signin' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError('') }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'signup' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                Inscription
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name">Nom complet</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Sarah Martin"
                        className="pl-10"
                        required
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@universite.fr"
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Au moins 6 caractères' : '••••••••'}
                    className="pl-10"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md"
                >
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full iris-gradient text-white h-11"
              >
                {loading ? (
                  'Chargement…'
                ) : (
                  <>
                    {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Admin hint */}
            {mode === 'signup' && (
              <div className="mt-5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-start gap-2">
                <Crown className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p>
                  L'email <code className="bg-muted px-1 py-0.5 rounded">{ADMIN_EMAIL}</code> est
                  automatiquement promu <strong>super administrateur</strong> avec accès Premium
                  (toutes les fonctionnalités + portail CRM).
                </p>
              </div>
            )}

            <p className="mt-5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Vos identifiants restent dans votre navigateur (SHA-256 + sel).
            </p>
          </Card>
        </motion.div>
      </main>
    </div>
  )
}
