import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { CHAPTERS } from '@/lib/iris/chapters'

export const runtime = 'nodejs'
export const maxDuration = 60

interface BlockedRequest {
  chapterId?: string
  project: Record<string, any>
  chaptersContent: Record<string, string>
  userMessage: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BlockedRequest
    const { chapterId, project, chaptersContent, userMessage } = body

    const currentChapter = chapterId
      ? CHAPTERS.find((c) => c.id === chapterId)
      : null

    // Construire un résumé de l'avancement
    const draftedChapters = CHAPTERS.filter((c) => (chaptersContent[c.id] || '').trim().length > 50)
      .map((c) => `- ${c.title} : ${(chaptersContent[c.id] || '').slice(0, 200)}...`)
      .join('\n')

    const systemPrompt = `Tu es l'assistant "Je suis bloqué" de Rimiris AI. L'étudiant vient de cliquer sur le bouton "Je suis bloqué". Ta mission est de le débloquer IMMÉDIATEMENT avec bienveillance.

CONTEXTE DU PROJET :
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Thème : ${project.theme || 'non précisé'}
- Titre : ${project.title || 'à définir'}

CHAPITRE ACTUEL : ${currentChapter?.title || 'non précisé'}
${currentChapter ? `ÉLÉMENTS ATTENDUS : ${currentChapter.keyElements.join(', ')}` : ''}

AVANCEMENT DES AUTRES CHAPITRES :
${draftedChapters || "L'étudiant n'a pas encore rédigé d'autres chapitres."}

MESSAGE DE L'ÉTUDIANT : ${userMessage || "L'étudiant n'a pas formulé de message précis, il est juste bloqué."}

INSTRUCTIONS :
1. Reformule avec empathie la difficulté de l'étudiant (1 phrase).
2. Explique la notion ou le concept qui pose problème de façon simple et concrète (3-4 phrases max).
3. Propose 3 idées ou pistes concrètes, numérotées, que l'étudiant peut choisir.
4. Donne un exemple court inspiré de son domaine.
5. Termine par UNE question simple pour relancer sa réflexion.

Réponds en français académique chaleureux. Maximum 350 mots. N'écris jamais de paragraphes entiers à la place de l'étudiant.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userMessage || "Je suis bloqué, aide-moi." },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.8,
      max_tokens: 800,
    })

    const reply = completion.choices[0]?.message?.content || '...'

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[API /ai/blocked] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        reply:
          "Je suis là avec vous. Respirez un instant. La première étape consiste à reformuler avec vos propres mots ce que vous voulez démontrer. Pouvez-vous me dire, en une phrase simple, ce que vous aimeriez que le lecteur retienne de cette section ?",
      },
      { status: 500 }
    )
  }
}
