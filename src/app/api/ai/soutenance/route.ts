import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'
import { buildGuideContext } from '@/lib/iris/prompt-context'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SoutenanceRequest {
  project: Record<string, any>
  sections: { title: string; content: string }[]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SoutenanceRequest
    const { project, sections } = body

    const drafted = sections
      .filter((s) => s.content.trim().length > 100)
      .map((s) => {
        const c = s.content.trim()
        return `### ${s.title}\n${c.slice(0, 1200)}${c.length > 1200 ? '...' : ''}`
      })
      .join('\n\n')

    const guideContext = buildGuideContext(project)
    const systemPrompt = `Tu es Dr. Soutenance, expert en préparation de soutenance. Génère un kit complet.

CONTEXTE :
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Titre : ${project.title || 'à définir'}
- Norme : ${project.norme || 'APA'}
${guideContext ? '\n' + guideContext + '\n' : ''}
MÉMOIRE RÉDIGÉ :
${drafted || "L'étudiant n'a pas encore rédigé significativement."}

GÉNÈRE UNIQUEMENT UN OBJET JSON VALIDE :
{
  "summary": "Résumé 250-300 mots (contexte, problématique, méthodologie, résultats, conclusion)",
  "presentationOutline": [
    { "title": "Titre diapo", "bullets": ["Point 1", "Point 2", "Point 3"] }
  ],
  "juryQuestions": [
    { "question": "...", "suggestedAnswer": "...", "difficulty": "facile" | "moyenne" | "difficile", "juryRole": "Président" | "Rapporteur" | "Directeur" | "Examinateur" }
  ],
  "weakPoints": ["Point faible 1", "..."]
}

10-12 diapositives, 8-10 questions jury (réparties entre Président, Rapporteur, Directeur et Examinateur), 4-6 points faibles. Français académique.`

    const raw = await chatLLM(
      [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: 'Génère le kit de soutenance.' },
      ],
      {
        temperature: 0.6,
        maxTokens: 4000,
        thinking: 'disabled',
      },
    ) || '{}'

    let data: any = null
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      data = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json({ error: 'Format inattendu', data: null }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[API /ai/soutenance] Error:', err)
    return NextResponse.json({ error: err?.message, data: null }, { status: 500 })
  }
}
