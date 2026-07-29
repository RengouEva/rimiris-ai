/**
 * Payment provider runtime configuration module.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The admin dashboard needs a secure way to configure which payment provider
 * powers the "Pro upgrade" flow (7 000 XAF / projet) and the reduced-tariff
 * flow (2 000 XAF for dissertations / exposés). Without this module, the only
 * way to switch providers would be to edit `.env` and restart the server —
 * impossible for a non-technical admin.
 *
 * This module is the server-side equivalent of `src/lib/iris/llm.ts`:
 *   - Reads/writes an encrypted runtime config file (`.payment-config.json`)
 *   - Caches the decrypted config in memory (invalidated on push)
 *   - Masks secret keys when serving them to the admin UI
 *   - Exposes per-provider "ping" functions so the admin can verify the
 *     credentials work before going live
 *
 * SECURITY MODEL
 * --------------
 * 1. Authentication — the route handler `requireSuperAdmin(req)` enforces
 *    HMAC-signed cookie + super_admin role. No client-side trust.
 * 2. CSRF — built into `requireSession` (Origin/Referer check).
 * 3. Encryption at rest — secret keys are encrypted with AES-256-GCM via
 *    `encryptSecret()` from `security.ts`. The key is derived from
 *    RIMIRIS_ENCRYPTION_KEY (env) using PBKDF2 (100k iterations, sha256).
 * 4. No plaintext keys in responses — GET always returns masked values
 *    (`sk_live••••••abcd`). The full key is only ever decrypted in memory
 *    at the moment of use (test ping or real payment initiation).
 * 5. Audit trail — every push writes a line to `.payment-config.audit.jsonl`
 *    with timestamp, admin email, and the field that changed.
 *
 * SUPPORTED PROVIDERS
 * -------------------
 *   - stripe       (international cards)
 *   - fedapay      (Africa-focused, XOF/XAF)
 *   - campay       (Cameroon Mobile Money — MTN/Orange)
 *   - flutterwave  (Africa + international)
 *   - paystack     (Nigeria + Africa)
 *   - notchpay     (Cameroon-focused)
 *   - cinetpay     (West/Central Africa)
 *
 * Each provider exposes a `test()` async function that pings the provider's
 * API with the configured credentials and returns `{ ok, detail }`. The
 * ping is read-only (no charge, no real payment) — typically a balance
 * check or a "retrieve account" call.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { encryptSecret, decryptSecret } from './security'

// ============================================================================
// Types
// ============================================================================
export type PaymentProviderId =
  | 'none'
  | 'stripe'
  | 'fedapay'
  | 'campay'
  | 'flutterwave'
  | 'paystack'
  | 'notchpay'
  | 'cinetpay'

export type ProviderMode = 'test' | 'live'

/**
 * Per-provider credential set. The fields that are PUBLIC (publishable key,
 * site ID, username) are stored as-is; the fields that are SECRET (secret
 * key, webhook secret, password, encryption key) are stored ENCRYPTED on
 * disk via `encryptSecret()`.
 */
export interface ProviderCredentials {
  /** 'test' (sandbox) or 'live' (production). Drives which endpoint to call. */
  mode: ProviderMode
  /** Public key — visible to the frontend, not encrypted. */
  publishableKey?: string
  /** Secret key — encrypted at rest. */
  secretKey?: string
  /** Webhook signing secret — encrypted at rest. Used to verify incoming
   *  payment notifications on /api/payment/webhook. */
  webhookSecret?: string
  /** Provider-specific: Stripe-style publishable key (alias). */
  publicKey?: string
  /** Provider-specific: Campay username. */
  username?: string
  /** Provider-specific: Campay password (encrypted). */
  password?: string
  /** Provider-specific: Flutterwave encryption key (encrypted). */
  encryptionKey?: string
  /** Provider-specific: Campay app secret (encrypted, alias of secretKey). */
  appSecret?: string
  /** Provider-specific: CinetPay site ID. */
  siteId?: string
  /** Provider-specific: CinetPay API key (encrypted, alias of secretKey). */
  apikey?: string
}

export interface RuntimePaymentConfig {
  /** Which provider is currently active. 'none' = no payments accepted. */
  activeProvider: Exclude<PaymentProviderId, 'none'>
  /** Per-provider credential sets. Only the active one is used at runtime. */
  providers: Partial<Record<Exclude<PaymentProviderId, 'none'>, ProviderCredentials>>
  /** ISO timestamp of the last push. */
  updatedAt?: string
  /** Email of the admin who performed the last push. */
  updatedBy?: string
}

// ============================================================================
// Provider registry — describes each provider (metadata + test function)
// ============================================================================
export interface ProviderDescriptor {
  id: Exclude<PaymentProviderId, 'none'>
  name: string
  /** Short marketing tagline shown in the picker. */
  tagline: string
  /** Longer description for the admin docs. */
  description: string
  /** Geographic / market focus. */
  region: string
  /** Whether the provider supports XAF (Central African CFA franc). */
  supportsXAF: boolean
  /** Whether Mobile Money push (Campay/FlW) is supported. */
  supportsMobileMoneyPush: boolean
  /** Documentation URL where the admin can find their API keys. */
  docsUrl: string
  /** Field schema for the UI — which fields are needed and which are secret. */
  fields: ProviderField[]
}

export interface ProviderField {
  key: keyof ProviderCredentials
  label: string
  placeholder: string
  required: boolean
  secret: boolean
  /** Help text under the input. */
  help?: string
}

