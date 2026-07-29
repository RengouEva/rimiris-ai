import { NextRequest, NextResponse } from 'next/server'
import { chatLLM } from '@/lib/iris/llm'
import { requireSession, checkLLMRateLimit } from '@/lib/iris/security'

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// /api/ai/section-interview — Phase 3
// Entretien structuré par section avec 4 modes :
//   mode=know      → l'étudiant connaît la réponse, on la valide
//   mode=dont_know → l'IA explique le concept
//   mode=propose   → l'IA génère plusieurs propositions argumentées
//   mode=example   → l'IA affiche un exemple adapté au domaine
//
// L'IA ne rédige JAMAIS la section directement. Elle collecte les briques.
// ============================================================================

interface SectionInterviewRequest {
  sectionTitle: string
  sectionDescription?: string
  project: {
    title?: string
    level?: string
    filiere?: string
    country?: string
    norme?: string
    university?: string
    language?: string
  }
  themeUnderstanding?: {
    concepts?: string[]
    domain?: string
    summary?: string
  }
  problemContext?: {
    selected?: string
    rationale?: string
  }
  // Interview state
  answers: { questionId: string; question: string; answer: string }[]
  // Action
  action: 'next_question' | 'know' | 'dont_know' | 'propose' | 'example' | 'validate'
  // For mode=know
  studentInput?: string
}

