/**
 * Central LLM helper — single point of contact for all AI calls in Rimiris.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every `/api/ai/*` route used to call `z-ai-web-dev-sdk` directly, which
 * meant swapping providers (ZAI → OpenAI → Anthropic → Mistral → local Ollama)
 * required editing 18+ files. This helper centralises the call so that:
 *
 *   1. Today, you use ZAI (zero config — uses /etc/.z-ai-config).
 *   2. Tomorrow, to switch to OpenAI/Claude/etc., you edit ONE line here.
 *   3. To support multiple providers simultaneously, you add a `provider`
 *      param and route inside this file — endpoints stay unchanged.
 *
 * PROVIDER SELECTION
 * ------------------
 * Set `LLM_PROVIDER` env var to one of:
 *   - "zai"      (default — uses z-ai-web-dev-sdk, no API key needed in this env)
 *   - "openai"   (requires OPENAI_API_KEY + OPENAI_BASE_URL optional)
 *   - "anthropic"(requires ANTHROPIC_API_KEY)
 *   - "mistral"  (requires MISTRAL_API_KEY)
 *   - "openrouter" (requires OPENROUTER_API_KEY — gives access to all models)
 *
 * MODEL SELECTION
 * ---------------
 * Set `LLM_MODEL` env var to override the default model for the chosen
 * provider. Examples:
 *   - openai:      "gpt-4o", "gpt-4o-mini", "gpt-4-turbo"
 *   - anthropic:   "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"
 *   - mistral:     "mistral-large-latest", "mistral-small-latest"
 *   - openrouter:  "anthropic/claude-3.5-sonnet", "openai/gpt-4o"
 *   - zai:         (ignored — ZAI SDK picks the default GLM model)
 *
 * CREATE .env.local IN THE PROJECT ROOT
 * -------------------------------------
 *   LLM_PROVIDER=openai
 *   OPENAI_API_KEY=sk-...
 *   LLM_MODEL=gpt-4o
 *
 * Or for OpenRouter (one key, access to ALL models including Claude, GPT-4,
 * Gemini, Mistral, Llama):
 *   LLM_PROVIDER=openrouter
 *   OPENROUTER_API_KEY=sk-or-...
 *   LLM_MODEL=anthropic/claude-3.5-sonnet
 *
 * DEVELOPMENT WITHOUT ANY API KEY
 * -------------------------------
 * If no env is set and ZAI's /etc/.z-ai-config exists (as in this sandbox),
 * it falls back to ZAI automatically. So locally you can keep working
 * without paying for OpenAI — but in production you MUST set LLM_PROVIDER
 * + the matching API key.
 */

import ZAI from 'z-ai-web-dev-sdk'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Types
// ============================================================================
export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  /** Optional provider override (else read from runtime config or env). */
  provider?: LLMProvider
  /** Optional model override (else read from runtime config or env). */
  model?: string
  /** ZAI-specific: enable/disable thinking mode. Default: disabled. */
  thinking?: 'enabled' | 'disabled'
}

export type LLMProvider = 'zai' | 'openai' | 'anthropic' | 'mistral' | 'openrouter' | 'local'

// ============================================================================
// Runtime config — written by the admin portal, takes precedence over env
// ============================================================================
// File location: <project_root>/.llm-config.json
// Shape: { provider, model?, openaiApiKey?, anthropicApiKey?, mistralApiKey?,
//         openrouterApiKey?, openaiBaseUrl? }
// We cache the parsed file for 5s to avoid disk thrashing on every AI call.

interface RuntimeLLMConfig {
  provider?: LLMProvider
  model?: string
  openaiApiKey?: string
  anthropicApiKey?: string
  mistralApiKey?: string
  openrouterApiKey?: string
  openaiBaseUrl?: string
  localBaseUrl?: string
  localApiKey?: string
}

let _cachedConfig: RuntimeLLMConfig | null = null
let _cachedAt = 0
const CONFIG_TTL_MS = 5000

const RUNTIME_CONFIG_PATH = path.join(
  process.cwd(),
  '.llm-config.json',
)

function readRuntimeConfig(): RuntimeLLMConfig {
  const now = Date.now()
  if (_cachedConfig && now - _cachedAt < CONFIG_TTL_MS) return _cachedConfig
  try {
    if (fs.existsSync(RUNTIME_CONFIG_PATH)) {
      const raw = fs.readFileSync(RUNTIME_CONFIG_PATH, 'utf8')
      _cachedConfig = JSON.parse(raw) as RuntimeLLMConfig
    } else {
      _cachedConfig = {}
    }
  } catch {
    _cachedConfig = {}
  }
  _cachedAt = now
  return _cachedConfig
}

/**
 * Force a re-read on next call (used by the admin API after a config update).
 * Exported so /api/admin/llm-config can invalidate the cache after writing.
 */
export function invalidateLLMConfigCache() {
  _cachedConfig = null
  _cachedAt = 0
}

// ============================================================================
// Provider resolution — runtime config first, then env, then zai default
// ============================================================================
const VALID_PROVIDERS: LLMProvider[] = ['zai', 'openai', 'anthropic', 'mistral', 'openrouter', 'local']