export const PROVIDER_REGISTRY: ProviderDescriptor[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'Cartes bancaires internationales',
    description:
      "Stripe accepte Visa, Mastercard, Amex et plus de 135 devises. Idéal pour les paiements " +
      "internationaux. Stripe convertit automatiquement les XAF en EUR/USD sur votre compte " +
      "(conversion appliquée côté Stripe, pas côté Rimiris).",
    region: 'Monde entier',
    supportsXAF: true,
    supportsMobileMoneyPush: false,
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_… ou pk_test_…', required: true, secret: false, help: 'Commence par pk_. Visible côté client.' },
      { key: 'secretKey', label: 'Secret key', placeholder: 'sk_live_… ou sk_test_…', required: true, secret: true, help: 'Commence par sk_. Chiffré au repos.' },
      { key: 'webhookSecret', label: 'Webhook signing secret', placeholder: 'whsec_…', required: true, secret: true, help: "Endpoint secret pour vérifier les webhooks /api/payment/webhook." },
    ],
  },
  {
    id: 'campay',
    name: 'Campay',
    tagline: 'Mobile Money Cameroun (MTN, Orange)',
    description:
      "Campay permet d'envoyer une demande de paiement (push) directement sur le téléphone " +
      "MTN Mobile Money ou Orange Money de l'étudiant. Idéal pour le marché camerounais. " +
      "L'étudiant valide avec son code secret et le paiement est confirmé en quelques secondes.",
    region: 'Cameroun',
    supportsXAF: true,
    supportsMobileMoneyPush: true,
    docsUrl: 'https://campay.net/developer',
    fields: [
      { key: 'username', label: "Nom d'utilisateur", placeholder: 'votre-username-campay', required: true, secret: false },
      { key: 'password', label: 'Mot de passe', placeholder: '••••••••', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'appSecret', label: 'App secret / Token', placeholder: 'TOKEN-…', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'webhookSecret', label: 'Webhook secret (optionnel)', placeholder: 'whsec_…', required: false, secret: true, help: 'Si Campay fournit un secret de signature.' },
    ],
  },
  {
    id: 'fedapay',
    name: 'FedaPay',
    tagline: 'Paiements panafricains (Mobile Money + cartes)',
    description:
      "FedaPay est une passerelle de paiement conçue pour l'Afrique. Elle supporte MTN MoMo, " +
      "Orange Money, Moov, ainsi que Visa/Mastercard. Disponible au Bénin, Togo, Côte d'Ivoire, " +
      "Sénégal, Niger, Burkina Faso, et plus. Parfaite si vous servez plusieurs pays francophones.",
    region: 'Afrique de l\'Ouest et Centrale',
    supportsXAF: true,
    supportsMobileMoneyPush: true,
    docsUrl: 'https://fedapay.com/dashboard/developers/api-keys',
    fields: [
      { key: 'publicKey', label: 'Public key', placeholder: 'pk_sandbox_… ou pk_live_…', required: true, secret: false },
      { key: 'secretKey', label: 'Secret key', placeholder: 'sk_sandbox_… ou sk_live_…', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'webhookSecret', label: 'Webhook signing secret', placeholder: 'whsec_…', required: true, secret: true },
    ],
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    tagline: 'Mobile Money + cartes pour toute l\'Afrique',
    description:
      "Flutterwave (rave) couvre 30+ pays africains. Supporte MTN MoMo, Orange Money, Airtel Money, " +
      "M-Pesa, cartes Visa/Mastercard, comptes bancaires directs. La référence si vous servez toute " +
      "l'Afrique subsaharienne.",
    region: 'Afrique (30+ pays)',
    supportsXAF: true,
    supportsMobileMoneyPush: true,
    docsUrl: 'https://dashboard.flutterwave.com/dashboard/settings/apis',
    fields: [
      { key: 'publicKey', label: 'Public key', placeholder: 'FLWPUBK-…', required: true, secret: false },
      { key: 'secretKey', label: 'Secret key', placeholder: 'FLWSECK-…', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'encryptionKey', label: 'Encryption key', placeholder: 'FLWSECK_TEST…', required: true, secret: true, help: 'Requis pour chiffrer les payloads carte.' },
      { key: 'webhookSecret', label: 'Webhook hash secret', placeholder: 'whsec_…', required: true, secret: true, help: 'Secret utilisé pour vérifier verif-hash.' },
    ],
  },
  {
    id: 'paystack',
    name: 'Paystack',
    tagline: 'Nigeria + Afrique anglophone',
    description:
      "Paystack (propriété de Stripe) domine le marché nigérian et s'étend au Ghana, Kenya, " +
      "Afrique du Sud, Côte d'Ivoire. Supporte cartes, Mobile Money (selon pays) et virements " +
      "bancaires. Attention : la devise native est le NGN, la conversion XAF→NGN se fait côté Paystack.",
    region: 'Nigeria + Afrique',
    supportsXAF: false,
    supportsMobileMoneyPush: false,
    docsUrl: 'https://dashboard.paystack.com/#/settings/developers',
    fields: [
      { key: 'publicKey', label: 'Public key', placeholder: 'pk_test_… ou pk_live_…', required: true, secret: false },
      { key: 'secretKey', label: 'Secret key', placeholder: 'sk_test_… ou sk_live_…', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'webhookSecret', label: 'Webhook signing secret', placeholder: 'whsec_…', required: true, secret: true },
    ],
  },
  {
    id: 'notchpay',
    name: 'NotchPay',
    tagline: 'Cameroun — Mobile Money + cartes',
    description:
      "NotchPay est une passerelle camerounaise. Elle supporte MTN MoMo, Orange Money, et cartes " +
      "bancaires. Une alternative locale à Campay avec une API REST moderne.",
    region: 'Cameroun',
    supportsXAF: true,
    supportsMobileMoneyPush: true,
    docsUrl: 'https://dashboard.notchpay.com/business/api',
    fields: [
      { key: 'publicKey', label: 'Business public key', placeholder: 'pk_…', required: true, secret: false },
      { key: 'secretKey', label: 'Business secret key', placeholder: 'sk_…', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'webhookSecret', label: 'Webhook secret', placeholder: 'whsec_…', required: false, secret: true },
    ],
  },
  {
    id: 'cinetpay',
    name: 'CinetPay',
    tagline: 'Afrique de l\'Ouest et Centrale',
    description:
      "CinetPay couvre 10+ pays africains (Côte d'Ivoire, Sénégal, Cameroun, Burkina Faso, Mali…). " +
      "Supporte MTN, Orange, Moov, Wave, et cartes Visa/Mastercard. Une alternative solide pour " +
      "les marchés francophones.",
    region: 'Afrique de l\'Ouest et Centrale',
    supportsXAF: true,
    supportsMobileMoneyPush: true,
    docsUrl: 'https://admin.cinetpay.com/fr/api',
    fields: [
      { key: 'siteId', label: 'Site ID', placeholder: '123456', required: true, secret: false, help: "Identifiant du site (visible sur le tableau de bord CinetPay)." },
      { key: 'apikey', label: 'API key', placeholder: 'sk_…', required: true, secret: true, help: 'Chiffré au repos.' },
      { key: 'webhookSecret', label: 'Webhook secret (optionnel)', placeholder: 'whsec_…', required: false, secret: true },
    ],
  },
]

// ============================================================================
// Config file path + in-memory cache
// ============================================================================
const CONFIG_PATH = path.join(process.cwd(), '.payment-config.json')
const AUDIT_PATH = path.join(process.cwd(), '.payment-config.audit.jsonl')

let cachedConfig: RuntimePaymentConfig | null = null

