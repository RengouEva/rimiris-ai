import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'
import { AGENTS } from '@/lib/iris/agents'
import { buildGuideContext, buildProjectContext } from '@/lib/iris/prompt-context'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes — enough for 5-8 sections

// ============================================================================
// /api/ai/draft-all
// Orchestrates the per-section mini-workflow on EVERY empty section in one shot:
//   1. Use the global theme understanding + problem context + project context
//      (already validated during Phase 0-2) as the permanent knowledge base.
//   2. For each empty section, generate a structured HTML draft.
//   3. Return an array of { sectionId, title, html } so the client can insert
//      them sequentially.
//
// IMPORTANT: This is NOT a shortcut that bypasses the methodology. The student
// has ALREADY gone through Phase 0 (project), Phase 1 (theme understanding
// validated), Phase 2 (problem hypothesis selected). IRIS uses that validated
// context to write each section's first draft directly. The student can still
// run the full per-section workflow (validation, humanization, audit) afterwards.
// ============================================================================

interface DraftAllRequest {
  project: Record<string, any>
  themeUnderstanding?: {
    concepts?: string[]
    keywords?: string[]
    domain?: string
    disciplines?: string[]
    similarResearch?: string[]
    applications?: string[]
    limits?: string[]
    summary?: string
  }
  problemContext?: {
    hypotheses?: string[]
    selected?: string
    rationale?: string
  }
  sections: { id: string; title: string; content: string }[]
  // Optionally limit to a subset (e.g., only introductions)
  mode?: 'all_empty' | 'all'
}

interface DraftAllResponse {
  drafts: { sectionId: string; title: string; html: string; wordCount: number; error?: string }[]
  totalGenerated: number
  totalErrors: number
  totalWords: number
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DraftAllRequest
    const { project, themeUnderstanding, problemContext, sections, mode = 'all_empty' } = body

    // Filter sections: either all empty, or all (if mode='all')
    const targetSections =
      mode === 'all'
        ? sections
        : sections.filter((s) => !s.content || s.content.trim().length < 50)

    if (targetSections.length === 0) {
      return NextResponse.json<DraftAllResponse>({
        drafts: [],
        totalGenerated: 0,
        totalErrors: 0,
        totalWords: 0,
      })
    }

    const agent = AGENTS.find((a) => a.id === 'redacteur') || AGENTS[0]

    const projectContext = buildProjectContext(project)
    const guideContext = buildGuideContext(project)

    const understandingContext = themeUnderstanding
      ? `\nCOMPRÉHENSION DU THÈME (Phase 1) :\n- Concepts : ${(themeUnderstanding.concepts || []).join(', ')}\n- Mots-clés : ${(themeUnderstanding.keywords || []).join(', ')}\n- Domaine : ${themeUnderstanding.domain || 'non précisé'}\n- Disciplines : ${(themeUnderstanding.disciplines || []).join(', ')}\n- Résumé : ${themeUnderstanding.summary || ''}`
      : ''

    const problemContextStr = problemContext?.selected
      ? `\nPROBLÉMATIQUE VALIDÉE (Phase 2) : ${problemContext.selected}\nJustification : ${problemContext.rationale || ''}`
      : ''

    // Process sections sequentially to avoid token-rate limits.
    // Each section takes ~5-10s with ZAI.
    const drafts: DraftAllResponse['drafts'] = []
    let totalWords = 0
    let totalErrors = 0

    // Build a list of all section titles so each section's draft is aware of
    // the surrounding context (avoids redundancy).
    const allTitles = sections.map((s) => s.title).join(' | ')

    for (let i = 0; i < targetSections.length; i++) {
      const sec = targetSections[i]
      const position = i + 1
      try {
        // For each section, write a context-aware draft.
        const sectionPrompt = `Tu es ${agent.name}, ${agent.role}. ${agent.systemPrompt}

${projectContext}
${guideContext ? '\n' + guideContext : ''}
${understandingContext}
${problemContextStr}

PLAN DU MÉMOIRE (toutes les sections, dans l'ordre) :
${allTitles}

SECTION À RÉDIGER (section ${position} / ${targetSections.length}) : "${sec.title}"

INSTRUCTIONS DE RÉDACTION :
1. Rédige un brouillon complet et structuré (400-700 mots) pour CETTE section précise.
2. Adapte le contenu à la POSITION de la section dans le mémoire :
   - Introduction générale : amorce le sujet, annonce le plan, justifie l'intérêt.
   - Problématique : formule la question centrale à partir de la problématique validée en Phase 2.
   - Objectifs : objectifs principal + spécifiques, déduits de la problématique.
   - Hypothèses : H0 + hypothèses secondaires, déduites des objectifs.
   - Revue de littérature : organise les concepts identifiés en Phase 1, signale les lacunes.
   - Méthodologie : approche, population, échantillon, outils, traitement des données.
   - Résultats : présentation neutre des observations/analyses (placeholders si non collectées).
   - Discussion : interprétation au regard des hypothèses.
   - Conclusion : synthèse, limites, perspectives.
3. N'INVENTE JAMAIS de faits, chiffres ou citations. Utilise <em>(à compléter)</em> pour les informations manquantes.
4. Réponds UNIQUEMENT avec du HTML sémantique (h2, h3, p, ul, ol, li, blockquote, strong, em).
5. N'inclus PAS de <h1> (l'éditeur affiche déjà le titre de section).
6. N'ajoute AUCUN commentaire hors HTML.
7. Adapte le niveau de langue au niveau d'étude (${project.level || 'Master'}).
${guideContext ? `8. RESPECTE strictement les exigences du guide méthodologique de l'université fourni ci-dessus.` : ''}`

        const rawHtml = await chatLLM(
          [
            { role: 'assistant', content: sectionPrompt },
            {
              role: 'user',
              content: `Génère le brouillon de la section "${sec.title}".`,
            },
          ],
          {
            temperature: 0.7,
            maxTokens: 2200,
            thinking: 'disabled',
          },
        )
        let html = sanitizeDraftHtml(rawHtml)
        const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const wordCount = plainText ? plainText.split(/\s+/).length : 0
        totalWords += wordCount

        drafts.push({
          sectionId: sec.id,
          title: sec.title,
          html,
          wordCount,
        })
      } catch (err: any) {
        totalErrors++
        drafts.push({
          sectionId: sec.id,
          title: sec.title,
          html: '',
          wordCount: 0,
          error: err?.message || 'Erreur de génération',
        })
      }
    }

    return NextResponse.json<DraftAllResponse>({
      drafts,
      totalGenerated: drafts.filter((d) => !d.error).length,
      totalErrors,
      totalWords,
    })
  } catch (err: any) {
    console.error('[API /ai/draft-all] Error:', err)
    return NextResponse.json(
      {
        error: err?.message || 'Erreur serveur',
        drafts: [],
        totalGenerated: 0,
        totalErrors: 0,
        totalWords: 0,
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// sanitizeDraftHtml — same logic as /api/ai/draft
// ============================================================================
function sanitizeDraftHtml(raw: string): string {
  let html = raw.trim()
  html = html.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  html = html.replace(/<!doctype[^>]*>/gi, '')
  html = html.replace(/<\/?(html|head|body)[^>]*>/gi, '')
  html = html.replace(/<!--[\s\S]*?-->/g, '')
  html = html.replace(/<\/?(div|span)[^>]*>/gi, '')
  if (!/<(p|h[1-6]|ul|ol|blockquote|table)/i.test(html)) {
    html = html
      .split(/\n\s*\n+/)
      .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('')
  }
  return html.trim()
}
