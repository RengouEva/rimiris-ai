import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'
import { requireSession, checkLLMRateLimit } from '@/lib/iris/security'

export const runtime = 'nodejs'
export const maxDuration = 90

// ============================================================================
// /api/ai/problem-build — Phase 2
// Au lieu de demander "depuis quand ce problème existe-t-il ?", IRIS raisonne
// à partir du thème + compréhension, et propose 3 hypothèses de contexte
// argumentées entre lesquelles l'étudiant choisit.
// ============================================================================

interface ProblemBuildRequestBody {
  theme: string
  understanding?: {
    concepts?: string[]
    keywords?: string[]
    domain?: string
    disciplines?: string[]
    summary?: string
  }
  level?: string
  field?: string
  // If the student rejected a previous batch, we regenerate new ones
  rejected?: string[]
  // If the student is editing one, we produce alternative formulations
  editBase?: string
}

export async function POST(req: NextRequest) {
  // VULN-02 + VULN-12: Auth + rate limiting
  const auth = requireSession(req)
  if (!auth.ok) return auth.response!
  const llmRL = checkLLMRateLimit(req, auth.session!.accountId)
  if (!llmRL.allowed) {
    return NextResponse.json({ error: llmRL.error }, { status: 429 })
  }

  try {
    const body = (await req.json()) as ProblemBuildRequestBody
    const { theme, understanding, level = 'Master', field, rejected = [], editBase } = body

    const contextStr = understanding
      ? `COMPRÉHENSION DU THÈME (Phase 1) :
- Concepts clés : ${(understanding.concepts || []).join(', ')}
- Mots-clés : ${(understanding.keywords || []).join(', ')}
- Domaine : ${understanding.domain || 'non précisé'}
- Disciplines : ${(understanding.disciplines || []).join(', ')}
- Résumé : ${understanding.summary || ''}`
      : `THÈME : "${theme}"`

    const rejectedStr = rejected.length
      ? `\nHYPOTHÈSES DÉJÀ REJETÉES (ne pas reproduire) :\n${rejected.map((r) => `- ${r}`).join('\n')}`
      : ''

    const editStr = editBase
      ? `\nL'étudiant souhaite modifier cette hypothèse de base : "${editBase}". Propose 3 reformulations alternatives qui gardent le même sens mais affinent le positionnement.`
      : ''

    const systemPrompt = `Tu es le Coach méthodologique de Rimiris AI. Tu aides l'étudiant à CONSTRUIRE son problème de recherche.

${contextStr}

NIVEAU : ${level}
FILIÈRE : ${field || 'non précisée'}${rejectedStr}${editStr}

INSTRUCTIONS :
1. Ne pose JAMAIS de question abrupte comme "Depuis quand ce problème existe-t-il ?".
2. Raisonne d'abord à partir des informations disponibles.
3. Propose 3 hypothèses de contexte, chacune :
   - Formulée en 2-3 phrases complètes
   - Argumentée (pourquoi cette hypothèse est pertinente)
   - Spécifique au thème et au niveau d'études
   - Suffisamment différente des deux autres pour que l'étudiant puisse vraiment choisir
4. Pour chaque hypothèse, identifie en 1 phrase la conséquence méthodologique (ce que ça implique pour la suite du mémoire).
5. Une fois l'étudiant aura choisi, on bâtira la problématique complète.

Réponds UNIQUEMENT avec ce JSON strict :
{
  "reasoning": "Analyse en 3-4 phrases du raisonnement qui t'a mené à ces hypothèses",
  "hypotheses": [
    {
      "id": "h1",
      "label": "Titre court de l'hypothèse",
      "statement": "Énoncé complet en 2-3 phrases",
      "rationale": "Pourquoi cette hypothèse est pertinente",
      "methodologicalConsequence": "Ce que ça implique pour la suite"
    },
    { "id": "h2", ... },
    { "id": "h3", ... }
  ]
}`

    const raw = await chatLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Propose 3 hypothèses de contexte pour : ${theme}` },
      ],
      {
        temperature: 0.75,
        maxTokens: 1800,
        thinking: 'disabled',
      },
    )
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        reasoning: 'Analyse en cours...',
        hypotheses: [
          {
            id: 'h1',
            label: 'Hypothèse 1',
            statement: 'Le thème soulève des enjeux contemporains majeurs.',
            rationale: 'Pertinence académique et sociale.',
            methodologicalConsequence: 'Approche qualitative recommandée.',
          },
        ],
      }
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('[API /ai/problem-build] Error:', err)
    return NextResponse.json(
      { error: err?.message },
      { status: 500 }
    )
  }
}
