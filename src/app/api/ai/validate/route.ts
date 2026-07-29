import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { buildGuideContext } from '@/lib/iris/prompt-context'

export const runtime = 'nodejs'
export const maxDuration = 90

// ============================================================================
// /api/ai/validate — Phase 4 (alias of section-interview validate action)
// Used as a standalone endpoint for simplicity.
// ============================================================================

interface ValidateRequestBody {
  sectionTitle: string
  sectionDescription?: string
  project: any
  answers: { questionId: string; question: string; answer: string }[]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidateRequestBody
    const guideContext = buildGuideContext(body.project)

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `Tu es le Contrôleur qualité de Rimiris AI. Vérifie les réponses collectées pour cette section avant la rédaction.

SECTION : "${body.sectionTitle}"
${body.sectionDescription ? `Description : ${body.sectionDescription}` : ''}
Niveau : ${body.project?.level || 'Master'}
Thème : ${body.project?.title || 'non précisé'}
${guideContext ? '\n' + guideContext + '\n' : ''}
RÉPONSES COLLECTÉES :
${body.answers.map((a, i) => `${i + 1}. ${a.question || '(question)'}\n   → ${a.answer}`).join('\n')}

Vérifie 4 dimensions :
1. Cohérence : les réponses sont-elles cohérentes entre elles ?
2. Faisabilité : peut-on rédiger une section académique avec ces informations ?
3. Précision : les réponses sont-elles assez précises ?
4. Logique : l'enchaînement est-il logique ?

${guideContext ? 'IMPORTANT : vérifie aussi la conformité aux exigences du guide méthodologique de l\'université fourni ci-dessus.' : ''}

Réponds UNIQUEMENT en JSON :
{
  "coherence": { "ok": true/false, "notes": "..." },
  "feasibility": { "ok": true/false, "notes": "..." },
  "precision": { "ok": true/false, "notes": "..." },
  "logic": { "ok": true/false, "notes": "..." },
  "overallOk": true/false,
  "missingInfo": ["information manquante 1", "..."]
}`,
        },
        { role: 'user', content: 'Valide les réponses.' },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.4,
      max_tokens: 800,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    let validation: any
    try {
      validation = JSON.parse(cleaned)
      validation.overallOk = Boolean(validation.overallOk)
    } catch {
      validation = {
        coherence: { ok: true, notes: 'OK par défaut' },
        feasibility: { ok: true, notes: 'OK par défaut' },
        precision: { ok: true, notes: 'OK par défaut' },
        logic: { ok: true, notes: 'OK par défaut' },
        overallOk: true,
        missingInfo: [],
      }
    }
    return NextResponse.json(validation)
  } catch (err: any) {
    console.error('[API /ai/validate] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
