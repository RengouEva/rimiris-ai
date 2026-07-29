/**
 * Pricing tiers for Rimiris AI monetization.
 *
 * 3 tiers: Free, Pro, Premium.
 * Currency: EUR. Prices are monthly.
 *
 * Tier capabilities control feature access:
 *  - maxSections         : how many sections the user can create
 *  - maxWordsPerSection  : hard limit per section (humanization + AI)
 *  - maxExports          : exports per month (PDF, Word, etc.)
 *  - maxAIRequestsPerDay : daily request cap on AI calls
 *  - features            : explicit feature flags
 *
 * The admin portal can override these and read conversion rates.
 */

export type TierId = 'free' | 'pro' | 'premium'

export type TierCapabilities = {
  maxSections: number
  maxWordsPerSection: number
  maxExportsPerMonth: number
  maxAIRequestsPerDay: number
  antiPlagiarism: boolean
  humanizationPasses: number
  coherenceAudit: boolean
  soutenanceSimulation: boolean
  prioritySupport: boolean
  customGuide: boolean
  watermark: boolean
}

export type Tier = {
  id: TierId
  name: string
  tagline: string
  priceMonthly: number
  priceYearly: number // billed yearly, equivalent per-month
  currency: 'EUR'
  color: string // brand color for badges/cards
  popular?: boolean
  description: string
  features: string[]
  capabilities: TierCapabilities
}

export const TIERS: Record<TierId, Tier> = {
  free: {
    id: 'free',
    name: 'Découverte',
    tagline: 'Pour démarrer gratuitement',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'EUR',
    color: '#64748B',
    description:
      "Idéal pour tester Rimiris AI et rédiger un premier mémoire court avec l'aide de l'IA.",
    features: [
      'Entretien guidé complet',
      "Génération d'un plan structuré",
      '3 sections maximum',
      'Rédaction IA par section (1 500 mots)',
      'Audit de cohérence basique',
      'Export PDF (avec filigrane Rimiris)',
      '2 exports par mois',
    ],
    capabilities: {
      maxSections: 3,
      maxWordsPerSection: 1500,
      maxExportsPerMonth: 2,
      maxAIRequestsPerDay: 20,
      antiPlagiarism: false,
      humanizationPasses: 1,
      coherenceAudit: false,
      soutenanceSimulation: false,
      prioritySupport: false,
      customGuide: false,
      watermark: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Pour réussir votre mémoire',
    priceMonthly: 19,
    priceYearly: 15, // ~21% off
    currency: 'EUR',
    color: '#145DD6',
    popular: true,
    description:
      "Tout ce qu'il faut pour rédiger un mémoire complet, le vérifier et préparer la soutenance.",
    features: [
      'Tout le plan Découverte, et en plus :',
      'Sections illimitées',
      'Rédaction IA par section (4 000 mots)',
      'Anti-plagiat avancé',
      'Audit de cohérence complet',
      'Simulation de soutenance (jury IA)',
      '2 passes d\'humanisation',
      'Export PDF / Word / HTML / Markdown (sans filigrane)',
      '20 exports par mois',
      'Guide méthodologique personnalisé (UQAC, ENIEG…)',
      'Support par email (48 h)',
    ],
    capabilities: {
      maxSections: 50, // effectively unlimited for the user
      maxWordsPerSection: 4000,
      maxExportsPerMonth: 20,
      maxAIRequestsPerDay: 150,
      antiPlagiarism: true,
      humanizationPasses: 2,
      coherenceAudit: true,
      soutenanceSimulation: true,
      prioritySupport: false,
      customGuide: true,
      watermark: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    tagline: 'Pour les thèses & professionnels',
    priceMonthly: 39,
    priceYearly: 31, // ~20% off
    currency: 'EUR',
    color: '#6D28D9',
    description:
      'Conçu pour les doctorants, chercheurs et professionnels qui exigent le meilleur.',
    features: [
      'Tout le plan Pro, et en plus :',
      'Sections illimitées',
      'Rédaction IA par section (10 000 mots)',
      '4 passes d\'humanisation avancée',
      'Vérification scientifique des sources',
      'Agents IA spécialisés (jury, comité, relecture)',
      'Exports illimités',
      'Requêtes IA illimitées',
      'Support prioritaire (12 h)',
      'Accès anticipé aux nouveautés',
    ],
    capabilities: {
      maxSections: 999,
      maxWordsPerSection: 10000,
      maxExportsPerMonth: 999,
      maxAIRequestsPerDay: 999,
      antiPlagiarism: true,
      humanizationPasses: 4,
      coherenceAudit: true,
      soutenanceSimulation: true,
      prioritySupport: true,
      customGuide: true,
      watermark: false,
    },
  },
}

export const TIER_LIST = Object.values(TIERS)

/** Get a tier by ID, falling back to free. */
export function getTier(id: TierId | string | undefined): Tier {
  if (id && id in TIERS) return TIERS[id as TierId]
  return TIERS.free
}
