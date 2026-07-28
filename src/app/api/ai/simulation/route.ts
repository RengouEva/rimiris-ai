import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { buildGuideContext, buildProjectContext } from '@/lib/iris/prompt-context'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Interactive Defense Simulation — real-time chat where the AI plays the jury.
 *
 * Three actions:
 *   1. `start`    — jury introduces themselves, asks the opening question
 *   2. `next`     — given student's answer + history, jury either:
 *                    a) gives brief inline feedback and asks a follow-up
 *                    b) hands over to another jury role (transition message)
 *                    c) signals "debrief_ready" when enough ground is covered
 *   3. `debrief`  — comprehensive debrief with criterion scores
 */

type SimulationAction = 'start' | 'next' | 'debrief'

interface SimulationRequest {
  action: SimulationAction
  project: Record<string, any>
  sections: { title: string; content: string }[]
  soutenanceData?: {
    summary?: string
    juryQuestions?: {
      question: string
      suggestedAnswer: string
      difficulty?: string
      juryRole?: string
    }[]
    weakPoints?: string[]
  } | null
  history: {
    role: 'jury' | 'student' | 'system'
    juryRole?: string
    content: string
    feedback?: string
  }[]
  studentAnswer?: string
  forceRole?: string // when student clicks "Passer au rôle suivant"
}

// The four jury roles with their behavioral briefs.
const JURY_BRIEFS: Record<string, string> = {
  Président:
    "Tu es le PRÉSIDENT du jury. Tu ouvres la séance, cadences les échanges, veilles à la gestion du temps et poses des questions transversales (enjeux, apports du travail, limites globales). Ton ton est institutionnel et cordial. Tu termines la séance en remerciant le candidat.",
  Rapporteur:
    "Tu es le RAPPORTEUR du jury. Tu as lu le mémoire en détail. Tu poses des questions pointues sur la méthodologie, la rigueur scientifique, la cohérence interne, les biais éventuels, la qualité de la revue de littérature. Tu cites des passages précis du mémoire quand c'est pertinent. Ton ton est exigeant mais juste.",
  Directeur:
    "Tu es le DIRECTEUR de mémoire. Tu connais le parcours du candidat. Tu poses des questions sur l'évolution de sa réflexion, les choix qu'il a faits, les difficultés rencontrées, ce qu'il a appris. Ton ton est bienveillant et encourageant, mais tu attends de la sincérité.",
  Examinateur:
    "Tu es l'EXAMINATEUR du jury. Tu poses des questions sur la contribution du travail au champ disciplinaire, les perspectives de recherche futures, les applications pratiques, et la capacité du candidat à situer son travail dans les débats contemporains de la discipline. Ton ton est curieux et stimulant.",
}

// Order of jury rotation during the simulation.
const ROLE_ORDER = ['Président', 'Rapporteur', 'Directeur', 'Examinateur']

function pickRole(history: any[], forceRole?: string): string {
  if (forceRole && JURY_BRIEFS[forceRole]) return forceRole
  const lastJury = [...history].reverse().find((m) => m.role === 'jury')
  if (lastJury?.juryRole && JURY_BRIEFS[lastJury.juryRole]) return lastJury.juryRole
  return 'Président'
}

function countJuryTurns(history: any[]): number {
  return history.filter((m) => m.role === 'jury').length
}