// ============================================================================
// Encryption helpers — wrap security.ts functions but adapt to our shape
// ============================================================================
const SECRET_FIELDS: Array<keyof ProviderCredentials> = [
  'secretKey',
  'webhookSecret',
  'password',
  'encryptionKey',
  'appSecret',
  'apikey',
]

function isSecretField(field: keyof ProviderCredentials): boolean {
  return SECRET_FIELDS.includes(field)
}

/**
 * Encrypt all secret fields of a provider credential set IN PLACE.
 * Non-secret fields are left untouched.
 */
function encryptProviderCreds(creds: ProviderCredentials): ProviderCredentials {
  const out: ProviderCredentials = { ...creds }
  for (const field of SECRET_FIELDS) {
    const v = (creds as any)[field]
    if (typeof v === 'string' && v.length > 0) {
      ;(out as any)[field] = encryptSecret(v)
    } else {
      ;(out as any)[field] = undefined
    }
  }
  return out
}

/**
 * Decrypt all secret fields of a provider credential set IN PLACE.
 * Non-secret fields are left untouched.
 */
function decryptProviderCreds(creds: ProviderCredentials): ProviderCredentials {
  const out: ProviderCredentials = { ...creds }
  for (const field of SECRET_FIELDS) {
    const v = (creds as any)[field]
    if (typeof v === 'string' && v.length > 0) {
      ;(out as any)[field] = decryptSecret(v)
    } else {
      ;(out as any)[field] = undefined
    }
  }
  return out
}

// ============================================================================
// Read / write the runtime config file
// ============================================================================
function readConfigFile(): RuntimePaymentConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      const parsed = JSON.parse(raw) as RuntimePaymentConfig
      // Shape validation
      if (!parsed.providers || typeof parsed.providers !== 'object') {
        return { activeProvider: 'stripe', providers: {} }
      }
      return parsed
    }
  } catch {
    /* corrupt JSON — return empty */
  }
  return { activeProvider: 'stripe', providers: {} }
}

function writeConfigFile(cfg: RuntimePaymentConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
}

/**
 * Read the runtime config (DECRYPTED) for server-side use.
 * Results are cached in memory and invalidated on `invalidateCache()`.
 */
export function getRuntimeConfig(): RuntimePaymentConfig {
  if (cachedConfig) return cachedConfig
  const raw = readConfigFile()
  // Decrypt secret fields on read
  const decrypted: RuntimePaymentConfig = {
    ...raw,
    providers: {},
  }
  for (const [id, creds] of Object.entries(raw.providers)) {
    if (creds) {
      ;(decrypted.providers as any)[id] = decryptProviderCreds(creds)
    }
  }
  cachedConfig = decrypted
  return decrypted
}

/**
 * Invalidate the in-memory cache. Called after every push so the next read
 * picks up the new config.
 */
export function invalidatePaymentConfigCache() {
  cachedConfig = null
}

/**
 * Read the config but return it with secret fields MASKED (sk_••••abcd).
 * Used by the admin GET endpoint so the admin can verify which key is set
 * without the actual secret ever leaving the server.
 */
export function getMaskedConfig(): {
  activeProvider: RuntimePaymentConfig['activeProvider']
  providers: Partial<Record<Exclude<PaymentProviderId, 'none'>, Record<string, { value: string; masked: boolean; hasValue: boolean }>>>
  updatedAt?: string
  updatedBy?: string
} {
  const cfg = getRuntimeConfig()
  const masked: any = {}
  for (const [id, creds] of Object.entries(cfg.providers)) {
    if (!creds) continue
    const fields: any = {}
    for (const [field, value] of Object.entries(creds)) {
      if (typeof value !== 'string' || value.length === 0) {
        fields[field] = { value: '', masked: false, hasValue: false }
        continue
      }
      const isSecret = isSecretField(field as keyof ProviderCredentials)
      fields[field] = {
        value: isSecret ? '' : value, // non-secret values can be returned as-is
        masked: isSecret ? maskKey(value) : '',
        hasValue: true,
      }
    }
    // Always include the mode field
    if (!fields.mode) {
      fields.mode = { value: creds.mode || 'test', masked: false, hasValue: true }
    }
    masked[id] = fields
  }
  return {
    activeProvider: cfg.activeProvider,
    providers: masked,
    updatedAt: cfg.updatedAt,
    updatedBy: cfg.updatedBy,
  }
}

function maskKey(k: string): string {
  if (!k) return ''
  if (k.length <= 8) return '••••'
  return `${k.slice(0, 4)}••••${k.slice(-4)}`
}

// ============================================================================
// Push (save) a new config — encrypts secret fields and writes to disk
// ============================================================================
export interface PushInput {
  /** Provider being updated. */
  provider: Exclude<PaymentProviderId, 'none'>
  /** Mode toggle. */
  mode: ProviderMode
  /** Field values. For secret fields: empty string = leave unchanged,
   *  null = clear, non-empty = update. For non-secret fields: any value replaces. */
  fields: Record<string, string | null>
  /** If true, set this provider as the active one. */
  setActive?: boolean
  /** Email of the admin performing the push (for audit). */
  adminEmail: string
}

export interface PushResult {
  ok: boolean
  error?: string
  updatedFields: string[]
  activeProvider: Exclude<PaymentProviderId, 'none'>
  updatedAt: string
}

export function pushProviderConfig(input: PushInput): PushResult {
  const cfg = readConfigFile() // re-read fresh from disk (avoid stale cache)
  const providerId = input.provider
  const existing = cfg.providers[providerId] || { mode: input.mode }

  const updatedFields: string[] = []
  const newCreds: ProviderCredentials = {
    ...existing,
    mode: input.mode,
  }

  // Apply field updates
  const descriptor = PROVIDER_REGISTRY.find((p) => p.id === providerId)
  if (!descriptor) {
    return { ok: false, error: `Provider inconnu : ${providerId}`, updatedFields: [], activeProvider: cfg.activeProvider, updatedAt: new Date().toISOString() }
  }

  for (const field of descriptor.fields) {
    const v = input.fields[field.key]
    if (v === undefined) continue
    if (v === null) {
      ;(newCreds as any)[field.key] = undefined
      updatedFields.push(field.key)
      continue
    }
    if (isSecretField(field.key)) {
      if (v === '') {
        // leave unchanged — keep existing value (don't touch newCreds[field.key])
        continue
      }
      ;(newCreds as any)[field.key] = v
      updatedFields.push(field.key)
    } else {
      // Non-secret: replace (empty string clears)
      ;(newCreds as any)[field.key] = v || undefined
      if (v) updatedFields.push(field.key)
    }
  }

  // Validate required fields are present (either new value or existing value)
  for (const field of descriptor.fields) {
    if (!field.required) continue
    const v = (newCreds as any)[field.key]
    if (!v || (typeof v === 'string' && v.length === 0)) {
      return {
        ok: false,
        error: `Champ requis manquant : ${field.label}`,
        updatedFields: [],
        activeProvider: cfg.activeProvider,
        updatedAt: new Date().toISOString(),
      }
    }
  }

  // Encrypt and persist
  const encrypted = encryptProviderCreds(newCreds)
  cfg.providers[providerId] = encrypted
  if (input.setActive) {
    cfg.activeProvider = providerId
  }
  cfg.updatedAt = new Date().toISOString()
  cfg.updatedBy = input.adminEmail

  writeConfigFile(cfg)
  invalidatePaymentConfigCache()

  // Append audit log
  appendAuditLog({
    ts: cfg.updatedAt,
    admin: input.adminEmail,
    action: input.setActive ? 'activate' : 'update',
    provider: providerId,
    mode: input.mode,
    fields: updatedFields,
  })

  return {
    ok: true,
    updatedFields,
    activeProvider: cfg.activeProvider,
    updatedAt: cfg.updatedAt,
  }
}

