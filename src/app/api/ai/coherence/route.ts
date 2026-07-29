import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'

export const runtime = 'nodejs'
export const maxDuration = 60

interface CoherenceRequest {
  project: Record<string, any>
  sections: { title: string; content: string }[]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CoherenceRequest
    const { project, sections } = body

    const drafted = sections
      .filter((s) => s.content.trim().length > 100)
      .map((s) => {
        const c = s.content.trim()
        return `### ${s.title}\n${c.slice(0, 1500)}${c.length > 1500 ? '...' : ''}`
      })
      .join('\n\n---\n\n')

    if (!drafted) {
      return NextResponse.json({
        issues: [
          {
            id: 'no-content',
            severity: 'low' as const,
            sectionTitle: 'global',
            message: "Aucune section n'a encore été rédigée substantiellement.",
            suggestion: "Commencez par rédiger une première section.",
          },
        ],
      })
    }

    const systemPrompt = `Tu es Dr. Qualité, expert en contrôle qualité académique. Analyse la cohérence du mémoire de l'étudiant.

CONTEXTE :
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Titre : ${project.title || 'à définir'}

CONTENU DES SECTIONS RÉDIGÉES :
${drafted}

ANALYSE :
1. Le titre reflète-t-il le contenu ?
2. Y a-t-il une problématique claire ?
3. Les objectifs / hypothèses sont-ils cohérents avec la problématique ?
4. La méthodologie permet-elle de répondre aux questions ?
5. Les résultats répondent-ils aux questions ?
6. La conclusion apporte-t-elle une réponse explicite ?
7. Y a-t-il des contradictions entre sections ?

RÉPONDS UNIQUEMENT AU FORMAT JSON :
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "sectionTitle": "titre de la section concernée (ou 'global')",
      "message": "description précise du problème",
      "suggestion": "correction proposée, concrète et applicable"
    }
  ]
}

Si aucune incohérence, retourne {"issues": []}. Maximum 8 problèmes.`

    const raw = await chatLLM(
      [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: 'Analyse la cohérence et retourne le JSON.' },
      ],
      {
        temperature: 0.3,
        maxTokens: 2000,
        thinking: 'disabled',
      },
    ) || '{}'

    let issues = []
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
      issues = Array.isArray(parsed.issues) ? parsed.issues : []
    } catch {
      issues = [
        {
          severity: 'low',
          sectionTitle: 'global',
          message: 'Analyse terminée mais format inattendu.',
          suggestion: 'Relancez la vérification.',
        },
      ]
    }

    const issuesWithIds = issues.map((iss: any, idx: number) => ({
      id: `issue-${Date.now()}-${idx}`,
      ...iss,
    }))

    return NextResponse.json({ issues: issuesWithIds })
  } catch (err: any) {
    console.error('[API /ai/coherence] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        issues: [
          {
            id: 'error',
            severity: 'low',
            sectionTitle: 'global',
            message: "La vérification n'a pas pu aboutir.",
            suggestion: 'Réessayez dans un instant.',
          },
        ],
      },
      { status: 500 }
    )
  }
}
