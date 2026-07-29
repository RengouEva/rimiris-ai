'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Sparkles, Zap, ArrowLeft, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { useIrisStore } from '@/store/iris-store'
import {
  TIER_LIST, TIERS, formatXAF,
  REDUCED_PROJECT_PRICE_XAF, type TierId,
} from '@/lib/iris/tiers'
import { getCurrentUser, upgradeToTier, track } from '@/lib/iris/analytics'
import { getCurrentSession } from '@/lib/iris/auth'
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
          onSuccess={async () => {
            await upgradeToTier(upgradeTarget)
            setCurrentUser(getCurrentUser())
            toast.success(`Plan ${TIERS[upgradeTarget].name} activé.`)
            setUpgradeTarget(null)
            setTimeout(() => setView('workspace'), 800)
          }}
        />
      )}
    </div>
  )
}

// ============================================================================
// Upgrade dialog
// ============================================================================
// In demo mode (RIMIRIS_PAYMENT_SECRET not set on the server), the upgrade
// is granted immediately and NO revenue is recorded — neither on the server
// nor in the client's localStorage. The admin panel will show 0 XAF.
//
// When a real payment provider is wired up, replace this dialog with a
// redirect to the provider's hosted checkout (Stripe / FedaPay / Campay).
// The provider's webhook will then call /api/auth/upgrade with a valid
// HMAC payment signature, which the server verifies before recording revenue.
function UpgradeDialog({
  tier, onClose, onSuccess,
}: {
  tier: TierId
  onClose: () => void
  onSuccess: () => void
}) {
  const t = TIERS[tier]
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  // If the user is already authenticated, the server already knows their
  // name + email. We don't ask for them again — and we DON'T ask for a
  // phone number, because no payment is processed in demo mode.
  const session = getCurrentSession()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSuccess()
    } catch (err: any) {
      setError(err?.message || "Échec de l'activation.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${t.color}20`, color: t.color }}>
              <Crown className="h-4 w-4" />
            </div>
            Activer le plan {t.name}
          </DialogTitle>
          <DialogDescription>
            Activation immédiate · Accès à vie pour ce projet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Identity preview (read-only — the server already knows this) */}
          {session && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compte</span>
                <span className="font-medium">{session.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nom</span>
                <span className="font-medium">{session.name}</span>
              </div>
            </div>
          )}

          {/* Honest pricing block — no fake payment fields */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <span className="text-sm text-muted-foreground block">Tarif {t.name}</span>
              <span className="text-xs text-muted-foreground">
                {t.priceXAF === 0 ? 'Gratuit' : 'Paiement unique par projet'}
              </span>
            </div>
            <span className="text-2xl font-bold">{formatXAF(t.priceXAF)}</span>
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs text-amber-800 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Mode démo.</strong> Aucun paiement n'est traité. L'activation est immédiate
              et <strong>aucun revenu fictif n'est enregistré</strong> — le portail admin affiche
              0 XAF jusqu'à l'intégration d'un prestataire de paiement réel
              (Stripe, FedaPay, Campay…).
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading} className="iris-gradient text-white">
              {loading ? 'Activation…' : `Activer ${t.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