function getProvider(): LLMProvider {
  const rc = readRuntimeConfig()
  if (rc.provider && VALID_PROVIDERS.includes(rc.provider)) {
    return rc.provider!
  }
  const p = (process.env.LLM_PROVIDER || 'zai').toLowerCase()
  if (VALID_PROVIDERS.includes(p as LLMProvider)) {
    return p as LLMProvider
  }
  return 'zai'
}

function getModel(provider: LLMProvider): string {
  const rc = readRuntimeConfig()
  if (rc.model) return rc.model
  if (process.env.LLM_MODEL) return process.env.LLM_MODEL
  switch (provider) {
    case 'openai':      return 'gpt-4o'
    case 'anthropic':   return 'claude-3-5-sonnet-20241022'
    case 'mistral':     return 'mistral-large-latest'
    case 'openrouter':  return 'anthropic/claude-3.5-sonnet'
    case 'local':       return 'local-model' // overridden by user in admin UI
    default:            return '' // zai: SDK picks the default
  }
}

function getApiKey(provider: LLMProvider): string {
  const rc = readRuntimeConfig()
  switch (provider) {
    case 'openai':      return rc.openaiApiKey      || process.env.OPENAI_API_KEY      || ''
    case 'anthropic':   return rc.anthropicApiKey   || process.env.ANTHROPIC_API_KEY   || ''
    case 'mistral':     return rc.mistralApiKey     || process.env.MISTRAL_API_KEY     || ''
    case 'openrouter':  return rc.openrouterApiKey  || process.env.OPENROUTER_API_KEY  || ''
    case 'local':       return rc.localApiKey       || process.env.LOCAL_API_KEY       || ''
    default:            return ''
  }
}

function getOpenAIBaseUrl(): string {
  const rc = readRuntimeConfig()
  return rc.openaiBaseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
}

function getLocalBaseUrl(): string {
  const rc = readRuntimeConfig()
  return rc.localBaseUrl || process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1'
}

// ============================================================================
// Main entry — chat completion
// ============================================================================
/**
 * Send a chat completion request and return the assistant's text reply.
 *
 * Throws on error — caller is responsible for try/catch (existing endpoints
 * already wrap calls in try/catch).
 */
export async function chatLLM(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const provider = opts.provider || getProvider()
  const model = opts.model || getModel(provider)

  switch (provider) {
    case 'zai':
      return chatZAI(messages, opts)
    case 'openai':
      return chatOpenAICompatible(messages, opts, {
        baseUrl: getOpenAIBaseUrl(),
        apiKey: getApiKey('openai'),
        model,
      })
    case 'mistral':
      return chatOpenAICompatible(messages, opts, {
        baseUrl: 'https://api.mistral.ai/v1',
        apiKey: getApiKey('mistral'),
        model,
      })
    case 'openrouter':
      return chatOpenAICompatible(messages, opts, {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: getApiKey('openrouter'),
        model,
      })
    case 'anthropic':
      return chatAnthropic(messages, opts, getApiKey('anthropic'), model)
    case 'local':
      // Local LLM server (Ollama, LM Studio, vLLM, llama.cpp, text-generation-webui…)
      // All of them expose an OpenAI-compatible /v1/chat/completions endpoint.
      // API key is optional (some servers require a dummy "Bearer sk-..." header).
      return chatOpenAICompatible(messages, opts, {
        baseUrl: getLocalBaseUrl(),
        apiKey: getApiKey('local') || 'no-key-required',
        model,
      })
  }
}

// ============================================================================
// ZAI provider (default — uses z-ai-web-dev-sdk)
// ============================================================================
async function chatZAI(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: messages as any,
    thinking: { type: opts.thinking === 'enabled' ? 'enabled' : 'disabled' },
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2200,
  })
  return completion.choices[0]?.message?.content || ''
}

// ============================================================================
// OpenAI-compatible provider (OpenAI, Mistral, OpenRouter, vLLM, LM Studio…)
// ============================================================================
async function chatOpenAICompatible(
  messages: ChatMessage[],
  opts: ChatOptions,
  cfg: { baseUrl: string; apiKey: string; model: string },
): Promise<string> {
  if (!cfg.apiKey) {
    throw new Error(
      `LLM provider requires an API key. Set the matching env var (e.g. OPENAI_API_KEY) in .env.local.`,
    )
  }
  const body = {
    model: cfg.model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 2200,
  }
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
      // OpenRouter recommends these optional headers for analytics
      ...(cfg.baseUrl.includes('openrouter')
        ? { 'HTTP-Referer': 'https://rimiris.ai', 'X-Title': 'Rimiris AI' }
        : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LLM API error ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// ============================================================================
// Anthropic provider (Claude)
// ============================================================================
async function chatAnthropic(
  messages: ChatMessage[],
  opts: ChatOptions,
  apiKey: string,
  model: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Configure it via the admin portal or .env.local.')
  }
  // Anthropic splits system message from the rest
  const systemMsgs = messages.filter((m) => m.role === 'system')
  const convoMsgs = messages.filter((m) => m.role !== 'system')
  const systemPrompt = systemMsgs.map((m) => m.content).join('\n\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt || undefined,
      messages: convoMsgs.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2200,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ============================================================================
// Utility — get current provider for debugging/logging
// ============================================================================
export function getCurrentProvider(): LLMProvider {
  return getProvider()
}
