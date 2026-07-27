import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { CHAPTERS } from '@/lib/iris/chapters'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SoutenanceRequest {
  project: Record<string, any>
  chapters: Record<string, { content: string }>
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SoutenanceRequest
    const { project, chapters } = body

    const drafted = CHAPTERS.filter((c) => (chapters[c.id]?.content || '').trim().length > 100)
      .map((c) => {
        const content = (chapters[c.id]?.content || '').trim()
        return `### ${c.title}\n${content.slice(0, 1200)}${content.length > 1200 ? '...' : ''}`
      })
      .join('\n\n')

    const systemPrompt = `Tu es Dr. Soutenance, expert en préparation de soutenance de mémoire. L'étudiant a terminé (ou presque) son mémoire. Tu vas générer un kit complet de préparation à la soutenance.

CONTEXTE :
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Titre du mémoire : ${project.title || 'à définir'}
- Norme de citation : ${project.norme || 'APA'}

MÉMOIRE RÉDIGÉ :
${drafted || "L'étudiant n'a pas encore rédigé significativement son mémoire."}

GÉNÈRE UNIQUEMENT UN OBJET JSON VALIDE (aucun texte avant ou après) avec cette structure exacte :

{
  "summary": "Résumé académique de 250-300 mots du mémoire, structuré (contexte, problématique, méthodologie, résultats principaux, conclusion).",
  "presentationOutline": [
    { "title": "Titre de la diapositive 1", "bullets": ["Point 1", "Point 2", "Point 3"] },
    ... 10 à 12 diapositives au total, couvrant : titre, plan, contexte, problématique, questions, méthodologie, résultats principaux, discussion, conclusion, recommandations, références, remerciements
  ],
  "juryQuestions": [
    {
      "question": "Question précise du jury",
      "suggestedAnswer": "Réponse suggérée en 3-4 phrases, structurée et défendable",
      "difficulty": "facile" | "moyenne" | "difficile"
    },
    ... 8 à 10 questions au total, couvrant : méthodologie, résultats, limites, originalité, perspectives, questions piège
  ],
  "weakPoints": [
    "Point faible 1 à renforcer avant la soutenance",
    ... 4 à 6 points faibles concrets
  ]
}

Adapte la profondeur au niveau ${project.level || 'Master'} (Doctorat = beaucoup plus exigeant que Licence). Réponds en français académique.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: 'Génère le kit de soutenance.' },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.6,
      max_tokens: 4000,
    })

    const raw = completion.choices[0]?.message?.content || '{}'

    // Extraire le JSON
    let data: any = null
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      data = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json(
        {
          error: 'Format de réponse inattendu',
          data: null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[API /ai/soutenance] Error:', err)
    return NextResponse.json({ error: err?.message, data: null }, { status: 500 })
  }
}
