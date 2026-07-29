import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 90

// ============================================================================
// /api/ai/understand — Phase 1
// IRIS analyse le thème, identifie concepts / mots-clés / domaine / disciplines /
// recherches similaires / applications / limites, et produit un résumé à valider.
// ============================================================================

interface UnderstandRequestBody {
  theme: string
  level?: string
  field?: string
  country?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UnderstandRequestBody
    const theme = body.theme?.trim()
    if (!theme) {
      return NextResponse.json({ error: 'Thème requis' }, { status: 400 })
    }

    const systemPrompt = `Tu es le Chercheur documentaire de Rimiris AI. Analyse le thème suivant et produis une compréhension structurée.

THÈME : "${theme}"
NIVEAU : ${body.level || 'Master'}
FILIÈRE : ${body.field || 'non précisée'}
PAYS : ${body.country || 'non précisé'}

INSTRUCTIONS :
1. Identifie 4 à 6 concepts clés liés au thème.
2. Identifie 6 à 10 mots-clés pertinents (pour recherche documentaire).
3. Identifie le domaine scientifique principal.
4. Identifie 2 à 4 disciplines concernées (approche interdisciplinaire si pertinent).
5. Identifie 3 à 5 axes de recherche similaires déjà étudiés dans la littérature.
6. Identifie 2 à 4 applications pratiques du thème.
7. Identifie 2 à 4 limites potentielles ou zones d'ombre à explorer.
8. Rédige un résumé de 4 à 6 phrases qui montre ta compréhension du thème.

Réponds UNIQUEMENT avec ce JSON strict, sans code fences ni commentaire :
{
  "concepts": ["..."],
  "keywords": ["..."],
  "domain": "...",
  "disciplines": ["..."],
  "similarResearch": ["..."],
  "applications": ["..."],
  "limits": ["..."],
  "summary": "..."
}`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Analyse ce thème : ${theme}` },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.6,
      max_tokens: 1500,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        concepts: [],
        keywords: theme.split(/\s+/).slice(0, 5),
        domain: body.field || 'à préciser',
        disciplines: [],
        similarResearch: [],
        applications: [],
        limits: [],
        summary: cleaned.slice(0, 500),
      }
    }

    return NextResponse.json({
      ...parsed,
      validated: false,
    })
  } catch (err: any) {
    console.error('[API /ai/understand] Error:', err)
    return NextResponse.json(
      { error: err?.message },
      { status: 500 }
    )
  }
}
