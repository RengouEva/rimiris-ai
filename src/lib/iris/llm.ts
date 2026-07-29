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
  /** Optional provider override (else read from env LLM_PROVIDER). */
  provider?: LLMProvider
  /** Optional model override (else read from env LLM_MODEL or default). */
  model?: string
  /** ZAI-specific: enable/disable thinking mode. Default: disabled. */
  thinking?: 'enabled' | 'disabled'
}

export type LLMProvider = 'zai' | 'openai' | 'anthropic' | 'mistral' | 'openrouter'

// ============================================================================
// Provider resolution
// ============================================================================
function getProvider(): LLMProvider {
  const p = (process.env.LLM_PROVIDER || 'zai').toLowerCase()
  if (['zai', 'openai', 'anthropic', 'mistral', 'openrouter'].includes(p)) {
    return p as LLMProvider
  }
  return 'zai'
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

  switch (provider) {
    case 'zai':
      return chatZAI(messages, opts)
    case 'openai':
      return chatOpenAICompatible(messages, opts, {
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: opts.model || process.env.LLM_MODEL || 'gpt-4o',
      })
    case 'mistral':
      return chatOpenAICompatible(messages, opts, {
        baseUrl: 'https://api.mistral.ai/v1',
        apiKey: process.env.MISTRAL_API_KEY || '',
        model: opts.model || process.env.LLM_MODEL || 'mistral-large-latest',
      })
    case 'openrouter':
      return chatOpenAICompatible(messages, opts, {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: opts.model || process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet',
      })
    case 'anthropic':
      return chatAnthropic(messages, opts)
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
async function chatAnthropic(messages: ChatMessage[], opts: ChatOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to .env.local.')
  }
  const model = opts.model || process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022'
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
