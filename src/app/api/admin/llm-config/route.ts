import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { invalidateLLMConfigCache, type LLMProvider } from '@/lib/iris/llm'
import { getCurrentSession, isSuperAdmin } from '@/lib/iris/auth'

export const runtime = 'nodejs'

// ============================================================================
// Path to the runtime config file
// ============================================================================
const CONFIG_PATH = path.join(process.cwd(), '.llm-config.json')

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

// ============================================================================
// Helpers
// ============================================================================
function readConfig(): RuntimeLLMConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    }
  } catch {
    /* corrupt JSON — return empty */
  }
  return {}
}

function writeConfig(cfg: RuntimeLLMConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
}

function maskKey(k?: string): string {
  if (!k) return ''
  if (k.length <= 8) return '••••'
  return `${k.slice(0, 4)}••••${k.slice(-4)}`
}

function ensureAdmin() {
  const session = getCurrentSession()
  if (!isSuperAdmin(session)) {
    return NextResponse.json(
      { error: 'Forbidden — super admin only.' },
      { status: 403 },
    )
  }
  return null
}

// ============================================================================
// GET /api/admin/llm-config
// Returns the current config (API keys are masked).
// ============================================================================
export async function GET() {
  const forbidden = ensureAdmin()
  if (forbidden) return forbidden

  const cfg = readConfig()
  return NextResponse.json({
    provider: cfg.provider || process.env.LLM_PROVIDER || 'zai',
    model: cfg.model || process.env.LLM_MODEL || '',
    openai: {
      hasKey: !!(cfg.openaiApiKey || process.env.OPENAI_API_KEY),
      masked: maskKey(cfg.openaiApiKey || process.env.OPENAI_API_KEY),
      baseUrl: cfg.openaiBaseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
    anthropic: {
      hasKey: !!(cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
      masked: maskKey(cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
    },
    mistral: {
      hasKey: !!(cfg.mistralApiKey || process.env.MISTRAL_API_KEY),
      masked: maskKey(cfg.mistralApiKey || process.env.MISTRAL_API_KEY),
    },
    openrouter: {
      hasKey: !!(cfg.openrouterApiKey || process.env.OPENROUTER_API_KEY),
      masked: maskKey(cfg.openrouterApiKey || process.env.OPENROUTER_API_KEY),
    },
    local: {
      hasKey: !!(cfg.localApiKey || process.env.LOCAL_API_KEY),
      masked: maskKey(cfg.localApiKey || process.env.LOCAL_API_KEY),
      baseUrl: cfg.localBaseUrl || process.env.LOCAL_BASE_URL || 'http://localhost:11434/v1',
    },
  })
}

// ============================================================================
// POST /api/admin/llm-config
// Updates the runtime config. Body shape:
// {
//   provider?: LLMProvider,
//   model?: string,
//   openaiApiKey?: string,         // empty string = leave unchanged; null = clear
//   anthropicApiKey?: string,
//   mistralApiKey?: string,
//   openrouterApiKey?: string,
//   openaiBaseUrl?: string,
//   test?: boolean                  // if true, sends a tiny test prompt
// }
// ============================================================================
export async function POST(req: NextRequest) {
  const forbidden = ensureAdmin()
  if (forbidden) return forbidden

  try {
    const body = await req.json()
    const cfg = readConfig()

    if (body.provider) {
      const valid: LLMProvider[] = ['zai', 'openai', 'anthropic', 'mistral', 'openrouter']
      if (!valid.includes(body.provider)) {
        return NextResponse.json({ error: 'Invalid provider.' }, { status: 400 })
      }
      cfg.provider = body.provider
    }
    if (typeof body.model === 'string') {
      cfg.model = body.model.trim() || undefined
    }
    if (typeof body.openaiBaseUrl === 'string') {
      cfg.openaiBaseUrl = body.openaiBaseUrl.trim() || undefined
    }
    if (typeof body.localBaseUrl === 'string') {
      cfg.localBaseUrl = body.localBaseUrl.trim() || undefined
    }
    // API keys: empty string = leave unchanged; null = clear; otherwise set
    const keyFields = ['openaiApiKey', 'anthropicApiKey', 'mistralApiKey', 'openrouterApiKey', 'localApiKey'] as const
    for (const field of keyFields) {
      const v = body[field]
      if (v === undefined) continue
      if (v === null) {
        ;(cfg as any)[field] = undefined
      } else if (v === '') {
        // leave unchanged
      } else {
        ;(cfg as any)[field] = String(v).trim()
      }
    }

    writeConfig(cfg)
    invalidateLLMConfigCache()

    // Optional: send a test prompt to verify the new config works
    let testResult: { ok: boolean; reply?: string; error?: string } | undefined
    if (body.test) {
      try {
        const { chatLLM } = await import('@/lib/iris/llm')
        const reply = await chatLLM(
          [
            { role: 'system', content: 'Tu es un assistant de test.' },
            { role: 'user', content: 'Réponds simplement : "OK"' },
          ],
          { temperature: 0, maxTokens: 10 },
        )
        testResult = { ok: true, reply: reply.slice(0, 100) }
      } catch (e: any) {
        testResult = { ok: false, error: e?.message || String(e) }
      }
    }

    return NextResponse.json({ ok: true, test: testResult })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to update config.' },
      { status: 500 },
    )
  }
}