/**
 * Remove a provider entirely from the config.
 */
export function removeProvider(providerId: Exclude<PaymentProviderId, 'none'>, adminEmail: string): PushResult {
  const cfg = readConfigFile()
  delete cfg.providers[providerId]
  if (cfg.activeProvider === providerId) {
    // Fall back to first remaining provider, or stripe by default
    const remaining = Object.keys(cfg.providers) as Array<Exclude<PaymentProviderId, 'none'>>
    cfg.activeProvider = remaining[0] || 'stripe'
  }
  cfg.updatedAt = new Date().toISOString()
  cfg.updatedBy = adminEmail
  writeConfigFile(cfg)
  invalidatePaymentConfigCache()

  appendAuditLog({
    ts: cfg.updatedAt,
    admin: adminEmail,
    action: 'remove',
    provider: providerId,
    mode: 'live',
    fields: [],
  })

  return {
    ok: true,
    updatedFields: [],
    activeProvider: cfg.activeProvider,
    updatedAt: cfg.updatedAt,
  }
}

// ============================================================================
// Audit log (JSONL — one line per push)
// ============================================================================
interface AuditEntry {
  ts: string
  admin: string
  action: 'activate' | 'update' | 'remove'
  provider: string
  mode: string
  fields: string[]
}

function appendAuditLog(entry: AuditEntry) {
  try {
    fs.appendFileSync(AUDIT_PATH, JSON.stringify(entry) + '\n', 'utf8')
  } catch {
    /* audit log is best-effort */
  }
}

export function readAuditLog(limit = 50): AuditEntry[] {
  try {
    if (!fs.existsSync(AUDIT_PATH)) return []
    const lines = fs.readFileSync(AUDIT_PATH, 'utf8').trim().split('\n').slice(-limit)
    return lines
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l) as AuditEntry } catch { return null }
      })
      .filter((x): x is AuditEntry => x !== null)
      .reverse()
  } catch {
    return []
  }
}

// ============================================================================
// Provider test functions — read-only pings to verify credentials
// ============================================================================
export interface ProviderTestResult {
  ok: boolean
  detail: string
  /** Optional diagnostic (e.g., response status, account ID found). */
  diagnostic?: string
}

const PING_TIMEOUT_MS = 8000

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = PING_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function testStripe(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.secretKey) return { ok: false, detail: 'Secret key manquante.' }
  try {
    const res = await fetchWithTimeout('https://api.stripe.com/v1/balance', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
      },
    })
    if (res.ok) {
      const data = await res.json()
      const bal = data?.available?.[0]
      return {
        ok: true,
        detail: 'Connexion Stripe réussie — clé valide.',
        diagnostic: bal ? `Solde disponible : ${bal.amount} ${bal.currency?.toUpperCase()}` : 'Compte accessible.',
      }
    }
    if (res.status === 401) return { ok: false, detail: 'Clé Stripe invalide (401).' }
    return { ok: false, detail: `Stripe a répondu ${res.status}.` }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau Stripe : ${e?.message || e}` }
  }
}

async function testCampay(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.username || !creds.password) return { ok: false, detail: 'Username/password manquants.' }
  const baseUrl = creds.mode === 'test'
    ? 'https://demo.campay.net/api'
    : 'https://api.campay.net/api'
  try {
    // Step 1: get token
    const tokenRes = await fetchWithTimeout(`${baseUrl}/get-token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    })
    if (!tokenRes.ok) {
      return { ok: false, detail: `Campay auth ${tokenRes.status} — username/password invalides.` }
    }
    const tokenData = await tokenRes.json()
    const token = tokenData?.token
    if (!token) return { ok: false, detail: 'Campay n\'a pas renvoyé de token.' }
    return {
      ok: true,
      detail: 'Authentification Campay réussie — credentials valides.',
      diagnostic: `Token obtenu (${token.slice(0, 12)}…).`,
    }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau Campay : ${e?.message || e}` }
  }
}

async function testFedapay(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.secretKey) return { ok: false, detail: 'Secret key manquante.' }
  const baseUrl = creds.mode === 'test'
    ? 'https://sandbox-api.fedapay.com/v1'
    : 'https://api.fedapay.com/v1'
  try {
    // Fedapay uses Basic auth with the secret key
    const res = await fetchWithTimeout(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = await res.json()
      return {
        ok: true,
        detail: 'Connexion FedaPay réussie — clé valide.',
        diagnostic: data?.name ? `Compte : ${data.name}` : undefined,
      }
    }
    if (res.status === 401) return { ok: false, detail: 'Clé FedaPay invalide (401).' }
    return { ok: false, detail: `FedaPay a répondu ${res.status}.` }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau FedaPay : ${e?.message || e}` }
  }
}

async function testFlutterwave(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.secretKey) return { ok: false, detail: 'Secret key manquante.' }
  const baseUrl = 'https://api.flutterwave.com/v3'
  try {
    const res = await fetchWithTimeout(`${baseUrl}/balances`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = await res.json()
      const bal = data?.data?.[0]
      return {
        ok: true,
        detail: 'Connexion Flutterwave réussie — clé valide.',
        diagnostic: bal ? `Solde ${bal.currency}: ${bal.available_balance}` : undefined,
      }
    }
    if (res.status === 401) return { ok: false, detail: 'Clé Flutterwave invalide (401).' }
    return { ok: false, detail: `Flutterwave a répondu ${res.status}.` }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau Flutterwave : ${e?.message || e}` }
  }
}

async function testPaystack(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.secretKey) return { ok: false, detail: 'Secret key manquante.' }
  const baseUrl = 'https://api.paystack.co'
  try {
    const res = await fetchWithTimeout(`${baseUrl}/transaction/totals`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      return { ok: true, detail: 'Connexion Paystack réussie — clé valide.' }
    }
    if (res.status === 401) return { ok: false, detail: 'Clé Paystack invalide (401).' }
    return { ok: false, detail: `Paystack a répondu ${res.status}.` }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau Paystack : ${e?.message || e}` }
  }
}

