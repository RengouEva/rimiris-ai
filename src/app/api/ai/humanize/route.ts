import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 120

// ============================================================================
// /api/ai/humanize — Phase 5
// Pipeline en 5 passes successives sur le brouillon :
//   1. Correction grammaticale
//   2. Fluidité des transitions
//   3. Variation du style (éviter les répétitions)
//   4. Registre académique
//   5. Adaptation au niveau universitaire
// On renvoie le HTML final + un rapport de chaque passe.
// ============================================================================

interface HumanizeRequestBody {
  html: string
  level?: string
  filiere?: string
  norme?: string
  language?: string
}

function sanitizeHtml(html: string): string {
  let s = html.trim()
  s = s.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  s = s.replace(/<!doctype[^>]*>/gi, '')
  s = s.replace(/<\/?(html|head|body)[^>]*>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<\/?(div|span)[^>]*>/gi, '')
  if (!/<(p|h[1-6]|ul|ol|blockquote|table)/i.test(s)) {
    s = s.split(/\n\s*\n+/).map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`).join('')
  }
  return s.trim()
}

async function runPass(
  zai: any,
  passName: string,
  passInstruction: string,
  inputHtml: string,
  level: string,
  filiere: string,
  norme: string
): Promise<{ output: string; report: string }> {
  const systemPrompt = `Tu es l'Humaniseur d'IRIS Thesis AI, passe "${passName}".

INSTRUCTION DE CETTE PASSE : ${passInstruction}

TEXTE À TRAITER (HTML sémantique) :
${inputHtml}

RÈGLES :
- Retourne UNIQUEMENT le HTML modifié, sans commentaire, sans code fence.
- Conserve les balises sémantiques (h2, h3, p, ul, ol, li, blockquote, strong, em).
- Conserve les idées originales et les citations au format ${norme}.
- N'ajoute PAS de nouvelles informations, ne supprime PAS d'idées.
- Niveau cible : ${level}.
- Filière : ${filiere || 'non précisée'}.`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: `Applique la passe "${passName}".` },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.5,
    max_tokens: 2500,
  })

  const output = sanitizeHtml(completion.choices[0]?.message?.content || inputHtml)

  // Generate a short report
  const reportCompletion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: `Tu es l'Humaniseur d'IRIS. Résume en 1-2 phrases ce que la passe "${passName}" a modifié dans le texte. Sois concret (ex : "Corrigé 3 accords et 2 ponctuations", "Varié le vocabulaire répétitif", etc.). Ne dépasse pas 30 mots.`,
      },
      { role: 'user', content: `Texte initial : ${inputHtml.slice(0, 800)}\n\nTexte modifié : ${output.slice(0, 800)}` },
    ],
    thinking: { type: 'disabled' },
    temperature: 0.4,
    max_tokens: 100,
  })
  const report = reportCompletion.choices[0]?.message?.content?.trim() || ''

  return { output, report }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HumanizeRequestBody
    const { html, level = 'Master', filiere = '', norme = 'APA', language = 'Français' } = body

    if (!html || !html.trim()) {
      return NextResponse.json({ error: 'HTML requis' }, { status: 400 })
    }

    const zai = await ZAI.create()

    // Pass 1: Grammar
    const pass1 = await runPass(
      zai,
      'Correction grammaticale',
      'Corrige toutes les fautes de grammaire, orthographe, accords, conjugaisons et ponctuation. Ne change pas le style.',
      html,
      level,
      filiere,
      norme
    )

    // Pass 2: Fluidity
    const pass2 = await runPass(
      zai,
      'Fluidité',
      'Améliore les transitions entre phrases et paragraphes. Ajoute des connecteurs logiques si nécessaire. Rends la lecture plus fluide.',
      pass1.output,
      level,
      filiere,
      norme
    )

    // Pass 3: Style variation
    const pass3 = await runPass(
      zai,
      'Variation du style',
      'Détecte les répétitions (mots, structures de phrases) et propose des variantes. Évite les tournures robotiques ou trop uniformes.',
      pass2.output,
      level,
      filiere,
      norme
    )

    // Pass 4: Academic register
    const pass4 = await runPass(
      zai,
      'Registre académique',
      'Élève le registre vers un français académique soutenu. Remplace les tournures familières, évite les anglicismes, précise le vocabulaire.',
      pass3.output,
      level,
      filiere,
      norme
    )

    // Pass 5: Level adaptation
    const pass5 = await runPass(
      zai,
      'Adaptation au niveau',
      `Adapte le texte au niveau d'études "${level}". Licence = clarté et rigueur ; Master = analyse et synthèse ; Doctorat = contribution originale et positionnement critique.`,
      pass4.output,
      level,
      filiere,
      norme
    )

    return NextResponse.json({
      grammar: pass1.report,
      fluidity: pass2.report,
      style: pass3.report,
      academic: pass4.report,
      level: pass5.report,
      finalHtml: pass5.output,
    })
  } catch (err: any) {
    console.error('[API /ai/humanize] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
