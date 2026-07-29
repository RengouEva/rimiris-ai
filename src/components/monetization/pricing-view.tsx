'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Sparkles, Zap, ArrowLeft, Lock, CreditCard, ShieldCheck, Zap as ZapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  const [paymentHealth, setPaymentHealth] = React.useState<{
    enabled: boolean
    provider?: { id: string; name: string; tagline: string; region: string; supportsXAF: boolean; supportsMobileMoneyPush: boolean }
    mode?: 'test' | 'live'
  } | null>(null)

  // Fetch the active payment provider on mount — shows a dynamic badge
  React.useEffect(() => {
    fetch('/api/payment/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setPaymentHealth(data))
      .catch(() => setPaymentHealth({ enabled: false }))
  }, [])

  // Reload current user when dialog closes
  React.useEffect(() => {
    if (upgradeTarget === null) setCurrentUser(getCurrentUser())
  }, [upgradeTarget])

  async function handleUpgrade(tier: TierId) {
    track('upgrade_click', { tier })
    // If payment is enabled, redirect to the initiate endpoint (server will
    // build the provider's checkout URL and redirect the browser).
    if (paymentHealth?.enabled && paymentHealth.provider) {
      // For Campay (Mobile Money push), we need the phone number first.
      // For all others, redirect immediately.
      if (paymentHealth.provider.id === 'campay') {
        setUpgradeTarget(tier) // show the phone-input dialog
      } else {
        // Immediate redirect — server returns the provider's checkout URL
        const url = `/api/payment/initiate?tier=${tier}`
        window.location.href = url
      }
      return
    }
    // Demo mode (no payment provider configured) — show the legacy dialog
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

          {/* Dynamic payment provider badge */}
          {paymentHealth && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex justify-center"
            >
              {paymentHealth.enabled ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Paiement sécurisé par {paymentHealth.provider?.name}
                  {paymentHealth.provider?.supportsMobileMoneyPush && (
                    <>
                      <span className="opacity-50">·</span>
                      <ZapIcon className="h-3.5 w-3.5" />
                      Mobile Money
                    </>
                  )}
                  <span className="opacity-50">·</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-200 text-emerald-700">
                    {paymentHealth.mode === 'test' ? 'Mode test' : 'Mode production'}
                  </Badge>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium">
                  <Lock className="h-3.5 w-3.5" />
                  Mode démo — aucun paiement réel traité
                </div>
              )}
            </motion.div>
          )}
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
          paymentHealth={paymentHealth}
          onClose={() => setUpgradeTarget(null)}
          onSuccess={async () => {
            // Demo-mode fallback only — real payments are fulfilled server-side
            // via webhook, so this path is only taken when no provider is set.
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
  tier, onClose, onSuccess, paymentHealth,
}: {
  tier: TierId
  onClose: () => void
  onSuccess: () => void
  paymentHealth: {
    enabled: boolean
    provider?: { id: string; name: string; tagline: string; region: string; supportsXAF: boolean; supportsMobileMoneyPush: boolean }
    mode?: 'test' | 'live'
  } | null
}) {
  const t = TIERS[tier]
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [phone, setPhone] = React.useState('')

  const session = getCurrentSession()

  // Detect mode: if payment is enabled AND provider is campay, we need
  // to ask for the phone number (Mobile Money push). If payment is enabled
  // but provider is NOT campay, the parent already redirected — we should
  // never be in this dialog for non-campay providers. If payment is NOT
  // enabled, we're in demo mode and just call onSuccess (legacy).
  const isCampayPush = paymentHealth?.enabled && paymentHealth.provider?.id === 'campay'
  const isDemo = !paymentHealth?.enabled

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isCampayPush) {
        // Validate phone (basic — server will validate more strictly)
        const trimmed = phone.trim()
        if (!trimmed || trimmed.length < 8) {
          setError('Numéro Mobile Money invalide.')
          setLoading(false)
          return
        }
        // Redirect to the initiate endpoint with the phone number
        window.location.href = `/api/payment/initiate?tier=${tier}&phone=${encodeURIComponent(trimmed)}`
        return
      }
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

          {/* Campay phone input — shown only when provider is campay */}
          {isCampayPush && (
            <div className="space-y-2">
              <label className="text-sm font-medium block">
                Numéro Mobile Money
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                required
              />
              <p className="text-xs text-muted-foreground">
                Un push Mobile Money sera envoyé sur ce numéro (MTN ou Orange).
                Vous devrez valider avec votre code secret.
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs text-amber-800 flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <p>
              {isCampayPush ? (
                <>
                  <strong>Push Mobile Money.</strong> Vous allez recevoir une
                  demande de paiement sur votre téléphone. Validez avec votre code
                  secret Mobile Money. Le plan sera activé automatiquement après
                  confirmation — vous n'avez rien d'autre à faire.
                </>
              ) : isDemo ? (
                <>
                  <strong>Mode démo.</strong> Aucun paiement n'est traité. L'activation est immédiate
                  et <strong>aucun revenu fictif n'est enregistré</strong> — le portail admin affiche
                  0 XAF jusqu'à l'intégration d'un prestataire de paiement réel
                  (Stripe, FedaPay, Campay…).
                </>
              ) : (
                <>Vous allez être redirigé vers le prestataire de paiement.</>
              )}
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
              {loading
                ? (isCampayPush ? 'Envoi du push…' : 'Activation…')
                : isCampayPush
                ? `Envoyer le push Mobile Money`
                : `Activer ${t.name}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
