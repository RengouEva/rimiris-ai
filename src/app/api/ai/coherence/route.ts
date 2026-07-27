import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { CHAPTERS } from '@/lib/iris/chapters'

export const runtime = 'nodejs'
export const maxDuration = 60

interface CoherenceRequest {
  project: Record<string, any>
  chapters: Record<string, { content: string; status: string }>
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CoherenceRequest
    const { project, chapters } = body

    // Construire un résumé des contenus rédigés
    const drafted = CHAPTERS.filter((c) => (chapters[c.id]?.content || '').trim().length > 100)
      .map((c) => {
        const content = (chapters[c.id]?.content || '').trim()
        return `### ${c.title}\n${content.slice(0, 1500)}${content.length > 1500 ? '...' : ''}`
      })
      .join('\n\n---\n\n')

    if (!drafted) {
      return NextResponse.json({
        issues: [
          {
            id: 'no-content',
            severity: 'low',
            chapter: 'global',
            message: "Aucun chapitre n'a encore été rédigé substantiellement.",
            suggestion: "Commencez par le chapitre 'Choix du sujet' ou 'Introduction'.",
          },
        ],
      })
    }

    const systemPrompt = `Tu es Dr. Qualité, expert en contrôle qualité académique. Tu vas analyser la cohérence globale du mémoire de l'étudiant et identifier les problèmes.

CONTEXTE :
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Titre du mémoire : ${project.title || 'à définir'}
- Thème : ${project.theme || 'non précisé'}

CONTENU DES CHAPITRES RÉDIGÉS :
${drafted}

ANALYSE À EFFECTUER :
1. Le titre reflète-t-il bien la problématique et le contenu ?
2. La problématique est-elle cohérente avec les questions de recherche ?
3. Les objectifs sont-ils alignés avec la problématique ?
4. Les hypothèses répondent-elles aux questions de recherche ?
5. La méthodologie permet-elle de tester les hypothèses ?
6. Les résultats répondent-ils aux questions de recherche ?
7. La conclusion apporte-t-elle une réponse explicite à la problématique ?
8. Y a-t-il des contradictions internes entre chapitres ?

RÉPONDS UNIQUEMENT AU FORMAT JSON SUIVANT (aucun texte avant ou après) :
{
  "issues": [
    {
      "severity": "high" | "medium" | "low",
      "chapter": "id du chapitre concerné (sujet, introduction, contexte, problematique, questions, objectifs, hypotheses, justification, literature, cadre, methodologie, resultats, discussion, conclusion, recommandations, ou 'global')",
      "message": "description précise du problème de cohérence",
      "suggestion": "correction proposée, concrète et applicable"
    }
  ]
}

Si aucune incohérence n'est détectée, retourne {"issues": []}.
Maximum 8 problèmes. Priorise les problèmes de haute gravité.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: 'Analyse la cohérence et retourne le JSON.' },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.3,
      max_tokens: 2000,
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    // Extraire le JSON
    let issues = []
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
      issues = Array.isArray(parsed.issues) ? parsed.issues : []
    } catch {
      issues = [
        {
          severity: 'low',
          chapter: 'global',
          message: 'Analyse terminée mais format de réponse inattendu.',
          suggestion: 'Relancez la vérification de cohérence.',
        },
      ]
    }

    // Ajouter IDs
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
            chapter: 'global',
            message: "La vérification automatique n'a pas pu aboutir.",
            suggestion: 'Réessayez dans un instant.',
          },
        ],
      },
      { status: 500 }
    )
  }
}
