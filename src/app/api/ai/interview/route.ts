import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// /api/ai/interview
// IRIS mène un entretien guidé avec l'étudiant pour démarrer son mémoire.
// À chaque appel : on renvoie la question suivante + les champs à extraire
// de la réponse de l'étudiant + une progression (étape courante / total).
// ============================================================================

export interface InterviewAnswer {
  questionId: string
  question: string
  answer: string
}

interface InterviewRequestBody {
  answers: InterviewAnswer[] // all answers so far (most recent last)
}

// Fixed skeleton of the interview — 5 questions, in order.
// We keep it deterministic so the UI knows how many steps remain.
export const INTERVIEW_STEPS = [
  {
    id: 'topic',
    field: 'title',
    question:
      "Bonjour, je suis Pr. IRIS, votre directeur de mémoire virtuel. Pour bien démarrer, dites-moi en une phrase : sur quel sujet voulez-vous écrire votre mémoire ?",
    placeholder: 'Ex : L\'impact du télétravail sur la productivité des employés',
    helper: 'Pas besoin d\'être parfait — on affinera ensemble.',
  },
  {
    id: 'level',
    field: 'level',
    question:
      "Quel est votre niveau d'études ? Cela me permettra d'adapter le ton et les attentes.",
    placeholder: 'Licence, Master ou Doctorat',
    helper: 'Master = analyse et synthèse ; Doctorat = contribution originale.',
  },
  {
    id: 'field',
    field: 'filiere',
    question:
      "Dans quelle filière ou discipline étudiez-vous (et dans quel pays / université si possible) ?",
    placeholder: 'Ex : Sciences de gestion, Université de Yaoundé I, Cameroun',
    helper: 'Cela cadre les références théoriques attendues.',
  },
  {
    id: 'problem',
    field: 'problematic',
    question:
      "Quelle est la question centrale que vous voulez traiter ? En d'autres termes, quel problème cherchez-vous à résoudre ou à comprendre ?",
    placeholder: 'Ex : Comment le télétravail affecte-t-il la productivité des cadres ?',
    helper: 'Si vous n\'êtes pas sûr, donnez une intuition et je vous proposerai une formulation.',
  },
  {
    id: 'terrain',
    field: 'terrain',
    question:
      "Avez-vous un terrain d'étude (entreprise, population, région) en tête ? C'est optionnel mais ça m'aide à proposer un plan réaliste.",
    placeholder: 'Ex : Une PME de la place, les étudiants de mon université, etc.',
    helper: 'Répondez \"non\" si ce n\'est pas encore clair.',
  },
] as const

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InterviewRequestBody
    const answers = body.answers || []

    // Determine current step
    const currentStepIndex = Math.min(answers.length, INTERVIEW_STEPS.length - 1)
    const step = INTERVIEW_STEPS[currentStepIndex]

    // The interview is over — signal completion
    if (answers.length >= INTERVIEW_STEPS.length) {
      return NextResponse.json({
        done: true,
        progress: { current: INTERVIEW_STEPS.length, total: INTERVIEW_STEPS.length },
        nextQuestion: null,
      })
    }

    // Build a small contextual nudge using the AI: rephrase the next question
    // slightly based on what the student just said. Keeps it natural.
    let nextQuestion = step.question
    let suggestions: string[] = []

    const lastAnswer = answers[answers.length - 1]
    if (lastAnswer) {
      try {
        const zai = await ZAI.create()
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: 'assistant',
              content: `Tu es Pr. IRIS, directeur de mémoire. L'étudiant vient de répondre à la question "${lastAnswer.question}". Sa réponse : "${lastAnswer.answer}".

Tu dois maintenant poser la question suivante : "${step.question}".

INSTRUCTIONS :
- Reformule la question de façon naturelle et chaleureuse, en ackknowledgeant brièvement sa réponse précédente (max 1 phrase).
- Adapte-la à son niveau d'études et à sa filière si déjà connus.
- Garde la même intention que la question de base.
- Réponds en français, maximum 80 mots, sans guillemets ni préfixe.
- Termine par UNE seule question claire.`,
            },
            {
              role: 'user',
              content: lastAnswer.answer,
            },
          ],
          thinking: { type: 'disabled' },
          temperature: 0.7,
          max_tokens: 200,
        })
        const reformulated = completion.choices[0]?.message?.content?.trim()
        if (reformulated && reformulated.length > 0 && reformulated.length < 400) {
          nextQuestion = reformulated
        }
      } catch {
        // Fall back to the default question
      }

      // For the "problem" step, propose 2-3 formulated problematics based on topic
      if (step.id === 'problem') {
        const topicAnswer = answers.find((a) => a.questionId === 'topic')
        const levelAnswer = answers.find((a) => a.questionId === 'level')
        if (topicAnswer) {
          try {
            const zai = await ZAI.create()
            const completion = await zai.chat.completions.create({
              messages: [
                {
                  role: 'assistant',
                  content: `Tu es Pr. IRIS. À partir du sujet "${topicAnswer.answer}" (niveau ${levelAnswer?.answer || 'Master'}), propose 3 problématiques académiques formulées sous forme de questions de recherche. Chaque problématique doit être :
- Une vraie question (qui se termine par "?")
- Spécifique et défendable
- Adaptée au niveau d'études

Réponds UNIQUEMENT avec les 3 questions, une par ligne, sans numérotation ni commentaire.`,
                },
                { role: 'user', content: topicAnswer.answer },
              ],
              thinking: { type: 'disabled' },
              temperature: 0.8,
              max_tokens: 300,
            })
            const raw = completion.choices[0]?.message?.content || ''
            suggestions = raw
              .split('\n')
              .map((s) => s.replace(/^[\s\-\*\d\.\)]+/, '').trim())
              .filter((s) => s.endsWith('?') && s.length > 20)
              .slice(0, 3)
          } catch {
            // ignore
          }
        }
      }
    }

    return NextResponse.json({
      done: false,
      progress: { current: currentStepIndex + 1, total: INTERVIEW_STEPS.length },
      step: {
        id: step.id,
        field: step.field,
        question: nextQuestion,
        placeholder: step.placeholder,
        helper: step.helper,
      },
      suggestions,
    })
  } catch (err: any) {
    console.error('[API /ai/interview] Error:', err)
    return NextResponse.json(
      {
        error: err?.message,
        done: false,
        progress: { current: 1, total: INTERVIEW_STEPS.length },
        step: {
          id: INTERVIEW_STEPS[0].id,
          field: INTERVIEW_STEPS[0].field,
          question: INTERVIEW_STEPS[0].question,
          placeholder: INTERVIEW_STEPS[0].placeholder,
          helper: INTERVIEW_STEPS[0].helper,
        },
        suggestions: [],
      },
      { status: 500 }
    )
  }
}
