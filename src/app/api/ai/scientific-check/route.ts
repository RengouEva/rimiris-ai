import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'
import { requireSession, checkLLMRateLimit } from '@/lib/iris/security'

export const runtime = 'nodejs'
export const maxDuration = 90

// ============================================================================
// /api/ai/scientific-check — Phase 6
// Vérifie la cohérence scientifique globale :
//   objectifs ↔ problématique
//   hypothèses ↔ objectifs
//   méthodologie ↔ hypothèses
//   résultats ↔ méthodologie
//   conclusion ↔ résultats
// Toute incohérence est signalée avec sévérité + suggestion de correction.
// ============================================================================

interface ScientificCheckRequest {
  project: { title?: string; level?: string; filiere?: string }
  sections: { title: string; content: string }[]
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
    const body = (await req.json()) as ScientificCheckRequest
    const { project, sections } = body

    const sectionsStr = sections
      .filter((s) => s.content && s.content.trim())
      .map((s) => `## ${s.title}\n${s.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800)}`)
      .join('\n\n')

    if (!sectionsStr) {
      return NextResponse.json({
        issues: [],
        message: 'Aucune section avec contenu à vérifier.',
      })
    }

    const systemPrompt = `Tu es le Contrôleur qualité de Rimiris AI. Vérifie la cohérence scientifique globale du mémoire suivant.

PROJET :
- Titre : ${project.title || 'non précisé'}
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}

CONTENU DES SECTIONS :
${sectionsStr}

Vérifie ces 5 chaînes de cohérence :
1. Objectifs ↔ Problématique : les objectifs répondent-ils à la problématique ?
2. Hypothèses ↔ Objectifs : les hypothèses découlent-elles des objectifs ?
3. Méthodologie ↔ Hypothèses : la méthode permet-elle de tester les hypothèses ?
4. Résultats ↔ Méthodologie : les résultats sont-ils produits par la méthode décrite ?
5. Conclusion ↔ Résultats : la conclusion se fonde-t-elle sur les résultats présentés ?

Pour chaque incohérence détectée, décris précisément :
- La section concernée
- La sévérité (high = bloque la soutenance / medium = faiblesse / low = amélioration)
- Le problème
- Une suggestion de correction concrète

Réponds UNIQUEMENT en JSON :
{
  "issues": [
    {
      "id": "iss-1",
      "chain": "Objectifs ↔ Problématique",
      "sectionTitle": "...",
      "severity": "high|medium|low",
      "message": "...",
      "suggestion": "..."
    }
  ],
  "summary": "Résumé global en 2-3 phrases"
}`

    const raw = await chatLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Vérifie la cohérence scientifique.' },
      ],
      {
        temperature: 0.3,
        maxTokens: 1500,
        thinking: 'disabled',
      },
    )
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { issues: [], summary: 'Vérification terminée.' }
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('[API /ai/scientific-check] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
