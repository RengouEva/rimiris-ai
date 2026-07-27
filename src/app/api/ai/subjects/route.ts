import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SubjectsRequest {
  project: {
    filiere?: string
    level?: string
    country?: string
    theme?: string
    entreprise?: string
    department?: string
  }
  keywords?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubjectsRequest
    const { project, keywords } = body

    const systemPrompt = `Tu es Pr. IRIS, directeur de mémoire. L'étudiant cherche un sujet de recherche. Propose 5 sujets pertinents, originaux et faisables, basés sur le profil de l'étudiant.

PROFIL DE L'ÉTUDIANT :
- Filière : ${project.filiere || 'non précisée'}
- Département : ${project.department || 'non précisé'}
- Niveau : ${project.level || 'Master'}
- Pays : ${project.country || 'non précisé'}
- Thème général d'intérêt : ${project.theme || 'non précisé'}
- Entreprise de stage : ${project.entreprise || 'aucune'}
- Mots-clés additionnels : ${keywords || 'aucun'}

INSTRUCTIONS :
Pour chaque sujet, fournis :
1. Un intitulé de sujet précis et académique
2. Une note d'actualité (pourquoi ce sujet maintenant ?)
3. Une note de faisabilité (données, terrain, temps)
4. Une note d'originalité (par rapport à la littérature)
5. Une problématique provisoire en UNE question

Présente chaque sujet avec un numéro, un titre en gras, puis les 5 dimensions. Sois exigeant : les sujets doivent être adaptés au niveau ${project.level || 'Master'} et au contexte ${project.country || 'pays en développement'}.

Réponds en français académique. Format Markdown lisible.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Propose-moi 5 sujets de mémoire.` },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.9,
      max_tokens: 2000,
    })

    const reply = completion.choices[0]?.message?.content || '...'
    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[API /ai/subjects] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        reply:
          "Je n'ai pas pu générer de propositions pour le moment. Pouvez-vous préciser votre filière et un thème qui vous intéresse ?",
      },
      { status: 500 }
    )
  }
}