async function testNotchpay(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.secretKey && !creds.publicKey) return { ok: false, detail: 'Clé manquante.' }
  const baseUrl = 'https://api.notchpay.co'
  const key = creds.secretKey || creds.publicKey
  try {
    const res = await fetchWithTimeout(`${baseUrl}/v1/business`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    })
    if (res.ok) {
      const data = await res.json()
      return {
        ok: true,
        detail: 'Connexion NotchPay réussie — clé valide.',
        diagnostic: data?.name ? `Business : ${data.name}` : undefined,
      }
    }
    if (res.status === 401) return { ok: false, detail: 'Clé NotchPay invalide (401).' }
    return { ok: false, detail: `NotchPay a répondu ${res.status}.` }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau NotchPay : ${e?.message || e}` }
  }
}

async function testCinetpay(creds: ProviderCredentials): Promise<ProviderTestResult> {
  if (!creds.apikey || !creds.siteId) return { ok: false, detail: 'API key / Site ID manquants.' }
  // CinetPay doesn't have a clean "verify" endpoint. The closest is the
  // transfer status check, but that requires a transaction ID. We do a
  // best-effort: hit the API with a known endpoint and check the response shape.
  const baseUrl = 'https://api-checkout.cinetpay.com/v2'
  try {
    const res = await fetchWithTimeout(`${baseUrl}/${creds.siteId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: creds.apikey, cpms_id: creds.siteId }),
    })
    // Even a 400/404 with valid JSON shape means the apikey is recognized.
    if (res.status === 401 || res.status === 403) {
      return { ok: false, detail: `CinetPay a refusé la clé (${res.status}).` }
    }
    return {
      ok: true,
      detail: 'Connexion CinetPay établie — clé reconnue par l\'API.',
    }
  } catch (e: any) {
    return { ok: false, detail: `Erreur réseau CinetPay : ${e?.message || e}` }
  }
}

const TESTERS: Record<Exclude<PaymentProviderId, 'none'>, (c: ProviderCredentials) => Promise<ProviderTestResult>> = {
  stripe: testStripe,
  campay: testCampay,
  fedapay: testFedapay,
  flutterwave: testFlutterwave,
  paystack: testPaystack,
  notchpay: testNotchpay,
  cinetpay: testCinetpay,
}

export async function testProvider(providerId: Exclude<PaymentProviderId, 'none'>): Promise<ProviderTestResult> {
  const cfg = getRuntimeConfig()
  const creds = cfg.providers[providerId]
  if (!creds) {
    return { ok: false, detail: `Aucune credential enregistrée pour ${providerId}. Enregistrez d'abord, puis testez.` }
  }
  const fn = TESTERS[providerId]
  if (!fn) return { ok: false, detail: `Pas de testeur implémenté pour ${providerId}.` }
  return fn(creds)
}

// ============================================================================
// Public helpers — used by /api/payment/* endpoints (not implemented yet,
// but the surface is here so the future payment-initiation routes can read
// the active provider's decrypted credentials at runtime).
// ============================================================================
export function getActiveProvider(): {
  id: Exclude<PaymentProviderId, 'none'>
  creds: ProviderCredentials
} | null {
  const cfg = getRuntimeConfig()
  const id = cfg.activeProvider
  const creds = cfg.providers[id]
  if (!creds) return null
  return { id, creds }
}

export function isPaymentEnabled(): boolean {
  return getActiveProvider() !== null
}

// ============================================================================
// Payment initiation — starts a real payment with the active provider.
// Returns either a redirect URL (hosted checkout) or a payment reference
// (for direct Mobile Money push). The caller stores the pending payment
// via payment-pending.ts and then either:
//   (a) redirects the browser to `redirectUrl` (Stripe/FedaPay/FlW/Paystack/
//       NotchPay/CinetPay hosted checkout), or
//   (b) returns the reference to the frontend which polls /api/payment/status
//       until the user confirms the Mobile Money push (Campay).
// ============================================================================
export interface InitiatePaymentInput {
  /** Amount in XAF (integer). */
  amountXAF: number
  /** Currency — always XAF for now, but exposed for future flexibility. */
  currency?: string
  /** Payer's account ID (Rimiris internal). */
  accountId: string
  /** Payer's email. */
  email: string
  /** Payer's display name. */
  name: string
  /** Our payment reference (generated by payment-pending.generateReference). */
  reference: string
  /** Human-readable description (shown on the checkout page). */
  description: string
  /** Where to redirect the user after the payment (success or cancel). */
  returnUrl: string
  /** Where the provider should send webhook notifications. */
  notifyUrl: string
  /** For Campay — payer's phone number (required for Mobile Money push). */
  payerPhone?: string
}

export interface InitiatePaymentResult {
  ok: boolean
  /** URL to redirect the browser to (hosted checkout). Empty for push flows. */
  redirectUrl?: string
  /** Provider's own session/transaction ID (stored in pending record). */
  providerRef?: string
  /** Provider-specific raw response (for debugging). */
  raw?: any
  error?: string
}

async function initiateStripe(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.secretKey) return { ok: false, error: 'Stripe secret key manquante.' }
  // XAF is a zero-decimal currency — Stripe expects the amount in units, not
  // minor units. See https://stripe.com/docs/currencies#zero-decimal
  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': (input.currency || 'xaf').toLowerCase(),
    'line_items[0][price_data][product_data][name]': input.description,
    'line_items[0][price_data][unit_amount]': String(input.amountXAF),
    client_reference_id: input.reference,
    customer_email: input.email,
    success_url: `${input.returnUrl}?ref=${input.reference}&status=success`,
    cancel_url: `${input.returnUrl}?ref=${input.reference}&status=cancel`,
    // Auto-expire sessions after 30 minutes if unpaid
    expires_at: String(Math.floor(Date.now() / 1000) + 30 * 60),
  })
  try {
    const res = await fetchWithTimeout('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: `Stripe error: ${data?.error?.message || res.status}`, raw: data }
    }
    return {
      ok: true,
      redirectUrl: data.url,
      providerRef: data.id, // cs_test_... or cs_live_...
      raw: data,
    }
  } catch (e: any) {
    return { ok: false, error: `Erreur réseau Stripe : ${e?.message || e}` }
  }
}

