import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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

    const systemPrompt = `Tu es Dr. Soutenance, expert en préparation de soutenance. Génère un kit complet.

CONTEXTE :
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Titre : ${project.title || 'à définir'}
- Norme : ${project.norme || 'APA'}

MÉMOIRE RÉDIGÉ :
${drafted || "L'étudiant n'a pas encore rédigé significativement."}

GÉNÈRE UNIQUEMENT UN OBJET JSON VALIDE :
{
  "summary": "Résumé 250-300 mots (contexte, problématique, méthodologie, résultats, conclusion)",
  "presentationOutline": [
    { "title": "Titre diapo", "bullets": ["Point 1", "Point 2", "Point 3"] }
  ],
  "juryQuestions": [
    { "question": "...", "suggestedAnswer": "...", "difficulty": "facile" | "moyenne" | "difficile" }
  ],
  "weakPoints": ["Point faible 1", "..."]
}

10-12 diapositives, 8-10 questions jury, 4-6 points faibles. Français académique.`

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
