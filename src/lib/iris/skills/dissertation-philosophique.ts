// ============================================================================
// skills/dissertation-philosophique.ts — Dissertation philosophique
// ----------------------------------------------------------------------------
// Type de document : exercice scolaire / universitaire centré sur
// l'argumentation rationnelle et la résolution d'un problème philosophique.
//
// Sources :
//   1. Méthodologie de la dissertation philosophique (Sénégal, réseau LIGRE
//      SAROIR — document Mamadou Moustapha Sarr, 17 p.).
//   2. Annale Philosophie 1 — Désiré Komla FADEME, collection KOUVAHEY,
//      80 sujets corrigés (Tle A4/C/D/G, bac ouest-africain 2e partie).
//   3. Méthodologie officielle du baccalauréat français (L'Étudiant, 2024).
//
// UQAC : NON. La dissertation philosophique suit son propre canevas
// (dialectique thèse-antithèse-synthèse) qui n'a aucun rapport avec le
// Guide DALL de l'UQAC. C'est un exercice scolaire/académique de culture
// francophone (France, Afrique francophone, Suisse, Belgique).
// ============================================================================

import type { DocumentTypeSkill } from './types'

export const dissertationPhilosophiqueSkill: DocumentTypeSkill = {
  id: 'dissertation_philosophique',
  label: 'Dissertation philosophique',
  shortLabel: 'Dissertation philo',
  icon: 'Feather',
  pageRange: [4, 8],
  description:
    "Exercice scolaire et académique typique de l'enseignement francophone (Terminale, classes préparatoires, khâgne, université). " +
    "L'étudiant doit traiter un sujet philosophique en respectant la structure dialectique canonique : " +
    "introduction (amorce, analyse, problématique, annonce de plan), développement (thèse / antithèse / synthèse), " +
    "conclusion (bilan, réponse, ouverture). Volume : 4 à 8 pages (épreuve de 4h au baccalauréat français). " +
    "L'argumentation doit être rationnelle (convaincre, pas persuader), appuyée sur des citations philosophiques " +
    "pertinentes (Platon, Aristote, Descartes, Kant, Rousseau, Hobbes, Marx, Sartre, etc.).",

  expectedStructure: [
    // =========================== INTRODUCTION ===========================
    {
      order: 0,
      title: 'Introduction',
      nature: 'main',
      required: true,
      wordCountHint: 300,
      description:
        "L'introduction comporte 4 sous-étapes obligatoires et ne doit JAMAIS donner les conclusions à l'avance. " +
        "(1) Amener le sujet : partir d'une considération générale (exemple court, définition, expression courante, " +
        "citation SI lien direct avec le sujet, du général au particulier). " +
        "(2) Poser le sujet : énoncer la question telle qu'elle figure dans le libellé, repréciser les concepts clés, " +
        "reformuler avec des mots personnels en dégageant les aspects explicites. " +
        "(3) Poser la problématique : soulever l'ensemble des questions que le sujet pose ; " +
        "révéler l'obstacle — montrer que la question n'admet pas de réponse évidente mais au moins deux réponses " +
        "contradictoires d'égale importance. " +
        "(4) Annoncer le plan : indiquer le chemin à suivre par DEUX questions (l'une relative à la thèse, l'autre à " +
        "l'antithèse) ; ne pas substituer l'annonce de plan à la position du problème.",
    },

    // =========================== DÉVELOPPEMENT ===========================
    {
      order: 1,
      title: 'Développement — Partie I : Thèse',
      nature: 'main',
      required: true,
      wordCountHint: 600,
      description:
        "Amorce du thème, définition des notions, établissement du rapport (convergence, divergence, dissemblance). " +
        "Puis défendre la proposition du sujet par une argumentation rationnelle. " +
        "Chaque argument = 1 paragraphe avec : (a) explication, (b) exemple précis, (c) phrase de conclusion. " +
        "Convoquer d'autres auteurs (citations) pour développer la thèse SANS la contredire. " +
        "Rester collé au sujet et confirmer la véracité des propos du libellé. " +
        "La thèse est une proposition ou théorie qu'on tient pour vraie et qu'on s'engage à défendre.",
    },
    {
      order: 2,
      title: 'Développement — Partie II : Antithèse',
      nature: 'main',
      required: true,
      wordCountHint: 600,
      description:
        "ATTENTION : l'antithèse n'est JAMAIS l'inverse de la thèse. C'est la mise en évidence des LIMITES " +
        "de la thèse. Apporter des contre-exemples, des idées dans le sens d'une autre approche du problème. " +
        "Faire des objections qui montrent les insuffisances et les limites de la thèse. " +
        "Opposer deux pensées pour mieux faire ressortir le contraste. " +
        "Transition obligatoire entre I et II : (a) mini-conclusion de I, (b) critique du point faible, (c) annonce de II.",
    },
    {
      order: 3,
      title: 'Développement — Partie III : Synthèse',
      nature: 'main',
      required: true,
      wordCountHint: 500,
      description:
        "Lieu de la conciliation qui DÉPASSE la thèse et l'antithèse. " +
        "ATTENTION : la synthèse n'est JAMAIS une simple addition I+II. Elle doit apporter quelque chose de NOUVEAU " +
        "(dépassement, conciliation, nouvelle perspective, changement de niveau d'analyse). " +
        "Développer une idée qui prend en charge la thèse ET l'antithèse dans une vision supérieure. " +
        "Transition obligatoire entre II et III : (a) mini-conclusion de II, (b) critique du point faible, " +
        "(c) annonce de III.",
    },

    // =========================== CONCLUSION ===========================
    {
      order: 4,
      title: 'Conclusion',
      nature: 'main',
      required: true,
      wordCountHint: 150,
      description:
        "Trois étapes obligatoires : " +
        "(1) Bilan : reprise logique de l'essentiel (résumé des grandes parties). " +
        "(2) Solution retenue : répondre avec exactitude à la question posée en prenant position. " +
        "(3) Ouverture (facultative) : si la solution demeure difficile, élargir le débat en ouvrant des perspectives. " +
        "ATTENTION : l'ouverture est FACULTATIVE. Dans le doute, s'abstenir (mieux vaut pas d'ouverture " +
        "qu'une ouverture ratée). " +
        "La conclusion marque l'engagement face au problème posé : aboutissement d'une pensée personnelle, " +
        "même si l'on s'est aidé des grands philosophes pour progresser.",
    },
  ],

  specificRules: [
    // Structure
    "L'introduction ne doit JAMAIS donner les conclusions à l'avance — rester dans l'interrogation.",
    "L'annonce de plan ne doit PAS se substituer à la position du problème.",
    "L'antithèse n'est JAMAIS l'inverse de la thèse — c'est la mise en évidence de ses LIMITES.",
    "La synthèse n'est JAMAIS une simple addition thèse + antithèse — elle doit apporter du NOUVEAU.",
    "Chaque argument comporte 3 éléments : (1) explication, (2) exemple précis, (3) phrase de conclusion.",
    "Transitions obligatoires entre les parties : mini-conclusion + critique + annonce de la partie suivante.",
    "L'ouverture en conclusion est FACULTATIVE — mieux vaut s'abstenir que de rater son ouverture.",

    // Argumentation
    "Convaincre (argumentation rationnelle), pas persuader (émotion). « Il ne suffit pas d'être persuasif. »",
    "Toujours montrer le lien problématique qui justifie l'enchaînement des parties.",
    "Convoquer d'autres auteurs (Platon, Aristote, Descartes, Kant, Rousseau, Hobbes, Marx, Sartre…) " +
      "pour développer la thèse — jamais citer hors contexte.",
    "Les citations ne sont utiles que si elles ont un lien DIRECT avec le sujet.",

    // Méthode de travail
    "Définir TOUS les termes du sujet au brouillon AVANT tout — c'est la condition d'une problématique juste.",
    "Le brouillon est la colonne vertébrale de la dissertation : y écrire plan détaillé + éléments d'intro + " +
      "éléments de conclusion.",
    "Identifier la ou les notions centrales du sujet avant de commencer.",
    "Laisser du temps en fin d'épreuve pour la relecture (les fautes d'orthographe coûtent des points).",

    // Présentation
    "Sauter une ligne et un carreau entre l'introduction et le développement, entre le développement et la " +
      "conclusion, et entre les parties (règle ouest-africaine).",
    "Privilégier la clarté logique au style littéraire : « On veut un raisonnement, pas que vous deveniez Victor Hugo. »",
  ],

  methodologicalGuidance:
    "La dissertation philosophique est un exercice DIALECTIQUE et CRITIQUE : elle vise à " +
    "démontrer que la question posée n'admet pas de réponse évidente. Le cœur du travail " +
    "est la PROBLÉMATISATION — sans problème bien cerné, aucune argumentation valable " +
    "n'est possible. La structure canonique est le plan dialectique thèse-antithèse-synthèse, " +
    "mais deux autres plans existent : " +
    "(a) le plan ANALYTIQUE pour les sujets en « en quoi » (analyse des enjeux, examen " +
    "des conditions, évaluation), " +
    "(b) le plan THÉMATIQUE pour les sujets qui se prêtent à un traitement par notions " +
    "(ex. : la conscience, l'inconscient, le désir). " +
    "Les sujets peuvent être : " +
    "• une question directe (ex. : « La liberté est-elle une illusion ? »), " +
    "• une citation à commenter (ex. : « Philosopher, c'est se comporter à l'égard de " +
    "l'univers comme si rien n'allait de soi »), " +
    "• un rapprochement de notions (ex. : « Travail et liberté »). " +
    "L'épreuve type du baccalauréat français dure 4 heures, au choix entre 2 ou 3 sujets " +
    "de dissertation + 1 commentaire de texte. L'étudiant doit traiter UN seul sujet.",

  defaultLayout: {
    paperFormat: 'A4',
    fontFamily: "'Times New Roman', 'Liberation Serif', Georgia, serif",
    fontSizePt: 12,
    marginTopMm: 25,
    marginBottomMm: 25,
    marginLeftMm: 30,
    marginRightMm: 25,
    lineHeight: 1.5,
    firstLineIndentMm: 12.5,
    paragraphSpacing: 1.0,
    justified: true,
  },
  useRomanPaginationForFrontMatter: false,

  // --- Champs spécifiques au skill ---
  appliesUQAC: false,

  writingStyle:
    "Registre académique rationnel — l'objectif est de CONVAINCRE (pas de persuader). " +
    "3e personne ou « nous » de modestie ; la 1re personne singulière est proscrite sauf dans une prise de " +
    "position finale argumentée. " +
    "Phrases claires, articulations logiques marquées (« or », « en effet », « néanmoins », « cependant », " +
    "« ainsi », « par conséquent », « ce faisant », « en revanche »). " +
    "Vocabulaire philosophique précis (concept, notion, thèse, antithèse, synthèse, paradigme, dogmatique, " +
    "critique, empirique, a priori, a posteriori, ontologique, épistémologique, éthique) — défini à sa 1ʳᵉ " +
    "occurrence si nécessaire. " +
    "Privilégier la CLARTÉ LOGIQUE au style littéraire : « On veut un raisonnement, pas que vous deveniez Victor Hugo. » " +
    "Aucune affirmation non argumentée. Toute affirmation doit être soit démontrée, soit appuyée sur un exemple, " +
    "soit attribuée à un auteur cité. " +
    "Usage du conditionnel pour formuler une hypothèse ou une interprétation. " +
    "Éviter les formules péremptoires (« il est évident que », « tout le monde sait que »).",

  citationStyle:
    "Citations philosophiques intégrées au texte, entre guillemets français « ». " +
    "Toujours attribuer explicitement la citation (nom de l'auteur, ouvrage si pertinent). " +
    "Exemple : Comme l'écrit Descartes dans les Principes de la philosophie, « toute la philosophie est comme " +
    "un arbre dont les racines sont la métaphysique, le tronc la physique et les branches qui sortent de ce " +
    "tronc sont les autres sciences ». " +
    "Citation courte : intégrée au texte. Citation longue (> 3 lignes) : en retrait, simple interligne, " +
    "sans guillemets. " +
    "Ne JAMAIS citer un auteur hors contexte — la citation doit avoir un lien direct avec l'argument. " +
    "Éviter les surcitations (trop de citations tuent l'argumentation personnelle). " +
    "Auteurs du programme à mobiliser selon les notions : " +
    "Platon, Aristote, Épicure, Stoïciens (Épictète, Sénèque, Marc-Aurèle), Augustin, Thomas d'Aquin, " +
    "Machiavel, Descartes, Spinoza, Leibniz, Locke, Hume, Rousseau, Kant, Hegel, Schopenhauer, Marx, " +
    "Nietzsche, Bergson, Husserl, Heidegger, Wittgenstein, Russell, Sartre, Arendt, Camus, Foucault, " +
    "Habermas, Rawls, etc. — et, selon contexte, penseurs africains (Mveng, Eboué, Ki-Zerbo, Mudimbe, " +
    "Appiah, Towa, Hountondji).",

  extraPromptContext: (project) => {
    const extras: string[] = []

    extras.push(
      "EXERCICE = DISSERTATION PHILOSOPHIQUE : la structure est imposée (introduction / thèse / antithèse / synthèse / " +
      "conclusion) et l'argumentation doit être DIALECTIQUE et CRITIQUE. " +
      "Le cœur du travail est la PROBLÉMATISATION : sans problème bien cerné, aucune argumentation valable. " +
      "L'antithèse n'est pas le contraire de la thèse mais ses LIMITES. La synthèse n'est pas thèse+antithèse " +
      "mais un DÉPASSEMENT. Ne JAMAIS donner les conclusions dans l'introduction."
    )

    // Détection : dissertation type bac français ?
    if (project.level && /terminale|bac|lycée|lycée/i.test(project.level)) {
      extras.push(
        "NIVEAU TERMINALE / BAC : épreuve de 4 heures, choix entre 2-3 sujets + 1 commentaire. " +
        "Volume attendu : 4 à 6 pages. " +
        "Le correcteur attend la maîtrise de la méthode (introduction en 4 étapes, plan dialectique, " +
        "conclusion en 3 étapes) ET une culture philosophique précise (auteurs, citations, notions du programme). " +
        "Le programme officiel français comporte 17 notions : le bonheur, la conscience, le devoir, l'État, " +
        "l'inconscient, la justice, le langage, la liberté, la nature, la raison, la religion, la science, " +
        "le sujet, le temps, le travail, la vérité, le désir (depuis 2003)."
      )
    }

    // Détection : contexte ouest-africain (Tle A4/C/D/G)
    if (project.country && /cameroun|côte.?d?ivoire|ivoirien|sénégal|togo|mali|burkina|niger|bénin|afrique/i.test(project.country)) {
      extras.push(
        "CONTEXTE OUEST-AFRICAIN / BAC 2e PARTIE : le programme et les séries diffèrent du bac français. " +
        "Séries Tle A4 (littéraire), C/D (scientifique), G (technologique). " +
        "La dissertation est l'épreuve reine, structurée en thèse-antithèse-synthèse (souvent formulée " +
        "« oui - non - non nuancé » dans les recueils locaux). " +
        "Présentation : sauter une ligne et un carreau entre les grandes parties. " +
        "Citer les penseurs africains quand pertinent (Mveng, Eboué, Ki-Zerbo, Mudimbe, Appiah, " +
        "Towa, Hountondji) en plus du canon occidental. " +
        "Thématiques fréquentes : la philosophie africaine existe-t-elle ? la philosophie peut-elle " +
        "s'accorder avec la religion ? le philosophe est-il l'homme de son temps ?"
      )
    }

    // Détection : classes préparatoires / khâgne
    if (project.level && /prépa|khâgne|hypokhâgne|cpge|classes préparatoires/i.test(project.level)) {
      extras.push(
        "CLASSES PRÉPARATOIRES : niveau d'exigence supérieur au bac. " +
        "Volume attendu : 6 à 8 pages en 4h (khâgne) ou 6h (concours). " +
        "L'argumentation doit être plus fine, les citations plus précises, " +
        "la problématisation plus conceptuelle. " +
        "Connaître les repères philosophiques (absolu/relatif, abstrait/concret, en acte/en puissance, " +
        "analytique/synthétique, a priori/a posteriori, contingent/nécessaire, empirique/transcendantal, " +
        "essence/existence, expliquer/comprendre, faire/subir, idéalisme/réalisme, " +
        "intelligible/sensible, légal/légitime, moyen/fin, objectif/subjectif, " +
        "obligation/contrainte, principe/conséquence, raison/causes, relatif/absolu, " +
        "droit/fait, théorie/pratique, vrai/probable, universel/particulier, etc.)."
      )
    }

    // Détection : université (L1-L3 philosophie)
    if (project.level && /licence|l1|l2|l3|université/i.test(project.level)) {
      extras.push(
        "NIVEAU UNIVERSITAIRE (L1-L3 philosophie) : la dissertation universitaire " +
        "exige une problématisation plus conceptuelle et une knowledge fine du corpus. " +
        "Volume attendu : 6 à 8 pages (examen terminal) ou 10-15 pages (dissertation maison). " +
        "Préciser le cadre conceptuel (auteur, œuvre, période). " +
        "Citations précises avec référence (œuvre, page si possible)."
      )
    }

    // Si le sujet est une citation, le rappeler
    if (project.theme && /^["«']/.test(project.theme.trim())) {
      extras.push(
        "SUJET-CITATION DÉTECTÉ : le sujet est une citation à commenter. " +
        "Méthode spécifique : (1) identifier l'auteur et l'œuvre, (2) expliciter le sens littéral, " +
        "(3) dégager la thèse implicite de l'auteur, (4) la mettre en débat (est-elle vraie ? " +
        "sous quelles conditions ? quelles limites ?), (5) la dépasser vers une réflexion personnelle. " +
        "Le plan peut rester dialectique, mais la première partie doit EXPOSER la pensée de l'auteur " +
        "avant de la discuter."
      )
    }

    return extras.join('\n')
  },

  // --- Champs spécifiques à la dissertation philosophique ---
  // (étend l'interface DocumentTypeSkill — cf. types.ts)
  planTypes: [
    {
      id: 'dialectique',
      label: 'Plan dialectique (thèse — antithèse — synthèse)',
      whenToUse:
        "Le plus courant en philosophie. Convient aux sujets interrogatifs " +
        "(« X est-il Y ? », « Peut-on X ? ») et aux sujets-citations qui prêtent au débat.",
      structure: [
        "I. Thèse — défendre la proposition du sujet par arguments + citations",
        "II. Antithèse — LIMITES de la thèse (pas son contraire !) par objections + contre-exemples",
        "III. Synthèse — DÉPASSEMENT de l'opposition par un changement de niveau d'analyse",
      ],
    },
    {
      id: 'analytique',
      label: 'Plan analytique (analyse — conditions — évaluation)',
      whenToUse:
        "Pour les sujets en « en quoi », « comment », « pourquoi ». " +
        "Moins courant en dissertation philo qu'en dissertation française.",
      structure: [
        "I. Analyse du problème (dégager les enjeux et concepts)",
        "II. Conditions de possibilité (sous quelles conditions X est-il possible ?)",
        "III. Évaluation critique (limites, portée, implications)",
      ],
    },
    {
      id: 'thematique',
      label: 'Plan thématique (par notions / aspects du sujet)',
      whenToUse:
        "Pour les sujets qui confrontent deux notions (ex. : « Travail et liberté ») " +
        "ou qui se prêtent à un traitement par aspects (psychologique, moral, politique…).",
      structure: [
        "I. Thème 1 — analyse de la première notion",
        "II. Thème 2 — analyse de la seconde notion",
        "III. Confrontation / dépassement — mise en rapport des deux notions",
      ],
    },
  ],

  // Corpus d'auteurs et notions du programme officiel français ( Terminale )
  // + repertoire ouest-africain
  notionBank: [
    'bonheur', 'conscience', 'devoir', 'État', 'inconscient', 'justice',
    'langage', 'liberté', 'nature', 'raison', 'religion', 'science',
    'sujet', 'temps', 'travail', 'vérité', 'désir',
    // Notions complémentaires (programme ouest-africain)
    'art', 'technique', 'éducation', 'démocratie', 'loi', 'morale',
    'opinion', 'sagesse', 'sens commun', 'vérité scientifique', 'vérité philosophique',
  ],

  authorBank: [
    // Canon occidental
    "Platon", "Aristote", "Épicure", "Épictète", "Sénèque", "Marc-Aurèle",
    "Saint Augustin", "Thomas d'Aquin", "Machiavel", "Montaigne", "Descartes",
    "Spinoza", "Leibniz", "Locke", "Hume", "Rousseau", "Kant", "Hegel",
    "Schopenhauer", "Comte", "Marx", "Nietzsche", "Bergson", "Husserl",
    "Heidegger", "Wittgenstein", "Russell", "Sartre", "Arendt", "Camus",
    "Foucault", "Habermas", "Rawls", "Levinas", "Ricœur", "Derrida",
    // Penseurs africains
    "Engelbert Mveng", "Félix Eboué", "Joseph Ki-Zerbo", "Vumbi Yoka Mudimbe",
    "Kwame Anthony Appiah", "Marcien Towa", "Paulin Hountondji",
  ],

  subjectBank: [
    // Sujets sur la PHILOSOPHIE
    "La pluralité des philosophies est-elle un argument contre la philosophie ?",
    "La tâche de la philosophie est-elle de dénoncer les illusions dont les hommes vivent ?",
    "La philosophie doit-elle aller contre le sens commun ?",
    "Philosopher, est-ce contester ses convictions ?",
    "L'exercice de la philosophie contribue-t-il au développement de la raison ?",
    "« La philosophie est la science qui met fin au règne des certitudes. » Cette définition vous paraît-elle recevable ?",
    "La réflexion philosophique est-elle dangereuse pour les croyances ?",
    "Le philosophe est celui qui dit en y pensant ce que tout le monde dit sans y penser. Qu'en pensez-vous ?",
    "La réflexion philosophique peut-elle être utile ?",
    "La philosophie peut-elle s'accorder avec la religion ?",
    "Y a-t-il des vérités indiscutables en philosophie ?",
    "Existe-t-il une philosophie africaine ?",
    "À quoi sert la philosophie ?",

    // Sujets sur la LIBERTÉ
    "Être libre, est-ce faire ce qui me plaît ?",
    "Un homme libre est-il nécessairement heureux ?",
    "La conscience est-elle source de liberté ou de contrainte ?",
    "Sommes-nous responsables de l'avenir ?",
    "La liberté peut-elle se passer de règles ?",
    "Serions-nous plus libres sans État ?",

    // Sujets sur la CONSCIENCE
    "La conscience de soi est-elle une connaissance de soi ?",
    "Suis-je ce que j'ai conscience d'être ?",
    "La conscience implique-t-elle la maîtrise de soi ?",
    "La conscience nous éloigne-t-elle de la vérité ?",

    // Sujets sur le BONHEUR
    "Le bonheur est-il un idéal inaccessible ?",
    "Le bonheur est-il une affaire de politique ?",
    "Les désirs sont-ils un obstacle au bonheur ?",
    "Faut-il travailler pour être heureux ?",

    // Sujets sur le DEVOIR
    "Suis-je libre quand je fais mon devoir ?",
    "Avons-nous le devoir de faire le bonheur des autres ?",
    "La désobéissance à la loi peut-elle être un devoir ?",
    "Est-ce par devoir ou par intérêt qu'il faut être juste ?",

    // Sujets sur la VÉRITÉ
    "Douter, est-ce désespérer de la vérité ?",
    "Toute vérité est-elle démontrable ?",
    "La diversité des opinions rend-elle vaine la recherche de la vérité ?",
    "La recherche de la vérité peut-elle être désintéressée ?",

    // Sujets sur la SCIENCE
    "La science nous livre-t-elle le réel tel qu'il est ?",
    "La connaissance scientifique a-t-elle des limites ?",
    "La philosophie est-elle une science ?",
    "La vérité scientifique est-elle provisoire ?",

    // Sujets sur l'ÉTAT
    "L'être humain peut-il se contenter de vivre en paix ?",
    "L'État doit-il reconnaître des limites à sa puissance ?",
    "La politique peut-elle se passer de la morale ?",
    "Toute inégalité est-elle une injustice ?",

    // Sujets sur le LANGAGE
    "Le langage ne sert-il qu'à communiquer ?",
    "Suffit-il de bien parler pour bien penser ?",
    "La parole suffit-elle à faire échec à la violence ?",
    "Discuter, est-ce renoncer à la violence ?",

    // Sujets sur la RAISON
    "Croire, est-ce renoncer à l'usage de la raison ?",
    "La raison doit-elle se défier des sens ?",
    "La raison est-elle seulement affaire de logique ?",
    "Les règles de la logique limitent-elles l'esprit humain ?",

    // Sujets sur le TRAVAIL / TECHNIQUE
    "Sommes-nous condamnés à travailler ?",
    "Le loisir est-il le but véritable du travail ?",
    "Faut-il avoir peur de la technique ?",
    "Tout ce qui est techniquement possible est-il souhaitable ?",

    // Sujets sur la RELIGION
    "Est-il déraisonnable de croire en Dieu ?",
    "La croyance est-elle une illusion rassurante ?",
    "La science peut-elle se substituer à la religion ?",

    // Sujets sur la NATURE / ART
    "L'homme est-il un animal comme un autre ?",
    "Faut-il respecter la nature ?",
    "L'artiste doit-il chercher à plaire ?",
    "L'art détourne-t-il de la réalité ?",
  ],

  commonPitfalls: [
    "Réciter son cours au lieu d'argumenter — la dissertation n'est PAS une récitation.",
    "Confondre « antithèse » avec « contraire » — l'antithèse expose les LIMITES de la thèse.",
    "Faire de la partie III une simple synthèse I+II — elle doit apporter du NOUVEAU.",
    "Ne pas cerner le problème → aucune argumentation valable possible.",
    "Donner ses conclusions dans l'annonce de plan.",
    "Se perdre dans les finitions (accroche/ouverture) au détriment du raisonnement.",
    "Oublier les transitions entre parties.",
    "Négliger la relecture (fautes d'orthographe coûtent des points).",
    "Reformuler le sujet sans définir les termes au préalable.",
    "Citer un auteur hors contexte (sans lien avec le sujet).",
    "Substituer l'annonce de plan à la position du problème.",
    "Argumentation persuasive (émotion) au lieu d'argumentation rationnelle (conviction).",
    "Confondre exemple et argument — l'exemple ILLUSTRE l'argument, il ne le remplace pas.",
    "Faire un plan « pour » / « contre » simpliste au lieu d'un véritable plan dialectique.",
  ],
}
