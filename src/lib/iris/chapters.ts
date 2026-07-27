// Définition des chapitres du mémoire académique
// Chaque chapitre a son propre expert IA et son propre workflow

export type ChapterStatus = 'not_started' | 'in_progress' | 'draft' | 'completed' | 'validated'

export interface ChapterDef {
  id: string
  title: string
  shortTitle: string
  description: string
  icon: string // lucide icon name
  agent: string // agent id responsible
  order: number
  // Guiding questions the AI uses to interview the student
  guidingQuestions: string[]
  // Key elements the AI verifies for this chapter
  keyElements: string[]
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'sujet',
    title: 'Choix et validation du sujet',
    shortTitle: 'Sujet',
    description:
      "Analyse de l'actualité, de la faisabilité, de la disponibilité des données et de l'intérêt scientifique du sujet.",
    icon: 'Lightbulb',
    agent: 'directeur',
    order: 1,
    guidingQuestions: [
      "Quel domaine vous intéresse particulièrement dans votre filière ?",
      "Avez-vous observé un problème concret dans votre environnement professionnel ou académique ?",
      "Quelles sont les 3 à 5 mots-clés qui résument votre intuition de sujet ?",
      "Avez-vous accès à des données, une entreprise de stage ou un terrain d'étude ?",
    ],
    keyElements: [
      'Pertinence du sujet vis-à-vis de la filière',
      'Faisabilité (données, temps, accès terrain)',
      'Originalité par rapport à la littérature existante',
      'Intérêt scientifique et professionnel',
    ],
  },
  {
    id: 'introduction',
    title: 'Introduction générale',
    shortTitle: 'Introduction',
    description:
      "Présentation progressive du contexte, justification du choix du sujet et annonce du plan général.",
    icon: 'BookOpen',
    agent: 'redaction',
    order: 2,
    guidingQuestions: [
      "Comment présenteriez le contexte général de votre sujet à un non-spécialiste ?",
      "Quelle est l'origine de votre intérêt pour ce sujet ?",
      "Quel est l'enjeu principal que vous voulez traiter ?",
      "Quelles seront les grandes parties de votre mémoire ?",
    ],
    keyElements: [
      'Amorce contextualisée',
      'Justification du choix du sujet',
      'Annonce claire de la problématique',
      'Plan général annoncé',
    ],
  },
  {
    id: 'contexte',
    title: 'Contexte de l\'étude',
    shortTitle: 'Contexte',
    description:
      "Origine du sujet, évolution du phénomène, contexte local et international.",
    icon: 'Globe',
    agent: 'redaction',
    order: 3,
    guidingQuestions: [
      "D'où vient le phénomène que vous étudiez (origine historique, géographique, sectorielle) ?",
      "Comment a-t-il évolué ces dernières années ?",
      "Quelle est la situation dans votre pays ou région ?",
      "Quelle est la situation au niveau international ?",
    ],
    keyElements: [
      'Origine du phénomène',
      'Évolution chronologique',
      'Contexte local documenté',
      'Mise en perspective internationale',
    ],
  },
  {
    id: 'problematique',
    title: 'Problématique',
    shortTitle: 'Problématique',
    description:
      "Construction d'une problématique solide à partir du thème, du contexte et des recherches existantes.",
    icon: 'Target',
    agent: 'directeur',
    order: 4,
    guidingQuestions: [
      "Quelle est la question centrale que votre mémoire veut éclairer ?",
      "Pourquoi cette question mérite-t-elle une recherche ?",
      "À quel moment cette question se pose-t-elle de manière aiguë aujourd'hui ?",
      "Quelle serait la formulation la plus précise et opérationnelle de cette question ?",
    ],
    keyElements: [
      'Question unique et précise',
      'Formulation interrogative explicite',
      'Pertinence par rapport au contexte',
      'Faisabilité méthodologique',
    ],
  },
  {
    id: 'questions',
    title: 'Questions de recherche',
    shortTitle: 'Questions',
    description:
      "Décomposition de la problématique en sous-questions opérationnelles et hiérarchisées.",
    icon: 'HelpCircle',
    agent: 'methodologie',
    order: 5,
    guidingQuestions: [
      "Quelles sous-questions découlent logiquement de votre problématique ?",
      "Quelles dimensions du sujet doivent être éclairées ?",
      "Dans quel ordre ces questions s'enchaînent-elles ?",
    ],
    keyElements: [
      'Cohérence avec la problématique',
      'Caractère opérationnel des questions',
      'Hiérarchisation logique',
      'Couverture des dimensions du sujet',
    ],
  },
  {
    id: 'objectifs',
    title: 'Objectifs de recherche',
    shortTitle: 'Objectifs',
    description:
      "Objectif général et objectifs spécifiques, vérifiant leur cohérence avec la problématique.",
    icon: 'Flag',
    agent: 'methodologie',
    order: 6,
    guidingQuestions: [
      "Que voulez-vous accomplir à la fin de cette recherche ?",
      "Quels résultats concrets visez-vous ?",
      "Comment ces objectifs se déclinent-ils en étapes spécifiques ?",
    ],
    keyElements: [
      'Objectif général clair',
      'Objectifs spécifiques mesurables',
      'Cohérence avec les questions de recherche',
      'Réalisabilité dans le temps imparti',
    ],
  },
  {
    id: 'hypotheses',
    title: 'Hypothèses de recherche',
    shortTitle: 'Hypothèses',
    description:
      "Formulation d'hypothèses de recherche adaptées à la méthodologie choisie.",
    icon: 'Lightbulb',
    agent: 'methodologie',
    order: 7,
    guidingQuestions: [
      "Quelles réponses anticipées donnez-vous à vos questions de recherche ?",
      "Sur quoi reposent ces hypothèses (observations, théories, intuitions) ?",
      "Comment ces hypothèses pourront-elles être testées ?",
    ],
    keyElements: [
      'Hypothèses vérifiables',
      'Lien explicite avec les questions de recherche',
      'Adéquation à la méthodologie',
      'Formulation claire et non ambiguë',
    ],
  },
  {
    id: 'justification',
    title: 'Justification de l\'étude',
    shortTitle: 'Justification',
    description:
      "Intérêt scientifique, social, économique, politique et environnemental de la recherche.",
    icon: 'Sparkles',
    agent: 'directeur',
    order: 8,
    guidingQuestions: [
      "Quel est l'intérêt scientifique de votre étude ?",
      "Quel apport pour la société ou la communauté concernée ?",
      "Y a-t-il un intérêt économique ou managérial ?",
      "Y a-t-il un enjeu politique ou environnemental ?",
    ],
    keyElements: [
      'Intérêt scientifique',
      'Intérêt social',
      'Intérêt économique',
      'Intérêt politique / environnemental',
    ],
  },
  {
    id: 'literature',
    title: 'Revue de littérature',
    shortTitle: 'Revue littérature',
    description:
      "Organisation thématique, comparaison des auteurs, identification des convergences, divergences et lacunes.",
    icon: 'Library',
    agent: 'bibliographie',
    order: 9,
    guidingQuestions: [
      "Quels sont les grands thèmes qui structurent la littérature sur votre sujet ?",
      "Quels auteurs font autorité et que disent-ils ?",
      "Où sont les convergences et les divergences entre auteurs ?",
      "Quelles sont les lacunes que votre étude peut combler ?",
    ],
    keyElements: [
      'Organisation thématique (non chronologique)',
      'Comparaison critique des auteurs',
      'Identification des convergences et divergences',
      'Mise en évidence des lacunes',
    ],
  },
  {
    id: 'cadre',
    title: 'Cadres théorique et conceptuel',
    shortTitle: 'Cadre théorique',
    description:
      "Choix des théories explicatives, justification et construction du cadre conceptuel.",
    icon: 'Layers',
    agent: 'methodologie',
    order: 10,
    guidingQuestions: [
      "Quelles théories existantes éclairent votre sujet ?",
      "Pourquoi ces théories et pas d'autres ?",
      "Quels sont les concepts clés que vous mobilisez ?",
      "Comment ces concepts s'articulent-ils dans votre cadre conceptuel ?",
    ],
    keyElements: [
      'Présentation des théories mobilisées',
      'Justification du choix théorique',
      'Définition des concepts clés',
      'Cadre conceptuel articulé',
    ],
  },
  {
    id: 'methodologie',
    title: 'Méthodologie',
    shortTitle: 'Méthodologie',
    description:
      "Type d'étude, population, échantillonnage, outils de collecte et méthodes d'analyse.",
    icon: 'FlaskConical',
    agent: 'methodologie',
    order: 11,
    guidingQuestions: [
      "S'agit-il d'une étude qualitative, quantitative ou mixte ?",
      "Quelle est votre population d'étude et votre échantillon ?",
      "Quels outils de collecte allez-vous utiliser (questionnaire, entretien, observation, archives) ?",
      "Quelles méthodes d'analyse allez-vous appliquer ?",
    ],
    keyElements: [
      'Type d\'étude justifié',
      'Population et échantillon définis',
      'Outils de collecte décrits',
      'Méthodes d\'analyse précisées',
    ],
  },
  {
    id: 'resultats',
    title: 'Analyse des résultats',
    shortTitle: 'Résultats',
    description:
      "Interprétation des données, comparaison avec la littérature et mise en perspective.",
    icon: 'BarChart3',
    agent: 'statistiques',
    order: 12,
    guidingQuestions: [
      "Que montrent vos résultats de manière factuelle ?",
      "Comment les interpréter au regard de vos hypothèses ?",
      "En quoi confirment-ils ou infirment-ils la littérature ?",
      "Quels sont les résultats les plus surprenants et pourquoi ?",
    ],
    keyElements: [
      'Présentation factuelle des données',
      'Interprétation liée aux hypothèses',
      'Comparaison avec la littérature',
      'Mise en évidence des écarts et surprises',
    ],
  },
  {
    id: 'discussion',
    title: 'Discussion',
    shortTitle: 'Discussion',
    description:
      "Cohérence, limites, apports et implications des résultats.",
    icon: 'MessagesSquare',
    agent: 'directeur',
    order: 13,
    guidingQuestions: [
      "Quels sont les apports principaux de votre recherche ?",
      "Quelles en sont les limites (méthodologiques, contextuelles) ?",
      "Quelles implications pour la pratique, la théorie, la politique ?",
      "Quelles pistes de recherche futures votre travail ouvre-t-il ?",
    ],
    keyElements: [
      'Synthèse des apports',
      'Reconnaissance des limites',
      'Implications dégagées',
      'Pistes de recherche futures',
    ],
  },
  {
    id: 'conclusion',
    title: 'Conclusion',
    shortTitle: 'Conclusion',
    description:
      "Réponse explicite à chaque question de recherche et ouverture.",
    icon: 'CheckCircle2',
    agent: 'redaction',
    order: 14,
    guidingQuestions: [
      "Quelle réponse apportez-vous à votre problématique principale ?",
      "Chaque sous-question a-t-elle reçu une réponse claire ?",
      "Quelle ouverture souhaitez-vous donner à votre conclusion ?",
    ],
    keyElements: [
      'Réponse explicite à la problématique',
      'Toutes les questions de recherche traitées',
      'Synthèse des résultats principaux',
      'Ouverture ou recommandation finale',
    ],
  },
  {
    id: 'recommandations',
    title: 'Recommandations',
    shortTitle: 'Recommandations',
    description:
      "Recommandations réalistes, applicables et liées aux résultats.",
    icon: 'Compass',
    agent: 'directeur',
    order: 15,
    guidingQuestions: [
      "Quelles actions concrètes préconisez-vous à partir de vos résultats ?",
      "À qui s'adressent ces recommandations (décideurs, chercheurs, praticiens) ?",
      "Ces recommandations sont-elles réalistes et applicables ?",
    ],
    keyElements: [
      'Recommandations actionnables',
      'Destinataires identifiés',
      'Faisabilité des recommandations',
      'Lien direct avec les résultats',
    ],
  },
]

export function getChapter(id: string): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.id === id)
}
