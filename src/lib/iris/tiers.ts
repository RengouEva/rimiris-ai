/**
 * Pricing tiers for Rimiris AI monetization.
 *
 * 2 tiers: Free + Pro.
 * Currency: XAF (Franc CFA). Pricing is per-project (one-time payment),
 * NOT a monthly subscription. A user pays once to unlock full features for
 * one specific project.
 *
 * Default project price: 7 000 XAF (mémoires, thèses, monographies, etc.)
 * Reduced price for shorter documents (dissertations, exposés): 2 000 XAF.
 *
 * Tier capabilities control feature access:
 *  - maxSections               : how many sections the user can create
 *  - maxWordsPerSection        : hard limit per section (humanization + AI)
 *  - maxExportsPerProject      : exports allowed for the unlocked project
 *  - maxAIRequestsPerDay       : daily request cap on AI calls
 *  - features                  : explicit feature flags
 *
 * The admin portal can read conversion rates and tier distribution.
 */

import type { DocumentTypeId } from './document-types'

export type TierId = 'free' | 'pro'

export type TierCapabilities = {
  maxSections: number
  maxWordsPerSection: number
  maxExportsPerProject: number
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
  /** One-time price per project, in XAF. 0 = free. */
  priceXAF: number
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
    priceXAF: 0,
    color: '#64748B',
    description:
      "Idéal pour découvrir Rimiris AI et rédiger un premier brouillon avec l'aide de l'IA.",
    features: [
      '1 projet par compte',
      'Entretien guidé complet',
      '3 sections maximum',
      'Rédaction IA par section (1 500 mots)',
      'Audit de cohérence basique',
      'Export PDF (avec filigrane Rimiris)',
      '2 exports par projet',
    ],
    capabilities: {
      maxSections: 3,
      maxWordsPerSection: 1500,
      maxExportsPerProject: 2,
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
    priceXAF: 7000,
    color: '#145DD6',
    popular: true,
    description:
      "Débloquez un projet complet : mémoire, thèse ou monographie avec toutes les fonctionnalités. Paiement unique, par projet.",
    features: [
      '1 projet débloqué (paiement unique)',
      'Sections illimitées',
      'Rédaction IA par section (4 000 mots)',
      'Anti-plagiat avancé',
      'Audit de cohérence complet',
      'Simulation de soutenance (jury IA)',
      "2 passes d'humanisation",
      'Export PDF / Word / HTML / Markdown (sans filigrane)',
      'Exports illimités',
      'Guide méthodologique personnalisé (UQAC, ENIEG…)',
      'Support par email (48 h)',
    ],
    capabilities: {
      maxSections: 50, // effectively unlimited for the user
      maxWordsPerSection: 4000,
      maxExportsPerProject: 999,
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
}

export const TIER_LIST = Object.values(TIERS)

// ============================================================================
// Document-type-specific pricing (one-time, per project, in XAF)
// ----------------------------------------------------------------------------
// Shorter academic documents (dissertations philosophiques/littéraires,
// exposés/essais courts) are charged at a reduced rate of 2 000 XAF.
// All other document types default to the standard Pro price (7 000 XAF).
// ============================================================================
export const DEFAULT_PROJECT_PRICE_XAF = TIERS.pro.priceXAF // 7 000
export const REDUCED_PROJECT_PRICE_XAF = 2000

export const DOC_TYPE_PRICING: Partial<Record<DocumentTypeId, number>> = {
  // Dissertations (philosophique + littéraire) — 2 000 XAF
  dissertation_philosophique: REDUCED_PROJECT_PRICE_XAF,
  dissertation_litteraire: REDUCED_PROJECT_PRICE_XAF,
  // Exposés / essais courts — 2 000 XAF
  essai_court: REDUCED_PROJECT_PRICE_XAF,
}

/**
 * Returns the one-time project price (in XAF) for a given document type.
 * Falls back to the default Pro price (7 000 XAF) when the document type
 * is not in the reduced-price list.
 */
export function getProjectPrice(docTypeId?: DocumentTypeId | string | null): number {
  if (docTypeId && docTypeId in DOC_TYPE_PRICING) {
    return DOC_TYPE_PRICING[docTypeId as DocumentTypeId]!
  }
  return DEFAULT_PROJECT_PRICE_XAF
}

/** Get a tier by ID, falling back to free. */
export function getTier(id: TierId | string | undefined): Tier {
  if (id && id in TIERS) return TIERS[id as TierId]
  return TIERS.free
}

/**
 * Migration helper: any legacy 'premium' tier value is mapped to 'pro'.
 * The 'premium' tier no longer exists — this prevents broken sessions
 * when a user had previously been promoted to premium.
 */
export function migrateLegacyTier(id: string | undefined): TierId {
  if (id === 'premium') return 'pro'
  if (id && id in TIERS) return id as TierId
  return 'free'
}

/** Format an amount in XAF for display. */
export function formatXAF(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} XAF`
}