function getDraftedSections(sections: { title: string; content: string }[]) {
  return sections
    .filter((s) => s.content.trim().length > 100)
    .map((s) => {
      const c = s.content.trim()
      const plain = c
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return `### ${s.title}\n${plain.slice(0, 1500)}${plain.length > 1500 ? '…' : ''}`
    })
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SimulationRequest
    const { action, project, sections, soutenanceData, history, studentAnswer, forceRole } = body

    const guideContext = buildGuideContext(project)
    const projectContext = buildProjectContext(project)
    const drafted = getDraftedSections(sections)

    const juryKit = soutenanceData?.juryQuestions?.length
      ? soutenanceData.juryQuestions
          .slice(0, 8)
          .map((q, i) => `${i + 1}. [${q.juryRole || 'Jury'} · ${q.difficulty || '?'}] ${q.question}`)
          .join('\n')
      : '(Aucun kit de questions disponible — improvise des questions pertinentes basées sur le mémoire.)'

    const weakPoints = soutenanceData?.weakPoints?.length
      ? soutenanceData.weakPoints.map((wp) => `- ${wp}`).join('\n')
      : ''

    const zai = await ZAI.create()

    // ============================================================
    // ACTION: start
    // ============================================================
    if (action === 'start') {
      const systemPrompt = `${JURY_BRIEFS['Président']}

${projectContext}
${guideContext ? '\n' + guideContext + '\n' : ''}

MÉMOIRE RÉDIGÉ :
${drafted || "(Le candidat n'a pas encore rédigé significativement — adapte tes questions en conséquence.)"}

QUESTIONS PROBABLES (référence — ne les recopie pas, inspire-t-en) :
${juryKit}

${weakPoints ? `POINTS FAIBLES IDENTIFIÉS À EXPLORER :\n${weakPoints}\n` : ''}

SCÉNARIO : La soutenance commence. Tu es le PRÉSIDENT. Procède en deux temps :
1. Mot d'accueil institutionnel (2-3 phrases) : présente le jury (Président, Rapporteur, Directeur, Examinateur) et annonce le sujet du mémoire.
2. Pose ta PREMIÈRE question au candidat — une question transversale d'ouverture (par exemple sur la genèse du sujet, les motivations, ou l'apport principal du travail).

CONTRAINTES :
- Réponds en français académique.
- Pas de listes à puces — parle naturellement, comme un vrai jury à l'oral.
- Maximum 180 mots.
- Termine par UNE question claire au candidat.

Réponds UNIQUEMENT avec le texte de ton intervention (pas de JSON, pas de préfixe).`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: 'Ouvre la soutenance.' },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.75,
        max_tokens: 600,
      })

      const reply = completion.choices[0]?.message?.content?.trim() || '...'
      return NextResponse.json({
        reply,
        juryRole: 'Président',
        feedback: null,
        debriefReady: false,
      })
    }

    // ============================================================
    // ACTION: next — given the student's answer, jury responds
    // ============================================================
    if (action === 'next') {
      const turnCount = countJuryTurns(history)
      const currentRole = pickRole(history, forceRole)
      const nextRole =
        ROLE_ORDER[(ROLE_ORDER.indexOf(currentRole) + 1) % ROLE_ORDER.length]
      const transitioning = !!forceRole && forceRole !== currentRole
      const debriefReady = turnCount >= 10

      const historyStr = history
        .slice(-12)
        .map((m) => {
          if (m.role === 'jury') {
            return `[${m.juryRole || 'Jury'}] : ${m.content}`
          }
          if (m.role === 'student') {
            return `[Candidat] : ${m.content}`
          }
          return `[Système] : ${m.content}`
        })
        .join('\n\n')

      const transitionClause = transitioning
        ? `Le candidat a demandé à passer au rôle suivant. Fais une transition brève (1 phrase) pour conclure en tant que ${currentRole}, puis enchaîne directement avec une question dans le rôle de ${nextRole}. Dans ce cas, ta réponse portera le rôle "${nextRole}".`
        : `Continue dans ton rôle actuel : ${currentRole}.`

      const systemPrompt = `${JURY_BRIEFS[currentRole]}

${projectContext}
${guideContext ? '\n' + guideContext + '\n' : ''}

MÉMOIRE RÉDIGÉ (rappel) :
${drafted || "(Mémoire peu rédigé.)"}

QUESTIONS PROBABLES (référence) :
${juryKit}

HISTORIQUE DE LA SOUTENANCE :
${historyStr || '(début de la soutenance)'}

DERNIÈRE RÉPONSE DU CANDIDAT :
${studentAnswer || "(Le candidat n'a pas répondu.)"}

${weakPoints ? `POINTS FAIBLES À EXPLORER SI PERTINENT :\n${weakPoints}\n` : ''}

COMPORTEMENT ATTENDU :
- ${transitionClause}
- Structure ta réponse en deux parties :
  1. UN FEEDBACK COURT (1 phrase, 25 mots max) sur la qualité de la réponse du candidat. Sois honnête mais bienveillant.
  2. UNE NOUVELLE QUESTION de relance (ou une transition si rôle forcé), qui creuse ou élargit le sujet.
- ${debriefReady
  ? 'Si tu estimes que le candidat a été suffisamment évalué, tu peux annoncer que la séance touche à sa fin et que le jury va délibérer. Dans ce cas, ta "question" sera en fait une formule de clôture.'
  : 'Continue à explorer le mémoire.'}
- Pas de listes à puces. Parle naturellement.
- Maximum 200 mots au total.

Réponds STRICTEMENT dans ce format JSON :
{
  "feedback": "ta phrase de feedback (max 25 mots)",
  "reply": "ton intervention complète (feedback + nouvelle question)",
  "debriefReady": ${debriefReady},
  "effectiveRole": "${transitioning ? nextRole : currentRole}"
}`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: 'Continue la soutenance.' },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.75,
        max_tokens: 700,
      })

      const raw = completion.choices[0]?.message?.content?.trim() || ''
      let parsed: any = { feedback: null, reply: raw, debriefReady, effectiveRole: transitioning ? nextRole : currentRole }
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        }
      } catch {
        // Keep raw reply as fallback
      }

      return NextResponse.json({
        reply: parsed.reply || raw,
        juryRole: parsed.effectiveRole || (transitioning ? nextRole : currentRole),
        feedback: parsed.feedback || null,
        debriefReady: parsed.debriefReady ?? debriefReady,
      })
    }

    // ============================================================
    // ACTION: debrief — final evaluation
    // ============================================================
    if (action === 'debrief') {
      const historyStr = history
        .map((m) => {
          if (m.role === 'jury') {
            return `[${m.juryRole || 'Jury'}] : ${m.content}`
          }
          if (m.role === 'student') {
            return `[Candidat] : ${m.content}`
          }
          return `[Système] : ${m.content}`
        })
        .join('\n\n')

      const systemPrompt = `Tu es le PRÉSIDENT du jury. La soutenance est terminée. Tu délibères avec le jury et rends un compte-rendu détaillé au candidat.

${projectContext}

HISTORIQUE COMPLET DE LA SOUTENANCE :
${historyStr || '(Aucun échange enregistré.)'}

${weakPoints ? `POINTS FAIBLES INITIALEMENT IDENTIFIÉS :\n${weakPoints}\n` : ''}

ÉVALUE LE CANDIDAT SUR 5 CRITÈRES (score 0-100 chacun) :
1. "Clarté de l'expression" — aisance orale, structure des réponses, vocabulaire académique
2. "Maîtrise du sujet" — profondeur de la compréhension, capacité à contextualiser
3. "Rigueur méthodologique" — justification des choix, conscience des limites
4. "Esprit critique" — recul par rapport à son propre travail, capacité à défendre ses choix
5. "Qualité des réponses" — pertinence, concision, capacité à aller à l'essentiel

Réponds STRICTEMENT dans ce format JSON :
{
  "criteria": [
    { "criterion": "Clarté de l'expression", "score": 75, "notes": "..." },
    { "criterion": "Maîtrise du sujet", "score": 80, "notes": "..." },
    { "criterion": "Rigueur méthodologique", "score": 70, "notes": "..." },
    { "criterion": "Esprit critique", "score": 65, "notes": "..." },
    { "criterion": "Qualité des réponses", "score": 78, "notes": "..." }
  ],
  "globalScore": 75,
  "strengths": ["Force 1", "Force 2", "Force 3"],
  "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
  "recommendations": ["Recommandation 1", "Recommandation 2", "Recommandation 3"]
}

- globalScore = moyenne des 5 criteria (arrondi à l'entier).
- 3 forces, 2 faiblesses, 3 recommandations concrètes.
- Chaque "notes" doit faire 1-2 phrases maximum, avec un exemple concret tiré de l'historique.
- Sois exigeant mais juste — un Master moyen doit obtenir ~70-75, un excellent ~85+.
- Réponds en français.`

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: 'Rends ton délibéré.' },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.5,
        max_tokens: 1500,
      })

      const raw = completion.choices[0]?.message?.content?.trim() || '{}'
      let data: any = null
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        data = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
        if (data.criteria?.length && (typeof data.globalScore !== 'number')) {
          data.globalScore = Math.round(
            data.criteria.reduce((s: number, c: any) => s + (Number(c.score) || 0), 0) /
              data.criteria.length
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Format de débrief inattendu', debrief: null },
          { status: 500 }
        )
      }

      return NextResponse.json({
        debrief: {
          ...data,
          generatedAt: Date.now(),
        },
      })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('[API /ai/simulation] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
