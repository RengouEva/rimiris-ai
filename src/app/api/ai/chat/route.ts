import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { AGENTS } from '@/lib/iris/agents'
import { CHAPTERS } from '@/lib/iris/chapters'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatRequestBody {
  chapterId: string
  agentId?: string
  project: {
    university?: string
    faculty?: string
    department?: string
    filiere?: string
    level?: string
    country?: string
    language?: string
    theme?: string
    entreprise?: string
    directeur?: string
    norme?: string
    title?: string
  }
  history: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  chapterContent?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody
    const { chapterId, agentId, project, history, userMessage, chapterContent } = body

    const chapter = CHAPTERS.find((c) => c.id === chapterId)
    if (!chapter) {
      return NextResponse.json({ error: 'Chapitre introuvable' }, { status: 400 })
    }

    const agent = AGENTS.find((a) => a.id === (agentId || chapter.agent)) || AGENTS[0]

    // Construction du contexte projet
    const projectContext = `
CONTEXTE DU PROJET ACADÉMIQUE :
- Université : ${project.university || 'non précisée'}
- Faculté : ${project.faculty || 'non précisée'}
- Département : ${project.department || 'non précisé'}
- Filière : ${project.filiere || 'non précisée'}
- Niveau : ${project.level || 'non précisé'}
- Pays : ${project.country || 'non précisé'}
- Langue de rédaction : ${project.language || 'Français'}
- Thème du mémoire : ${project.theme || 'non précisé'}
- Titre du mémoire : ${project.title || 'à définir'}
- Entreprise de stage : ${project.entreprise || 'aucune'}
- Directeur de mémoire : ${project.directeur || 'non précisé'}
- Norme de citation : ${project.norme || 'APA'}
`.trim()

    const chapterContext = `
CHAPITRE EN COURS : ${chapter.title}
DESCRIPTION : ${chapter.description}
ÉLÉMENTS À VÉRIFIER : ${chapter.keyElements.join(', ')}
QUESTIONS GUIDANTES DE CE CHAPITRE :
${chapter.guidingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
`.trim()

    const draftContext = chapterContent?.trim()
      ? `\nBROUILLON ACTUEL DE L'ÉTUDIANT POUR CE CHAPITRE :\n${chapterContent.trim().slice(0, 3000)}\n`
      : '\nL\'étudiant n\'a pas encore rédigé de brouillon pour ce chapitre.\n'

    // Messages pour l'IA
    const messages: { role: 'assistant' | 'user'; content: string }[] = [
      {
        role: 'assistant',
        content: `${agent.systemPrompt}

${projectContext}

${chapterContext}
${draftContext}

INSTRUCTIONS CRITIQUES :
- Tu travailles AVEC l'étudiant, tu NE rédiges JAMAIS à sa place des paragraphes entiers.
- Tu poses au maximum UNE question principale à la fois pour ne pas noyer l'étudiant.
- Si l'étudiant est bloqué, propose 2 ou 3 pistes concrètes et demande-lui laquelle il préfère.
- Adapte le niveau de langue au niveau d'étude (${project.level || 'Master'}).
- Si l'étudiant a déjà rédigé un brouillon, fais des retours constructifs et précis sur SON texte.
- Réponds en français académique chaleureux, jamais générique.`,
      },
      // Limited history (last 6 messages)
      ...history.slice(-6),
      { role: 'user', content: userMessage },
    ]

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
      temperature: 0.7,
      max_tokens: 800,
    })

    const reply = completion.choices[0]?.message?.content || '...'

    return NextResponse.json({
      reply,
      agent: { id: agent.id, name: agent.name, role: agent.role },
    })
  } catch (err: any) {
    console.error('[API /ai/chat] Error:', err)
    return NextResponse.json(
      {
        error: err?.message || 'Erreur lors de la communication avec l\'IA',
        reply:
          "Je rencontre une difficulté technique momentanée. Pouvez-vous reformuler votre demande ? Je reste à vos côtés.",
      },
      { status: 500 }
    )
  }
}