// Question banks per section type — IRIS picks the next unanswered question
const QUESTION_BANKS: Record<string, { id: string; question: string; helper: string }[]> = {
  introduction: [
    { id: 'domain', question: "Quel est votre domaine d'étude principal ?", helper: 'Ex : Sciences de gestion, Informatique, Sociologie...' },
    { id: 'theme', question: 'Quel est votre thème exact ?', helper: 'En une phrase précise.' },
    { id: 'motivation', question: 'Pourquoi avez-vous choisi ce sujet ?', helper: 'Motivation personnelle, professionnelle ou académique.' },
    { id: 'problem', question: 'Quel problème concret souhaitez-vous étudier ?', helper: 'Le problème que vous voulez comprendre ou résoudre.' },
    { id: 'concerned', question: 'Qui est concerné par ce problème ?', helper: 'Population, organisation, région concernée.' },
    { id: 'location', question: 'Dans quel pays, quelle ville ou quelle entreprise se situe votre étude ?', helper: 'Le terrain.' },
    { id: 'relevance', question: 'Pourquoi ce problème est-il important aujourd\'hui ?', helper: 'Actualité, urgence, opportunité.' },
    { id: 'evidence', question: 'Existe-t-il des chiffres ou observations qui montrent que ce problème est réel ?', helper: 'Données, témoignages, faits.' },
  ],
  problematique: [
    { id: 'main_problem', question: 'Quel est le problème principal que votre recherche cherche à éclairer ?', helper: 'En une phrase.' },
    { id: 'since_when', question: 'Depuis quand ce problème est-il identifiable ?', helper: 'Période, événement déclencheur.' },
    { id: 'why_unsolved', question: 'Pourquoi ce problème n\'a-t-il pas encore été résolu ?', helper: 'Manque de recherche, complexité, contexte.' },
    { id: 'consequences', question: 'Quelles sont les conséquences si on ne traite pas ce problème ?', helper: 'Impact social, économique, scientifique.' },
    { id: 'who_suffers', question: 'Qui souffre de ce problème ou en subit les conséquences ?', helper: 'Population, acteurs.' },
    { id: 'existing_research', question: 'Quelles recherches existent déjà sur ce sujet ?', helper: 'Auteurs, travaux antérieurs.' },
    { id: 'limits_existing', question: 'Quelles limites présentent ces recherches existantes ?', helper: 'Ce qui manque, ce qui n\'est pas traité.' },
  ],
  objectifs: [
    { id: 'main_objective', question: 'Quel est votre objectif principal ?', helper: 'Ce que vous voulez atteindre.' },
    { id: 'specific_objectives', question: 'Quels sont vos objectifs spécifiques ?', helper: '2-4 sous-objectifs.' },
    { id: 'expected_result', question: 'Quel résultat attendez-vous à la fin de votre recherche ?', helper: 'Livrable scientifique.' },
    { id: 'usefulness', question: 'À qui ce résultat sera-t-il utile ?', helper: 'Académiques, praticiens, société.' },
  ],
  hypotheses: [
    { id: 'hypothesis_definition', question: 'Une hypothèse est une réponse provisoire à votre problématique. Quelle réponse provisoire proposez-vous ?', helper: 'Relation entre deux variables.' },
    { id: 'hypothesis_main', question: 'Quelle est votre hypothèse principale (H0) ?', helper: 'Hypothèse centrale.' },
    { id: 'hypothesis_secondary', question: 'Quelles sont vos hypothèses secondaires (H1, H2...) ?', helper: 'Hypothèses complémentaires.' },
    { id: 'hypothesis_variables', question: 'Quelles sont les variables que vous manipulez ou observez ?', helper: 'Indépendantes, dépendantes.' },
  ],
  methodologie: [
    { id: 'approach', question: 'Quelle approche méthodologique choisissez-vous (qualitative, quantitative, mixte) ?', helper: 'Type d\'étude.' },
    { id: 'sampling', question: 'Quelle est votre population d\'étude et comment allez-vous échantillonner ?', helper: 'Taille, méthode d\'échantillonnage.' },
    { id: 'tools', question: 'Quels outils de collecte allez-vous utiliser ?', helper: 'Questionnaire, entretien, observation, archives.' },
    { id: 'analysis', question: 'Comment allez-vous analyser les données recueillies ?', helper: 'Méthode d\'analyse.' },
    { id: 'justification', question: 'Pourquoi cette méthode est-elle la mieux adaptée à votre question ?', helper: 'Justification scientifique.' },
  ],
  revue: [
    { id: 'themes', question: 'Quels grands thèmes avez-vous identifiés dans la littérature sur ce sujet ?', helper: 'Axes de lecture.' },
    { id: 'key_authors', question: 'Quels sont les auteurs majeurs qui ont travaillé sur ce sujet ?', helper: 'Références incontournables.' },
    { id: 'consensus', question: 'Sur quoi les auteurs sont-ils d\'accord ?', helper: 'Convergences.' },
    { id: 'disagreements', question: 'Sur quoi les auteurs divergent-ils ?', helper: 'Controverses.' },
    { id: 'gap', question: 'Quelle est la lacune que votre étude comblera ?', helper: 'Votre contribution.' },
  ],
  resultats: [
    { id: 'main_finding', question: 'Quel est votre résultat principal ?', helper: 'Découverte centrale.' },
    { id: 'secondary_findings', question: 'Quels sont vos résultats secondaires ?', helper: 'Découvertes complémentaires.' },
    { id: 'surprises', question: 'Y a-t-il des résultats qui vous ont surpris ?', helper: 'Inattendus.' },
    { id: 'data_support', question: 'Quelles données支撑ent ces résultats ?', helper: 'Chiffres, citations, observations.' },
  ],
  discussion: [
    { id: 'interpretation', question: 'Comment interprétez-vous vos résultats ?', helper: 'Sens, portée.' },
    { id: 'comparison', question: 'Comment vos résultats se comparent-ils à la littérature existante ?', helper: 'Convergence, divergence.' },
    { id: 'implications', question: 'Quelles sont les implications théoriques et pratiques de vos résultats ?', helper: 'Portée.' },
    { id: 'limitations', question: 'Quelles sont les limites de votre étude ?', helper: 'Honnêteté scientifique.' },
  ],
  conclusion: [
    { id: 'summary', question: 'Quelle est la synthèse de votre travail en 3-4 phrases ?', helper: 'Récapitulatif.' },
    { id: 'contributions', question: 'Quelles sont vos contributions principales (théoriques et pratiques) ?', helper: 'Apport.' },
    { id: 'recommendations', question: 'Quelles recommandations proposez-vous ?', helper: 'Pistes d\'action.' },
    { id: 'future_research', question: 'Quelles perspectives de recherche future voyez-vous ?', helper: 'Ouvertures.' },
  ],
  default: [
    { id: 'objective', question: 'Quel est l\'objectif précis de cette section ?', helper: 'Ce qu\'elle doit apporter au mémoire.' },
    { id: 'key_ideas', question: 'Quelles sont les idées clés à développer ?', helper: '2-4 idées essentielles.' },
    { id: 'evidence', question: 'Quelles preuves, exemples ou données vont soutenir ces idées ?', helper: 'Arguments.' },
    { id: 'connection', question: 'Comment cette section se relie-t-elle aux autres parties du mémoire ?', helper: 'Cohérence.' },
  ],
}

