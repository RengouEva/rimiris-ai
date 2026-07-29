import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'
import { AGENTS } from '@/lib/iris/agents'
import { CHAPTERS } from '@/lib/iris/chapters'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatRequestBody {
  sectionTitle: string
  sectionContent?: string
  templateRef?: string // optional link to a known academic chapter
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
  allSections?: { title: string; content: string }[] // for global context
  history: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  blockedMode?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody
    const {
      sectionTitle,
      sectionContent,
      templateRef,
      agentId,
      project,
      allSections,
      history,
      userMessage,
      blockedMode,
    } = body

    // Identify agent: explicit, or by templateRef, or default to directeur
    let agent = AGENTS[0]
    if (agentId) {
      agent = AGENTS.find((a) => a.id === agentId) || agent
    } else if (templateRef) {
      const chapter = CHAPTERS.find((c) => c.id === templateRef)
      if (chapter) {
        agent = AGENTS.find((a) => a.id === chapter.agent) || agent
      }
    }

    const projectContext = `
CONTEXTE DU PROJET ACADÉMIQUE :
- Titre du mémoire : ${project.title || 'à définir'}
- Niveau : ${project.level || 'non précisé'}
- Filière : ${project.filiere || 'non précisée'}
- Université : ${project.university || 'non précisée'} (${project.country || 'pays non précisé'})
- Langue : ${project.language || 'Français'}
- Norme de citation : ${project.norme || 'APA'}
- Directeur : ${project.directeur || 'non précisé'}
- Terrain / entreprise : ${project.entreprise || 'aucun'}
`.trim()

    // Optional academic reference
    const chapterContext = templateRef
      ? (() => {
          const c = CHAPTERS.find((ch) => ch.id === templateRef)
          if (!c) return ''
          return `\nRÉFÉRENCE ACADÉMIQUE : Cette section correspond au chapitre "${c.title}".\nÉléments attendus : ${c.keyElements.join(', ')}.\nQuestions guidantes : ${c.guidingQuestions.join(' / ')}`
        })()
      : ''

    const sectionContext = `
SECTION EN COURS : "${sectionTitle}"
${chapterContext}

BROUILLON ACTUEL :
${sectionContent?.trim() ? sectionContent.trim().slice(0, 3000) : "(L'étudiant n'a pas encore rédigé cette section.)"}
`.trim()

    const otherSectionsContext =
      allSections && allSections.length > 0
        ? `\nAUTRES SECTIONS DU MÉMOIRE (pour cohérence) :\n${allSections
            .filter((s) => s.title !== sectionTitle && s.content.trim())
            .map((s) => `- ${s.title} : ${s.content.trim().slice(0, 300)}${s.content.length > 300 ? '...' : ''}`)
            .join('\n')}`
        : ''

    const systemPrompt = `${agent.systemPrompt}

${projectContext}

${sectionContext}
${otherSectionsContext}

INSTRUCTIONS CRITIQUES :
- Tu travailles AVEC l'étudiant, tu NE rédiges JAMAIS de paragraphes entiers à sa place.
${blockedMode
  ? "- L'étudiant est BLOQUÉ. Donne-lui 3 pistes concrètes, un exemple inspiré de son domaine, et UNE question simple pour relancer sa réflexion. Pas plus de 300 mots."
  : "- Pose au maximum UNE question principale à la fois. Si l'étudiant semble perdu, propose 2 ou 3 options concrètes."}
- Adapte le niveau de langue au niveau d'étude (${project.level || 'Master'}).
- Si l'étudiant a déjà rédigé un brouillon, fais des retours précis sur SON texte.
- Réponds en français académique chaleureux, jamais générique.`

    const messages: { role: 'assistant' | 'user'; content: string }[] = [
      { role: 'assistant', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: userMessage },
    ]

    const reply = await chatLLM(messages, {
      temperature: blockedMode ? 0.85 : 0.7,
      maxTokens: blockedMode ? 800 : 700,
      thinking: 'disabled',
    }) || '...'

    return NextResponse.json({
      reply,
      agent: { id: agent.id, name: agent.name, role: agent.role },
    })
  } catch (err: any) {
    console.error('[API /ai/chat] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        reply:
          "Je rencontre une difficulté technique momentanée. Pouvez-vous reformuler votre demande ?",
      },
      { status: 500 }
    )
  }
}
