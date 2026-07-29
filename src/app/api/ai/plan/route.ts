import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 90

// ============================================================================
// /api/ai/plan
// À partir des réponses de l'interview, IRIS propose un plan de mémoire
// structuré en sections. Réponse JSON: { sections: [{title, description}] }.
// ============================================================================

interface PlanRequestBody {
  answers: {
    questionId: string
    question: string
    answer: string
  }[]
  level?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanRequestBody
    const { answers } = body

    const answerMap: Record<string, string> = {}
    for (const a of answers) {
      answerMap[a.questionId] = a.answer
    }

    const topic = answerMap['topic'] || '(non précisé)'
    const level = answerMap['level'] || body.level || 'Master'
    const field = answerMap['field'] || '(non précisée)'
    const problem = answerMap['problem'] || '(non précisée)'
    const terrain = answerMap['terrain'] || '(non précisé)'

    const systemPrompt = `Tu es Pr. Rimiris, directeur de mémoire virtuel. À partir des éléments fournis par l'étudiant, propose un PLAN de mémoire cohérent et adapté à son niveau.

ÉLÉMENTS DE L'ÉTUDIANT :
- Sujet : ${topic}
- Niveau : ${level}
- Filière / contexte : ${field}
- Problématique : ${problem}
- Terrain : ${terrain}

INSTRUCTIONS POUR LE PLAN :
1. Propose entre 5 et 7 sections, ni trop peu ni trop.
2. Adapte le plan au niveau : Licence = plan simple et linéaire ; Master = plan analytique avec cadre théorique + méthodologie + résultats ; Doctorat = plan avec revue critique et contribution originale.
3. Pour un mémoire de ${level} en ${field}, suis les conventions académiques usuelles.
4. Inclus TOUJOURS : une introduction générale et une conclusion générale (comme sections distinctes).
5. Entre les deux, propose les sections du développement (cadre théorique, méthodologie, résultats, discussion... selon le sujet).
6. N'inclus PAS de page de garde, table des matières, bibliographie, annexes — uniquement le corps du mémoire.
7. Chaque section doit avoir un titre clair (max 8 mots) et une description de 1-2 phrases expliquant ce qu'elle contiendra.

FORMAT DE RÉPONSE (OBLIGATOIRE — JSON strict, aucun texte hors JSON) :
{
  "sections": [
    { "title": "Introduction générale", "description": "Présentation du sujet, problématique, objectifs, structure du mémoire." },
    { "title": "...", "description": "..." }
  ]
}

Réponds UNIQUEMENT avec ce JSON, sans code fences, sans commentaire.`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: `Propose un plan pour mon mémoire : ${topic}` },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.7,
      max_tokens: 1500,
    })

    const raw = completion.choices[0]?.message?.content || ''
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    let sections: { title: string; description: string }[] = []
    try {
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed.sections)) {
        sections = parsed.sections
          .filter((s: any) => s && typeof s.title === 'string' && typeof s.description === 'string')
          .map((s: any) => ({ title: s.title.trim(), description: s.description.trim() }))
      }
    } catch {
      // If parsing failed, return a default plan
      sections = [
        { title: 'Introduction générale', description: 'Présentation du sujet, problématique, objectifs et structure du mémoire.' },
        { title: 'Cadre théorique', description: 'Concepts clés, revue de littérature et ancrage théorique du sujet.' },
        { title: 'Méthodologie', description: 'Approche, outils de collecte et méthode d\'analyse choisis.' },
        { title: 'Résultats', description: 'Présentation des principaux résultats obtenus sur le terrain.' },
        { title: 'Discussion', description: 'Analyse, interprétation et mise en perspective des résultats.' },
        { title: 'Conclusion générale', description: 'Synthèse, recommandations et ouvertures.' },
      ]
    }

    // Safety net: ensure we have at least 3 sections
    if (sections.length < 3) {
      sections = [
        { title: 'Introduction générale', description: 'Présentation du sujet et des objectifs.' },
        ...sections,
        { title: 'Conclusion générale', description: 'Synthèse et perspectives.' },
      ]
    }

    return NextResponse.json({ sections })
  } catch (err: any) {
    console.error('[API /ai/plan] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        sections: [
          { title: 'Introduction générale', description: 'Présentation du sujet.' },
          { title: 'Développement', description: 'Analyse du sujet.' },
          { title: 'Conclusion générale', description: 'Synthèse.' },
        ],
      },
      { status: 500 }
    )
  }
}
