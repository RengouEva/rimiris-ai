'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { useIrisStore, type ViewMode } from '@/store/iris-store'
import { WelcomeScreen } from '@/components/iris/welcome-screen'
import { OnboardingInterview } from '@/components/iris/onboarding-interview'
import { Sidebar } from '@/components/iris/sidebar'
import { Header } from '@/components/iris/header'
import { Workspace } from '@/components/iris/workspace'
import { CoherenceView } from '@/components/iris/coherence-view'
import { SoutenanceView } from '@/components/iris/soutenance-view'
import { SimulationView } from '@/components/iris/simulation-view'
import { PlagiarismView } from '@/components/iris/plagiarism-view'
import { ExportView } from '@/components/iris/export-view'
import { AgentsView } from '@/components/iris/agents-view'
import { AuditView } from '@/components/iris/audit-view'
import { GuideView } from '@/components/iris/guide-view'
import { AdminPortal } from '@/components/admin/admin-portal'
import { PricingView } from '@/components/monetization/pricing-view'
import { AuthGate } from '@/components/auth/auth-gate'

// Valid view IDs that can be passed via ?view= for PWA shortcuts.
const VALID_VIEWS: ViewMode[] = [
  'workspace',
  'guide',
  'audit',
  'coherence',
  'soutenance',
  'simulation',
  'plagiarism',
  'export',
  'agents',
  'admin',
  'pricing',
]

// Maps the ?payment=… query param (set by /api/payment/success) to a Sonner
// toast that confirms the checkout outcome to the user.
function showPaymentToast(params: URLSearchParams) {
  const status = params.get('payment')
  if (!status) return
  const tier = params.get('tier') // 'pro' | undefined
  const reason = params.get('reason') // failure reason, optional
  const ref = params.get('ref') // pending reference, optional

  // Small delay so the toast mounts after the page is interactive.
  const fire = (fn: () => void) => setTimeout(fn, 350)

  switch (status) {
    case 'success':
      fire(() =>
        toast.success(
          tier === 'pro'
            ? 'Bienvenue dans Rimiris Pro'
            : 'Paiement confirmé',
          {
            description:
              tier === 'pro'
                ? 'Toutes les fonctionnalités Pro sont déverrouillées pour ce projet. Bonne rédaction !'
                : 'Votre paiement a été enregistré. Vous pouvez continuer.',
            duration: 7000,
          },
        ),
      )
      break
    case 'processing':
      fire(() =>
        toast.info('Paiement en cours de traitement', {
          description: ref
            ? `Référence ${ref}. Le prestataire confirme la transaction — votre compte sera crédité sous quelques minutes.`
            : 'Le prestataire confirme la transaction — votre compte sera crédité sous quelques minutes.',
          duration: 8000,
        }),
      )
      break
    case 'failed':
      fire(() =>
        toast.error('Échec du paiement', {
          description: reason
            ? `Cause : ${decodeURIComponent(reason)}. Aucun montant n’a été débité. Vous pouvez réessayer.`
            : 'La transaction a été refusée. Aucun montant n’a été débité. Vous pouvez réessayer.',
          duration: 9000,
        }),
      )
      break
    case 'cancelled':
      fire(() =>
        toast.warning('Paiement annulé', {
          description:
            'Vous avez abandonné le checkout. Aucun montant n’a été débité. Vous pouvez réessayer quand vous voulez.',
          duration: 7000,
        }),
      )
      break
    case 'auth_required':
      fire(() =>
        toast.error('Session expirée', {
          description:
            'Votre session a expiré pendant le checkout. Reconnectez-vous pour réessayer.',
          duration: 7000,
        }),
      )
      break
    case 'forbidden':
      fire(() =>
        toast.error('Accès refusé', {
          description:
            'Ce paiement ne correspond pas à votre compte. Contactez le support si vous pensez à une erreur.',
          duration: 8000,
        }),
      )
      break
    case 'no_ref':
    case 'not_found':
      fire(() =>
        toast.error('Référence de paiement introuvable', {
          description:
            'Le lien de retour ne contenait pas de référence valide. Si le paiement a réussi, contactez le support avec votre reçu.',
          duration: 9000,
        }),
      )
      break
    default:
      fire(() =>
        toast.message('Retour de paiement', {
          description: `Statut : ${status}`,
          duration: 6000,
        }),
      )
  }
}

export default function Home() {
  const { view, projectInitialized, setView } = useIrisStore()

  // Honor ?view=... from PWA shortcuts (only if the project is initialized).
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!projectInitialized) return
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('view') as ViewMode | null
    if (requested && VALID_VIEWS.includes(requested)) {
      setView(requested)
      // Clean up the URL so a refresh doesn't keep jumping to that view.
      const url = new URL(window.location.href)
      url.searchParams.delete('view')
      window.history.replaceState({}, '', url.toString())
    }
  }, [projectInitialized, setView])

  // ?payment=success|processing|failed|cancelled|... set by /api/payment/success
  // after the user comes back from the provider's hosted checkout.
  // We show a single confirmation toast, then strip the params so a refresh
  // doesn't replay it.
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.has('payment')) return
    showPaymentToast(params)
    // Clean up — also redirects the user to the pricing view if they had no
    // active project (so the toast shows in context, not on the marketing page).
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    url.searchParams.delete('tier')
    url.searchParams.delete('reason')
    url.searchParams.delete('ref')
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Full-screen views (no app shell)
  // The WelcomeScreen (landing page) is public — no auth required.
  // Everything past the landing (onboarding + workspace + admin + pricing)
  // requires a logged-in account, enforced by <AuthGate>.
  if (view === 'welcome' || (!projectInitialized && view !== 'onboarding')) {
    return <WelcomeScreen />
  }

  // Auth-gated: onboarding interview + app shell.
  return (
    <AuthGate>
      <AuthedApp view={view} />
    </AuthGate>
  )
}

function AuthedApp({ view }: { view: ViewMode }) {
  if (view === 'onboarding') {
    return <OnboardingInterview />
  }

  // App shell (workspace + nav views).
  // Using min-h-[100dvh] for mobile-friendly dynamic viewport height
  // (accounts for iOS Safari's URL bar that grows/shrinks).
  return (
    <div className="min-h-[100dvh] flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 min-h-0">
          {view === 'workspace' && <Workspace />}
          {view === 'guide' && <GuideView />}
          {view === 'audit' && <AuditView />}
          {view === 'coherence' && <CoherenceView />}
          {view === 'soutenance' && <SoutenanceView />}
          {view === 'simulation' && <SimulationView />}
          {view === 'plagiarism' && <PlagiarismView />}
          {view === 'export' && <ExportView />}
          {view === 'agents' && <AgentsView />}
          {view === 'admin' && <AdminPortal />}
          {view === 'pricing' && <PricingView />}
        </main>
      </div>
    </div>
  )
}