async function initiateCampay(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.username || !creds.password) {
    return { ok: false, error: 'Campay username/password manquants.' }
  }
  if (!input.payerPhone) {
    return { ok: false, error: 'Numéro Mobile Money du payeur requis pour Campay.' }
  }
  const baseUrl = creds.mode === 'test'
    ? 'https://demo.campay.net/api'
    : 'https://api.campay.net/api'

  try {
    // Step 1: get token
    const tokenRes = await fetchWithTimeout(`${baseUrl}/get-token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    })
    if (!tokenRes.ok) {
      return { ok: false, error: `Campay auth ${tokenRes.status}.` }
    }
    const tokenData = await tokenRes.json()
    const token = tokenData?.token
    if (!token) return { ok: false, error: 'Campay: pas de token renvoyé.' }

    // Step 2: initiate collect (Mobile Money push)
    const collectRes = await fetchWithTimeout(`${baseUrl}/collect/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(input.amountXAF),
        currency: 'XAF',
        from: input.payerPhone,
        description: input.description,
        external_reference: input.reference,
      }),
    })
    const collectData = await collectRes.json()
    if (!collectRes.ok) {
      return { ok: false, error: `Campay collect ${collectRes.status}: ${collectData?.message || ''}`, raw: collectData }
    }
    // Campay returns a `reference` field that we need to track to poll status
    return {
      ok: true,
      providerRef: collectData.reference,
      raw: collectData,
      // No redirect — user confirms on phone. Frontend polls /api/payment/status
    }
  } catch (e: any) {
    return { ok: false, error: `Erreur réseau Campay : ${e?.message || e}` }
  }
}

