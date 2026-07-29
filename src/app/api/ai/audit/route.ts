import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { buildGuideContext } from '@/lib/iris/prompt-context'

export const runtime = 'nodejs'
export const maxDuration = 120

// ============================================================================
// /api/ai/audit — Phase 7
// Génère un rapport d'audit global avec scores par dimension (0-100) :
//   - Cohérence scientifique
//   - Structure
//   - Style académique
//   - Bibliographie
//   - Transitions
// Et pour chaque dimension, des améliorations précises.
// ============================================================================

interface AuditRequest {
  project: { title?: string; level?: string; filiere?: string; norme?: string; guideFileName?: string; guideText?: string }
  sections: { title: string; content: string }[]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditRequest
    const { project, sections } = body

    const sectionsStr = sections
      .filter((s) => s.content && s.content.trim())
      .map((s) => `## ${s.title}\n${s.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200)}`)
      .join('\n\n---\n\n')

    if (!sectionsStr) {
      return NextResponse.json({
        scores: [],
        globalScore: 0,
        message: 'Aucun contenu à auditer.',
      })
    }

    const guideContext = buildGuideContext(project)
    const systemPrompt = `Tu es le Contrôleur qualité de Rimiris AI. Réalise l'audit final du mémoire suivant.

PROJET :
- Titre : ${project.title || 'non précisé'}
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filière || 'non précisée'}
- Norme : ${project.norme || 'APA'}
${guideContext ? '\n' + guideContext : ''}
CONTENU :
${sectionsStr}

Évalue 5 dimensions, chacune sur 100 :
1. Cohérence scientifique : les objectifs/hypothèses/méthodo/résultats/conclusion s'enchaînent-ils logiquement ?
2. Structure : la hiérarchie des titres, la longueur des sections, l'équilibre du plan.
3. Style académique : registre, précision du vocabulaire, qualité des phrases.
4. Bibliographie : citations présentes et bien formatées, intégrité scientifique.
5. Transitions : fluidité entre paragraphes et sections.

Pour chaque dimension, donne :
- Le score (0-100)
- Une note justificative (1-2 phrases)
- 2 à 4 améliorations concrètes et actionnables

Calcule aussi le score global (moyenne pondérée : 30% cohérence, 25% structure, 20% style, 15% biblio, 10% transitions).

Réponds UNIQUEMENT en JSON :
{
  "scores": [
    {
      "dimension": "Cohérence scientifique",
      "score": 96,
      "notes": "...",
      "improvements": ["...", "..."]
    },
    ...
  ],
  "globalScore": 95,
  "globalNotes": "Résumé global du mémoire en 2-3 phrases"
}`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: 'Réalise l\'audit complet.' },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.3,
      max_tokens: 2200,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = {
        scores: [
          { dimension: 'Cohérence scientifique', score: 50, notes: 'Audit partiel', improvements: [] },
          { dimension: 'Structure', score: 50, notes: 'Audit partiel', improvements: [] },
          { dimension: 'Style académique', score: 50, notes: 'Audit partiel', improvements: [] },
          { dimension: 'Bibliographie', score: 50, notes: 'Audit partiel', improvements: [] },
          { dimension: 'Transitions', score: 50, notes: 'Audit partiel', improvements: [] },
        ],
        globalScore: 50,
        globalNotes: 'Audit partiel en raison d\'une erreur de parsing.',
      }
    }

    return NextResponse.json({
      scores: parsed.scores || [],
      globalScore: parsed.globalScore || 0,
      globalNotes: parsed.globalNotes || '',
      generatedAt: Date.now(),
    })
  } catch (err: any) {
    console.error('[API /ai/audit] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
