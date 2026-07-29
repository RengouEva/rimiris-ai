'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Sparkles, Zap, ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useIrisStore } from '@/store/iris-store'
import {
  TIER_LIST, TIERS, formatXAF, getProjectPrice,
  REDUCED_PROJECT_PRICE_XAF, type TierId,
} from '@/lib/iris/tiers'
import { getCurrentUser, upgradeToTier, track } from '@/lib/iris/analytics'
import { RimirisLogo } from '@/components/iris/rimiris-logo'
import { ImmersiveBackground } from '@/components/iris/immersive-background'
import { toast } from 'sonner'

const ICONS: Record<TierId, any> = {
  free: Sparkles,
  pro: Zap,
}

export function PricingView() {
  const { setView } = useIrisStore()
  const [upgradeTarget, setUpgradeTarget] = React.useState<TierId | null>(null)
  const [currentUser, setCurrentUser] = React.useState(getCurrentUser())

  // Reload current user when dialog closes
  React.useEffect(() => {
    if (upgradeTarget === null) setCurrentUser(getCurrentUser())
  }, [upgradeTarget])

  function handleUpgrade(tier: TierId) {
    track('upgrade_click', { tier })
    setUpgradeTarget(tier)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ImmersiveBackground />

      <header className="relative z-10 border-b border-border/40 backdrop-blur-sm bg-background/60 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setView('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <RimirisLogo size="lg" withWordmark />
          <div className="w-20" />
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-4">
            <Crown className="h-3.5 w-3.5" />
            Tarifs Rimiris AI
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Choisissez votre plan.
            <br />
            <span className="iris-gradient-text">Rédigez sans limites.</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Commencez gratuitement. Passez à Pro quand vous êtes prêt — paiement unique par projet.
          </p>
        </motion.div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {TIER_LIST.map((t, idx) => {
            const Icon = ICONS[t.id]
            const isCurrent = currentUser.tier === t.id
            const isPopular = t.popular

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx }}
              >
                <Card
                  className={`relative p-6 h-full flex flex-col ${
                    isPopular
                      ? 'border-primary shadow-lg shadow-primary/10'
                      : 'border-border'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="iris-gradient text-white border-0">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Le plus populaire
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${t.color}20`, color: t.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold">{t.name}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{t.tagline}</p>

                  <div className="mb-4">
                    {t.priceXAF === 0 ? (
                      <span className="text-4xl font-bold">Gratuit</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">{formatXAF(t.priceXAF)}</span>
                        <span className="text-sm text-muted-foreground"> / projet</span>
                      </>
                    )}
                    {t.priceXAF > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Paiement unique · Pas d'abonnement
                      </p>
                    )}
                  </div>

                  <Button
                    disabled={isCurrent}
                    onClick={() => t.id === 'free' ? setView('onboarding') : handleUpgrade(t.id)}
                    className={`w-full mb-6 ${isCurrent ? '' : isPopular ? 'iris-gradient text-white' : ''}`}
                    variant={isCurrent ? 'outline' : isPopular ? 'default' : 'outline'}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Plan actuel
                      </>
                    ) : t.id === 'free' ? (
                      'Commencer gratuitement'
                    ) : (
                      `Passer à ${t.name}`
                    )}
                  </Button>

                  <ul className="space-y-2.5 text-sm flex-1">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className={i === 0 && t.id !== 'free' ? 'font-semibold' : ''}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Reduced pricing note for dissertations / exposés */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 max-w-4xl mx-auto p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-center"
        >
          <p>
            <span className="font-semibold text-primary">Dissertations et exposés :</span>{' '}
            tarif réduit à <span className="font-semibold">{formatXAF(REDUCED_PROJECT_PRICE_XAF)} par projet</span>{' '}
            (dissertation philosophique, dissertation littéraire, essai court / exposé).
            Le tarif standard de {formatXAF(TIERS.pro.priceXAF)} s'applique aux mémoires, thèses et monographies.
          </p>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Paiements sécurisés · Facture par email · Aucune carte requise pour l'essai gratuit
        </p>
      </main>

      {upgradeTarget && (
        <UpgradeDialog
          tier={upgradeTarget}
          onClose={() => setUpgradeTarget(null)}
          onSuccess={(name, email) => {
            upgradeToTier(upgradeTarget, email, name)
            setCurrentUser(getCurrentUser())
            toast.success(`Bienvenue dans le plan ${TIERS[upgradeTarget].name} ! 🎉`)
            setUpgradeTarget(null)
            setTimeout(() => setView('workspace'), 1500)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Upgrade dialog (simulated payment — replace with real provider in production)
// ============================================================================
function UpgradeDialog({
  tier, onClose, onSuccess,
}: {
  tier: TierId
  onClose: () => void
  onSuccess: (name: string, email: string) => void
}) {
  const t = TIERS[tier]
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulate network delay
    setTimeout(() => {
      setLoading(false)
      onSuccess(name, email)
    }, 1200)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${t.color}20`, color: t.color }}>
              <Crown className="h-4 w-4" />
            </div>
            Passer à {t.name}
          </DialogTitle>
          <DialogDescription>
            Paiement unique par projet · Accès à vie pour ce projet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Martin" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah.martin@univ.fr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <span className="flex items-center gap-2">
                <Lock className="h-3 w-3" />
                Numéro Mobile Money (simulation)
              </span>
            </Label>
            <Input
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
            />
            <p className="text-xs text-muted-foreground">
              Mode démo — aucun paiement réel ne sera effectué. Saisissez n'importe quel numéro.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Total (paiement unique)</span>
            <span className="text-2xl font-bold">{formatXAF(t.priceXAF)}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading} className="iris-gradient text-white">
              {loading ? 'Traitement…' : `Payer et activer ${t.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