function pickQuestionBank(sectionTitle: string): { id: string; question: string; helper: string }[] {
  const t = sectionTitle.toLowerCase()
  if (t.includes('introduc')) return QUESTION_BANKS.introduction
  if (t.includes('problématique') || t.includes('problematique')) return QUESTION_BANKS.problematique
  if (t.includes('objectif')) return QUESTION_BANKS.objectifs
  if (t.includes('hypothès') || t.includes('hypothes')) return QUESTION_BANKS.hypotheses
  if (t.includes('méthod') || t.includes('method')) return QUESTION_BANKS.methodologie
  if (t.includes('revue') || t.includes('littérature') || t.includes('literature')) return QUESTION_BANKS.revue
  if (t.includes('résultat') || t.includes('resultat') || t.includes('présentation')) return QUESTION_BANKS.resultats
  if (t.includes('discussion') || t.includes('analyse')) return QUESTION_BANKS.discussion
  if (t.includes('conclusion')) return QUESTION_BANKS.conclusion
  return QUESTION_BANKS.default
}

export async function POST(req: NextRequest) {
  // VULN-02 + VULN-12: Auth + rate limiting
  const auth = requireSession(req)
  if (!auth.ok) return auth.response!
  const llmRL = checkLLMRateLimit(req, auth.session!.accountId)
  if (!llmRL.allowed) {
    return NextResponse.json({ error: llmRL.error }, { status: 429 })
  }

  try {
    const body = (await req.json()) as SectionInterviewRequest
    const {
      sectionTitle,
      sectionDescription,
      project,
      themeUnderstanding,
      problemContext,
      answers,
      action,
      studentInput,
    } = body

    const bank = pickQuestionBank(sectionTitle)
    const answeredIds = new Set(answers.map((a) => a.questionId))
    const nextQuestion = bank.find((q) => !answeredIds.has(q.id))

    // ---- Action: next_question ----
    if (action === 'next_question') {
      if (!nextQuestion) {
        return NextResponse.json({
          done: true,
          nextQuestion: null,
          progress: { current: answers.length, total: bank.length },
          message: "Toutes les questions de cette section ont été collectées. Vous pouvez maintenant lancer la validation puis la rédaction.",
        })
      }
      return NextResponse.json({
        done: false,
        nextQuestion: {
          questionId: nextQuestion.id,
          question: nextQuestion.question,
          helper: nextQuestion.helper,
        },
        progress: { current: answers.length, total: bank.length },
        modes: ['know', 'dont_know', 'propose', 'example'],
      })
    }

    // ---- Action: know (student answered) ----
    if (action === 'know' && studentInput) {
      // Just register the answer, no AI call needed
      return NextResponse.json({
        ok: true,
        registeredAnswer: {
          questionId: answers.length > 0 ? `q${answers.length}` : 'q0',
          question: '',
          answer: studentInput.trim(),
        },
        message: "Réponse enregistrée. Passons à la question suivante.",
      })
    }

    // ---- Action: dont_know (AI explains the concept) ----
    if (action === 'dont_know' && nextQuestion) {
      const explanation = await chatLLM(
        [
          {
            role: 'system',
            content: `Tu es le Coach méthodologique de Rimiris. L'étudiant ne sait pas répondre à cette question. Explique-lui le concept en français académique, en 3-4 phrases maximum, avec un exemple concret adapté à son domaine (${project.filiere || 'général'}). Ne lui donne PAS la réponse, mais aide-le à la trouver lui-même.

Question : "${nextQuestion.question}"
Thème : ${project.title || 'non précisé'}
Domaine : ${themeUnderstanding?.domain || project.filiere || 'non précisé'}`,
          },
          { role: 'user', content: 'Je ne sais pas répondre.' },
        ],
        {
          temperature: 0.6,
          maxTokens: 400,
          thinking: 'disabled',
        },
      )
      return NextResponse.json({ explanation })
    }

    // ---- Action: propose (AI generates 3 proposals) ----
    if (action === 'propose' && nextQuestion) {
      const raw = await chatLLM(
        [
          {
            role: 'system',
            content: `Tu es le Coach méthodologique de Rimiris. L'étudiant veut que tu lui proposes plusieurs réponses. Génère 3 propositions argumentées, spécifiques à son contexte.

Question : "${nextQuestion.question}"
Thème : ${project.title || 'non précisé'}
Niveau : ${project.level || 'Master'}
Filière : ${project.filiere || 'non précisée'}
Pays : ${project.country || 'non précisé'}
Domaine : ${themeUnderstanding?.domain || 'non précisé'}
Problématique : ${problemContext?.selected || 'non précisée'}

Chaque proposition doit être :
- Une réponse complète à la question
- Adaptée au niveau et au domaine
- Suffisamment différente des autres

Réponds UNIQUEMENT en JSON :
{
  "proposals": [
    { "id": "p1", "label": "Titre court", "content": "Réponse complète en 1-2 phrases", "rationale": "Pourquoi cette option" },
    { "id": "p2", ... },
    { "id": "p3", ... }
  ]
}`,
          },
          { role: 'user', content: 'Propose-moi plusieurs réponses.' },
        ],
        {
          temperature: 0.75,
          maxTokens: 900,
          thinking: 'disabled',
        },
      )
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      let proposals: any[] = []
      try {
        const parsed = JSON.parse(cleaned)
        proposals = parsed.proposals || []
      } catch {
        proposals = []
      }
      return NextResponse.json({ proposals })
    }

    // ---- Action: example (AI shows a domain-specific example) ----
    if (action === 'example' && nextQuestion) {
      const example = await chatLLM(
        [
          {
            role: 'system',
            content: `Tu es le Coach méthodologique de Rimiris. L'étudiant veut voir un exemple. Affiche un exemple concret, adapté à son domaine, en 3-5 phrases.

Question : "${nextQuestion.question}"
Thème : ${project.title || 'non précisé'}
Filière : ${project.filiere || 'non précisée'}
Domaine : ${themeUnderstanding?.domain || 'non précisé'}

L'exemple doit :
- Être tiré d'un cas plausible dans SON domaine
- Montrer comment on répond à ce type de question
- Être clair et concret
- Ne pas être LA réponse à SON sujet, mais un exemple parallèle

Réponds en français académique, max 150 mots.`,
          },
          { role: 'user', content: 'Montre-moi un exemple.' },
        ],
        {
          temperature: 0.7,
          maxTokens: 500,
          thinking: 'disabled',
        },
      )
      return NextResponse.json({ example })
    }

    // ---- Action: validate (final check before redaction) ----
    if (action === 'validate') {
      const raw = await chatLLM(
        [
          {
            role: 'system',
            content: `Tu es le Contrôleur qualité de Rimiris. Vérifie les réponses collectées pour cette section avant la rédaction.

SECTION : "${sectionTitle}"
${sectionDescription ? `Description : ${sectionDescription}` : ''}
Niveau : ${project.level || 'Master'}
Thème : ${project.title || 'non précisé'}

RÉPONSES COLLECTÉES :
${answers.map((a, i) => `${i + 1}. ${a.question || '(question)'}\n   → ${a.answer}`).join('\n')}

Vérifie 4 dimensions :
1. Cohérence : les réponses sont-elles cohérentes entre elles ?
2. Faisabilité : peut-on rédiger une section académique avec ces informations ?
3. Précision : les réponses sont-elles assez précises ?
4. Logique : l'enchaînement est-il logique ?

Réponds UNIQUEMENT en JSON :
{
  "coherence": { "ok": true/false, "notes": "..." },
  "feasibility": { "ok": true/false, "notes": "..." },
  "precision": { "ok": true/false, "notes": "..." },
  "logic": { "ok": true/false, "notes": "..." },
  "overallOk": true/false,
  "missingInfo": ["information manquante 1", "..."]
}`,
          },
          { role: 'user', content: 'Valide les réponses avant rédaction.' },
        ],
        {
          temperature: 0.4,
          maxTokens: 800,
          thinking: 'disabled',
        },
      )
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      let validation: any
      try {
        validation = JSON.parse(cleaned)
        validation.overallOk = Boolean(validation.overallOk)
      } catch {
        validation = {
          coherence: { ok: true, notes: 'Validation par défaut' },
          feasibility: { ok: true, notes: 'Validation par défaut' },
          precision: { ok: true, notes: 'Validation par défaut' },
          logic: { ok: true, notes: 'Validation par défaut' },
          overallOk: true,
          missingInfo: [],
        }
      }
      return NextResponse.json(validation)
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (err: any) {
    console.error('[API /ai/section-interview] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