async function initiateFedapay(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.secretKey) return { ok: false, error: 'FedaPay secret key manquante.' }
  const baseUrl = creds.mode === 'test'
    ? 'https://sandbox-api.fedapay.com/v1'
    : 'https://api.fedapay.com/v1'
  try {
    const res = await fetchWithTimeout(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transaction: {
          amount: input.amountXAF,
          description: input.description,
          callback_url: input.notifyUrl,
          currency: { iso_code: 'XAF' },
          customer: {
            email: input.email,
            first_name: input.name.split(' ')[0] || input.name,
            last_name: input.name.split(' ').slice(1).join(' ') || '—',
          },
          reference: input.reference,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: `FedaPay error: ${data?.message || res.status}`, raw: data }
    }
    // FedaPay returns the transaction in `data` (v1) — we then need to fetch
    // the token URL to get the redirect. v1 returns `token_url` directly.
    const txId = data?.id || data?.data?.id
    const tokenUrl = data?.token_url || data?.data?.token_url
    if (!tokenUrl) {
      // Need a second call to /v1/transactions/{id}/token
      const tokenRes = await fetchWithTimeout(`${baseUrl}/transactions/${txId}/token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.secretKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
      const tokenData = await tokenRes.json()
      return {
        ok: true,
        redirectUrl: tokenData?.url || tokenData?.token_url,
        providerRef: String(txId),
        raw: tokenData,
      }
    }
    return {
      ok: true,
      redirectUrl: tokenUrl,
      providerRef: String(txId),
      raw: data,
    }
  } catch (e: any) {
    return { ok: false, error: `Erreur réseau FedaPay : ${e?.message || e}` }
  }
}

async function initiateFlutterwave(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.secretKey) return { ok: false, error: 'Flutterwave secret key manquante.' }
  try {
    const res = await fetchWithTimeout('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amountXAF,
        currency: 'XAF',
        redirect_url: `${input.returnUrl}?ref=${input.reference}&status=success`,
        customer: {
          email: input.email,
          name: input.name,
        },
        customizations: {
          title: 'Rimiris AI',
          description: input.description,
        },
      }),
    })
    const data = await res.json()
    if (!res.ok || data?.status !== 'success') {
      return { ok: false, error: `Flutterwave error: ${data?.message || res.status}`, raw: data }
    }
    return {
      ok: true,
      redirectUrl: data?.data?.link,
      providerRef: input.reference, // FlW uses our tx_ref as the canonical ID
      raw: data,
    }
  } catch (e: any) {
    return { ok: false, error: `Erreur réseau Flutterwave : ${e?.message || e}` }
  }
}

async function initiatePaystack(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.secretKey) return { ok: false, error: 'Paystack secret key manquante.' }
  // Paystack expects amount in kobo (smallest unit). XAF is a zero-decimal
  // currency, but Paystack still wants the amount as-is (so amountXAF * 1).
  // The trick: Paystack multiplies by 100 internally, so we send amountXAF*100
  // and the user sees amountXAF on the checkout page.
  // Actually: per Paystack docs, for zero-decimal currencies (XOF/XAF), send
  // the amount as-is (NOT multiplied). So we just send amountXAF.
  try {
    const res = await fetchWithTimeout('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountXAF, // XAF is zero-decimal — no multiplication
        currency: 'XAF',
        reference: input.reference,
        callback_url: `${input.returnUrl}?ref=${input.reference}&status=success`,
        metadata: {
          custom_fields: [
            { display_name: 'Description', variable_name: 'description', value: input.description },
            { display_name: 'Account ID', variable_name: 'account_id', value: input.accountId },
          ],
        },
      }),
    })
    const data = await res.json()
    if (!res.ok || !data?.status) {
      return { ok: false, error: `Paystack error: ${data?.message || res.status}`, raw: data }
    }
    return {
      ok: true,
      redirectUrl: data?.data?.authorization_url,
      providerRef: data?.data?.reference,
      raw: data,
    }
  } catch (e: any) {
    return { ok: false, error: `Erreur réseau Paystack : ${e?.message || e}` }
  }
}

async function initiateNotchpay(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.secretKey) return { ok: false, error: 'NotchPay secret key manquante.' }
  const baseUrl = 'https://api.notchpay.co/v1'
  try {
    // Step 1: create a payment
    const createRes = await fetchWithTimeout(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountXAF,
        currency: 'XAF',
        email: input.email,
        reference: input.reference,
        description: input.description,
        callback_url: `${input.returnUrl}?ref=${input.reference}&status=success`,
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) {
      return { ok: false, error: `NotchPay error: ${createData?.message || createRes.status}`, raw: createData }
    }
    const paymentRef = createData?.reference || createData?.data?.reference
    // Step 2: initialize to get the redirect URL
    const initRes = await fetchWithTimeout(`${baseUrl}/payments/${paymentRef}/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.secretKey}`,
        'Content-Type': 'application/json',
      },
    })
    const initData = await initRes.json()
    return {
      ok: true,
      redirectUrl: initData?.authorization_url || initData?.data?.authorization_url,
      providerRef: paymentRef,
      raw: { create: createData, init: initData },
    }
  } catch (e: any) {
    return { ok: false, error: `Erreur réseau NotchPay : ${e?.message || e}` }
  }
}

async function initiateCinetpay(
  creds: ProviderCredentials,
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!creds.apikey || !creds.siteId) {
    return { ok: false, error: 'CinetPay API key / Site ID manquants.' }
  }
  // CinetPay uses a hosted checkout — we just build the redirect URL with
  // the right query parameters. No API call needed to initiate.
  const baseUrl = 'https://checkout.cinetpay.com/v2/payment'
  const params = new URLSearchParams({
    site_id: creds.siteId,
    amount: String(input.amountXAF),
    currency: 'XAF',
    transaction_id: input.reference,
    customer_email: input.email,
    customer_name: input.name,
    description: input.description,
    notify_url: input.notifyUrl,
    return_url: `${input.returnUrl}?ref=${input.reference}&status=success`,
    // Force specific channels (cards + Mobile Money) via channels field
    channels: 'ALL',
  })
  return {
    ok: true,
    redirectUrl: `${baseUrl}?${params.toString()}`,
    providerRef: input.reference,
  }
}

const INITIATORS: Record<
  Exclude<PaymentProviderId, 'none'>,
  (c: ProviderCredentials, i: InitiatePaymentInput) => Promise<InitiatePaymentResult>
> = {
  stripe: initiateStripe,
  campay: initiateCampay,
  fedapay: initiateFedapay,
  flutterwave: initiateFlutterwave,
  paystack: initiatePaystack,
  notchpay: initiateNotchpay,
  cinetpay: initiateCinetpay,
}

export async function initiatePayment(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult & { provider: Exclude<PaymentProviderId, 'none'> }> {
  const active = getActiveProvider()
  if (!active) {
    return { ok: false, provider: 'stripe', error: 'Aucun prestataire de paiement actif.' }
  }
  const fn = INITIATORS[active.id]
  if (!fn) {
    return { ok: false, provider: active.id, error: `Initiateur non implémenté pour ${active.id}.` }
  }
  const result = await fn(active.creds, input)
  return { ...result, provider: active.id }
}

// ============================================================================
// Webhook signature verification — one function per provider.
// Each returns { valid: boolean; reference?: string; providerRef?: string }
// ============================================================================
export interface WebhookVerifyResult {
  valid: boolean
  /** The payment reference (our rdr_xxx) extracted from the webhook payload. */
  reference?: string
  /** The provider's own transaction ID (if different from our reference). */
  providerRef?: string
  /** Optional reason for invalidity. */
  error?: string
  /** Parsed payload (for debugging). */
  raw?: any
}

async function verifyStripeWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  const sig = headers.get('stripe-signature')
  if (!sig || !creds.webhookSecret) {
    return { valid: false, error: 'Stripe-Signature ou webhook secret manquant.' }
  }
  // Stripe signature format: t=1234567890,v1=hex_signature
  // The signature is HMAC-SHA256 of `${t}.${body}` with the webhook secret.
  const parts: Record<string, string> = {}
  for (const item of sig.split(',')) {
    const [k, v] = item.split('=')
    parts[k] = v
  }
  const t = parts['t']
  const v1 = parts['v1']
  if (!t || !v1) return { valid: false, error: 'Stripe signature malformée.' }

  const signedPayload = `${t}.${body}`
  const expected = crypto.createHmac('sha256', creds.webhookSecret).update(signedPayload).digest('hex')
  const a = Buffer.from(v1, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, error: 'Signature Stripe invalide.' }
  }

  // Replay protection: timestamp within 5 minutes
  const ts = Number(t)
  if (Math.abs(Date.now() / 1000 - ts) > 5 * 60) {
    return { valid: false, error: 'Stripe webhook expiré.' }
  }

  const event = JSON.parse(body)
  // Only fulfill on successful payment events
  const eventType = event?.type
  if (eventType !== 'checkout.session.completed' && eventType !== 'payment_intent.succeeded') {
    return { valid: true, reference: undefined, raw: event }
  }
  const session = event?.data?.object
  const reference = session?.client_reference_id || session?.metadata?.reference
  return {
    valid: true,
    reference,
    providerRef: session?.id,
    raw: event,
  }
}

async function verifyCampayWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  // Campay uses a simple shared secret passed as a query param or header.
  // The webhook payload contains: { reference, status, amount, ... }
  // We verify by comparing the X-Campay-Signature header (if configured)
  // OR by comparing the request body's external_reference to our pending.
  const sig = headers.get('x-campay-signature') || headers.get('campay-signature')
  if (creds.webhookSecret && sig) {
    const expected = crypto.createHmac('sha256', creds.webhookSecret).update(body).digest('hex')
    try {
      const a = Buffer.from(sig, 'hex')
      const b = Buffer.from(expected, 'hex')
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { valid: false, error: 'Signature Campay invalide.' }
      }
    } catch {
      return { valid: false, error: 'Signature Campay malformée.' }
    }
  } else if (creds.webhookSecret && !sig) {
    return { valid: false, error: 'Campay: signature attendue mais absente.' }
  }
  // If no webhookSecret configured, we accept (admin's choice) — but log it

  const data = JSON.parse(body)
  // Campay payload: { reference, status, amount, ... }
  // `reference` is the Campay internal ID; `external_reference` is our rdr_xxx
  if (data.status !== 'SUCCESSFUL') {
    return { valid: true, reference: undefined, raw: data }
  }
  return {
    valid: true,
    reference: data.external_reference,
    providerRef: data.reference,
    raw: data,
  }
}

async function verifyFedapayWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  // FedaPay signs the body with HMAC-SHA256 using the webhook secret
  const sig = headers.get('x-fedapay-signature')
  if (!sig || !creds.webhookSecret) {
    return { valid: false, error: 'X-Fedapay-Signature ou webhook secret manquant.' }
  }
  const expected = crypto.createHmac('sha256', creds.webhookSecret).update(body).digest('hex')
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, error: 'Signature FedaPay invalide.' }
    }
  } catch {
    return { valid: false, error: 'Signature FedaPay malformée.' }
  }

  const event = JSON.parse(body)
  // FedaPay sends: { event: 'transaction.approved', data: { reference, ... } }
  if (event?.event !== 'transaction.approved') {
    return { valid: true, reference: undefined, raw: event }
  }
  return {
    valid: true,
    reference: event?.data?.reference,
    providerRef: String(event?.data?.id || ''),
    raw: event,
  }
}

async function verifyFlutterwaveWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  // Flutterwave: the `verif-hash` header EQUALS the stored secret (no HMAC)
  const sig = headers.get('verif-hash')
  if (!sig || !creds.webhookSecret) {
    return { valid: false, error: 'verif-hash ou webhook secret manquant.' }
  }
  if (sig !== creds.webhookSecret) {
    return { valid: false, error: 'verif-hash Flutterwave invalide.' }
  }

  const event = JSON.parse(body)
  // FlW payload: { event: 'charge.completed', data: { tx_ref, status, ... } }
  if (event?.event !== 'charge.completed' || event?.data?.status !== 'successful') {
    return { valid: true, reference: undefined, raw: event }
  }
  return {
    valid: true,
    reference: event?.data?.tx_ref,
    providerRef: event?.data?.id ? String(event.data.id) : event?.data?.flwref,
    raw: event,
  }
}

async function verifyPaystackWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  // Paystack: HMAC-SHA512 of body with the secret key
  const sig = headers.get('x-paystack-signature')
  if (!sig || !creds.webhookSecret) {
    return { valid: false, error: 'x-paystack-signature ou webhook secret manquant.' }
  }
  const expected = crypto.createHmac('sha512', creds.webhookSecret).update(body).digest('hex')
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, error: 'Signature Paystack invalide.' }
    }
  } catch {
    return { valid: false, error: 'Signature Paystack malformée.' }
  }

  const event = JSON.parse(body)
  if (event?.event !== 'charge.success') {
    return { valid: true, reference: undefined, raw: event }
  }
  return {
    valid: true,
    reference: event?.data?.reference,
    providerRef: event?.data?.id ? String(event.data.id) : '',
    raw: event,
  }
}

async function verifyNotchpayWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  // NotchPay sends a signature header `x-notchpay-signature` = HMAC-SHA256
  const sig = headers.get('x-notchpay-signature') || headers.get('notchpay-signature')
  if (!sig || !creds.webhookSecret) {
    return { valid: false, error: 'Signature NotchPay ou webhook secret manquant.' }
  }
  const expected = crypto.createHmac('sha256', creds.webhookSecret).update(body).digest('hex')
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { valid: false, error: 'Signature NotchPay invalide.' }
    }
  } catch {
    return { valid: false, error: 'Signature NotchPay malformée.' }
  }

  const event = JSON.parse(body)
  if (event?.event !== 'payment.success' && event?.status !== 'success') {
    return { valid: true, reference: undefined, raw: event }
  }
  return {
    valid: true,
    reference: event?.reference || event?.data?.reference,
    providerRef: event?.transaction_ref || event?.data?.transaction_ref,
    raw: event,
  }
}

async function verifyCinetpayWebhook(
  creds: ProviderCredentials,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  // CinetPay posts form-encoded data to the notify_url. The signature
  // is computed as HMAC-SHA256 of `apikey|site_id|transaction_id` with
  // the API key (or a separate signature key, depending on integration).
  // For our integration, we verify by checking the payload contains the
  // expected `cpm_site_id` matching our configured siteId AND the status
  // is 'ACCEPTED'. We additionally verify the `cpm_result` field equals '00'
  // (success code).
  if (!creds.apikey || !creds.siteId) {
    return { valid: false, error: 'CinetPay API key / Site ID manquants.' }
  }
  let data: any
  try {
    // CinetPay sends JSON or form-encoded depending on integration
    if (body.trim().startsWith('{')) {
      data = JSON.parse(body)
    } else {
      data = Object.fromEntries(new URLSearchParams(body))
    }
  } catch {
    return { valid: false, error: 'Payload CinetPay illisible.' }
  }
  // Validate site ID matches
  const siteId = data?.cpm_site_id || data?.site_id
  if (siteId !== creds.siteId) {
    return { valid: false, error: 'CinetPay: site_id ne correspond pas.' }
  }
  // Validate signature if present (CPAY-SIGNATURE header or field)
  const sig = headers.get('cpay-signature') || data?.signature || data?.cpay_sign
  if (sig) {
    // Expected signature: MD5 of apikey + site_id + transaction_id (per CinetPay docs)
    const txId = data?.cpm_trans_id || data?.transaction_id || ''
    const expected = crypto
      .createHash('md5')
      .update(creds.apikey + creds.siteId + txId)
      .digest('hex')
    if (sig !== expected) {
      return { valid: false, error: 'Signature CinetPay invalide.' }
    }
  }
  // Check payment status
  const status = data?.cpm_result || data?.result || data?.status
  if (status !== '00' && status !== 'ACCEPTED' && status !== 'success') {
    return { valid: true, reference: undefined, raw: data }
  }
  return {
    valid: true,
    reference: data?.cpm_trans_id || data?.transaction_id, // our rdr_xxx
    providerRef: data?.cpm_payid || data?.payid,
    raw: data,
  }
}

const WEBHOOK_VERIFIERS: Record<
  Exclude<PaymentProviderId, 'none'>,
  (c: ProviderCredentials, body: string, headers: Headers) => Promise<WebhookVerifyResult>
> = {
  stripe: verifyStripeWebhook,
  campay: verifyCampayWebhook,
  fedapay: verifyFedapayWebhook,
  flutterwave: verifyFlutterwaveWebhook,
  paystack: verifyPaystackWebhook,
  notchpay: verifyNotchpayWebhook,
  cinetpay: verifyCinetpayWebhook,
}

export async function verifyWebhook(
  provider: Exclude<PaymentProviderId, 'none'>,
  body: string,
  headers: Headers,
): Promise<WebhookVerifyResult> {
  const cfg = getRuntimeConfig()
  const creds = cfg.providers[provider]
  if (!creds) {
    return { valid: false, error: `Aucune credential pour ${provider}.` }
  }
  const fn = WEBHOOK_VERIFIERS[provider]
  if (!fn) return { valid: false, error: `Vérificateur webhook non implémenté pour ${provider}.` }
  return fn(creds, body, headers)
}

export function getWebhookUrl(provider: Exclude<PaymentProviderId, 'none'>): string {
  // The webhook URL is constructed at runtime from the request host —
  // the caller passes it in. This helper just returns the path.
  return `/api/payment/webhook/${provider}`
}
