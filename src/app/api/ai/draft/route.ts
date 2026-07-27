import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { AGENTS } from '@/lib/iris/agents'
import { CHAPTERS } from '@/lib/iris/chapters'

export const runtime = 'nodejs'
export const maxDuration = 90

interface DraftRequestBody {
  sectionTitle: string
  sectionContent?: string
  templateRef?: string
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
  allSections?: { title: string; content: string }[]
  userInstruction: string // what the student asked for
  mode?: 'generate' | 'rewrite' | 'expand' | 'structure'
}

// ============================================================================
// /api/ai/draft
// Generates HTML-formatted academic content that can be inserted directly
// into the A4 WYSIWYG editor. The AI returns semantic HTML (h2, h3, p, ul, ol,
// blockquote) so the editor preserves formatting and the student can edit
// visually.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DraftRequestBody
    const {
      sectionTitle,
      sectionContent,
      templateRef,
      agentId,
      project,
      allSections,
      userInstruction,
      mode = 'generate',
    } = body

    // Identify agent
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
CONTEXTE DU PROJET :
- Titre : ${project.title || 'à définir'}
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Université : ${project.university || 'non précisée'} (${project.country || 'pays non précisé'})
- Norme de citation : ${project.norme || 'APA'}
- Terrain : ${project.entreprise || 'non précisé'}
`.trim()

    const chapterContext = templateRef
      ? (() => {
          const c = CHAPTERS.find((ch) => ch.id === templateRef)
          if (!c) return ''
          return `RÉFÉRENCE ACADÉMIQUE : "${c.title}". Éléments attendus : ${c.keyElements.join(', ')}.`
        })()
      : ''

    const sectionContext = `
SECTION : "${sectionTitle}"
${chapterContext}

BROUILLON ACTUEL (le cas échéant) :
${sectionContent?.trim() ? sectionContent.trim().slice(0, 2500) : '(vide)'}
`.trim()

    const otherSectionsContext =
      allSections && allSections.length > 0
        ? `\nAUTRES SECTIONS (pour cohérence) :\n${allSections
            .filter((s) => s.title !== sectionTitle && s.content.trim())
            .map((s) => `- ${s.title} : ${s.content.trim().slice(0, 200)}${s.content.length > 200 ? '...' : ''}`)
            .join('\n')}`
        : ''

    const modeInstruction = (() => {
      switch (mode) {
        case 'rewrite':
          return `REWRITE the existing draft. Improve style, clarity, academic register, and flow while preserving the student's core ideas. Keep the same length approximately.`
        case 'expand':
          return `EXPAND the existing draft. Add depth, examples, transitions, and analytical passages. Aim for 50% more content than what exists.`
        case 'structure':
          return `Create a STRUCTURED OUTLINE only. Return H2 and H3 headings with a one-sentence description under each, so the student can fill in the paragraphs.`
        case 'generate':
        default:
          return `GENERATE a complete first draft of this section. Aim for 400-700 words, structured into clear paragraphs with subheadings.`
      }
    })()

    const systemPrompt = `Tu es ${agent.name}, ${agent.role}. ${agent.systemPrompt}

${projectContext}

${sectionContext}
${otherSectionsContext}

MISSION SPÉCIALE — GÉNÉRATION DE BROUILLON FORMATÉ :
${modeInstruction}

Demande spécifique de l'étudiant : "${userInstruction}"

RÈGLES DE FORMATAGE (CRITIQUE) :
1. Réponds UNIQUEMENT avec du HTML sémantique valide (pas de markdown, pas de code fences).
2. Utilise ces balises : <h2>, <h3>, <h4>, <p>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em>.
3. N'UTILISE PAS <html>, <head>, <body>, <div>, <span> — uniquement des balises sémantiques de contenu.
4. N'inclus PAS le titre de la section comme <h1> (l'éditeur l'affiche déjà séparément).
5. Les paragraphes doivent être complets (min. 3-5 phrases chacun), développés, avec exemples concrets.
6. Adapte le niveau de langue au niveau d'étude (${project.level || 'Master'}).
7. Intègre des citations au format ${project.norme || 'APA'} quand pertinent, sous forme <em>(Auteur, année)</em>.
8. Si tu utilises une liste, fais précéder d'une phrase d'introduction dans un <p>.
9. Pour les citations directes, utilise <blockquote>.
10. N'ajoute AUCUN commentaire, AUCUNE explication hors HTML. Réponds uniquement avec le HTML à insérer dans l'éditeur.

EXEMPLE DE FORMAT ATTENDU :
<h2>Contexte historique</h2>
<p>Depuis les années 1990, la transformation numérique a profondément modifié les pratiques... (paragraphe complet)</p>
<p>Plusieurs auteurs ont souligné ce phénomène, dont <em>(Dupont, 2020)</em> qui montre que...</p>
<h3>Étapes clés</h3>
<p>On peut identifier trois phases principales :</p>
<ul><li>Première phase : ...</li><li>Deuxième phase : ...</li></ul>`

    const messages: { role: 'assistant' | 'user'; content: string }[] = [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userInstruction || 'Génère un brouillon structuré pour cette section.' },
    ]

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
      temperature: 0.7,
      max_tokens: 2200,
    })

    let html = completion.choices[0]?.message?.content || ''
    html = sanitizeDraftHtml(html)

    return NextResponse.json({
      html,
      agent: { id: agent.id, name: agent.name, role: agent.role },
      mode,
    })
  } catch (err: any) {
    console.error('[API /ai/draft] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        html: '<p><em>Erreur de génération. Reformulez votre demande.</em></p>',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// sanitizeDraftHtml — strip code fences, wrap orphan text, ensure valid HTML
// ============================================================================

function sanitizeDraftHtml(raw: string): string {
  let html = raw.trim()

  // Strip markdown code fences if the model added them despite instructions
  html = html.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

  // Remove <!doctype> and <html>/<head>/<body> wrappers if present
  html = html.replace(/<!doctype[^>]*>/gi, '')
  html = html.replace(/<\/?(html|head|body)[^>]*>/gi, '')

  // Remove comments
  html = html.replace(/<!--[\s\S]*?-->/g, '')

  // Remove <div> and <span> wrappers (keep inner content)
  html = html.replace(/<\/?(div|span)[^>]*>/gi, '')

  // If the result has no HTML tags at all, wrap as paragraphs
  if (!/<(p|h[1-6]|ul|ol|blockquote|table)/i.test(html)) {
    html = html
      .split(/\n\s*\n+/)
      .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('')
  }

  return html.trim()
}
