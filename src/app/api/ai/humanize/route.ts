import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'

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
//
// Deux modes :
//   - "all" (legacy) : exécute les 5 passes en une fois, renvoie tout.
//   - "pass" : exécute UNE passe (passIndex 1..5), renvoie le HTML modifié
//              et le rapport de cette passe. Permet au client d'afficher
//              une animation par passe (état pending → running → done).
// ============================================================================

interface HumanizeRequestBody {
  html: string
  level?: string
  filiere?: string
  norme?: string
  language?: string
  // Nouveaux champs pour l'exécution par passe :
  mode?: 'all' | 'pass'
  passIndex?: number // 1..5 (utilisé seulement si mode === 'pass')
}

const PASSES = [
  {
    key: 'grammar',
    name: 'Correction grammaticale',
    instruction:
      'Corrige toutes les fautes de grammaire, orthographe, accords, conjugaisons et ponctuation. Ne change pas le style.',
  },
  {
    key: 'fluidity',
    name: 'Fluidité',
    instruction:
      'Améliore les transitions entre phrases et paragraphes. Ajoute des connecteurs logiques si nécessaire. Rends la lecture plus fluide.',
  },
  {
    key: 'style',
    name: 'Variation du style',
    instruction:
      'Détecte les répétitions (mots, structures de phrases) et propose des variantes. Évite les tournures robotiques ou trop uniformes.',
  },
  {
    key: 'academic',
    name: 'Registre académique',
    instruction:
      'Élève le registre vers un français académique soutenu. Remplace les tournures familières, évite les anglicismes, précise le vocabulaire.',
  },
  {
    key: 'level',
    name: 'Adaptation au niveau',
    instruction:
      'Adapte le texte au niveau d\'études "{level}". Licence = clarté et rigueur ; Master = analyse et synthèse ; Doctorat = contribution originale et positionnement critique.',
  },
] as const

function sanitizeHtml(html: string): string {
  let s = html.trim()
  s = s.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  s = s.replace(/<!doctype[^>]*>/gi, '')
  s = s.replace(/<\/?(html|head|body)[^>]*>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<\/?(div|span)[^>]*>/gi, '')
  if (!/<(p|h[1-6]|ul|ol|blockquote|table)/i.test(s)) {
    s = s
      .split(/\n\s*\n+/)
      .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
      .join('')
  }
  return s.trim()
}

async function runPass(
  passName: string,
  passInstruction: string,
  inputHtml: string,
  level: string,
  filiere: string,
  norme: string
): Promise<{ output: string; report: string }> {
  const systemPrompt = `Tu es l'Humaniseur de Rimiris AI, passe "${passName}".

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

  const completionText = await chatLLM(
    [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: `Applique la passe "${passName}".` },
    ],
    {
      temperature: 0.5,
      maxTokens: 2500,
      thinking: 'disabled',
    },
  )

  const output = sanitizeHtml(completionText || inputHtml)

  // Generate a short report
  const report = await chatLLM(
    [
      {
        role: 'assistant',
        content: `Tu es l'Humaniseur de Rimiris. Résume en 1-2 phrases ce que la passe "${passName}" a modifié dans le texte. Sois concret (ex : "Corrigé 3 accords et 2 ponctuations", "Varié le vocabulaire répétitif", etc.). Ne dépasse pas 30 mots.`,
      },
      {
        role: 'user',
        content: `Texte initial : ${inputHtml.slice(0, 800)}\n\nTexte modifié : ${output.slice(0, 800)}`,
      },
    ],
    {
      temperature: 0.4,
      maxTokens: 100,
      thinking: 'disabled',
    },
  ).then((t) => t.trim())

  return { output, report }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HumanizeRequestBody
    const {
      html,
      level = 'Master',
      filiere = '',
      norme = 'APA',
      mode = 'all',
      passIndex,
    } = body

    if (!html || !html.trim()) {
      return NextResponse.json({ error: 'HTML requis' }, { status: 400 })
    }

    // ----------------------------------------------------------------------
    // Mode "pass" — exécuter une seule passe
    // ----------------------------------------------------------------------
    if (mode === 'pass') {
      const idx = Number(passIndex)
      if (!Number.isInteger(idx) || idx < 1 || idx > PASSES.length) {
        return NextResponse.json(
          { error: `passIndex invalide (1..${PASSES.length})` },
          { status: 400 }
        )
      }
      const pass = PASSES[idx - 1]
      const instruction = pass.instruction.replace('{level}', level)
      const { output, report } = await runPass(
        pass.name,
        instruction,
        html,
        level,
        filiere,
        norme
      )
      return NextResponse.json({
        mode: 'pass',
        passIndex: idx,
        passKey: pass.key,
        passName: pass.name,
        outputHtml: output,
        report,
      })
    }

    // ----------------------------------------------------------------------
    // Mode "all" (legacy) — exécuter les 5 passes en une fois
    // ----------------------------------------------------------------------
    const pass1 = await runPass(
      PASSES[0].name,
      PASSES[0].instruction,
      html,
      level,
      filiere,
      norme
    )
    const pass2 = await runPass(
      PASSES[1].name,
      PASSES[1].instruction,
      pass1.output,
      level,
      filiere,
      norme
    )
    const pass3 = await runPass(
      PASSES[2].name,
      PASSES[2].instruction,
      pass2.output,
      level,
      filiere,
      norme
    )
    const pass4 = await runPass(
      PASSES[3].name,
      PASSES[3].instruction,
      pass3.output,
      level,
      filiere,
      norme
    )
    const pass5 = await runPass(
      PASSES[4].name,
      PASSES[4].instruction.replace('{level}', level),
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
