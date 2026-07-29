// ============================================================================
// skills/dissertation-litteraire.ts — Dissertation littéraire (prépa A/L)
// ----------------------------------------------------------------------------
// Type de document : exercice phare de la prépa littéraire A/L (khâgne,
// hypokhâgne) et du concours de la BEL (Banque d'Épreuves Littéraires).
// Coefficient 2 au concours de la BEL (vs coefficient 1 pour les autres
// épreuves) — épreuve de 6h aux ENS, 5h à la BCE.
//
// Source : Major-Prépa — « Dissertation littéraire : méthode, plan et
// conseils A/L » (Ariane Thévenet, 11 juin 2026).
// URL : https://major-prepa.com/lettres/methode-dissertation-litteraire-a-l/
//
// UQAC : NON. La dissertation littéraire suit son propre canevas (thèse /
// antithèse / dépassement) issu de la tradition universitaire française.
// Aucun rapport avec le Guide DALL de l'UQAC. C'est un exercice scolaire
// de culture littéraire francophone (France, Belgique, Suisse, Afrique
// francophone) fondé sur un corpus d'œuvres au programme.
// ============================================================================

import type { DocumentTypeSkill } from './types'

export const dissertationLitteraireSkill: DocumentTypeSkill = {
  id: 'dissertation_litteraire',
  label: 'Dissertation littéraire',
  shortLabel: 'Dissertation litt.',
  icon: 'BookOpen',
  pageRange: [7, 12],
  description:
    "Exercice phare de la prépa littéraire A/L (khâgne, hypokhâgne) et du concours de la BEL. " +
    "Coefficient 2 au concours de la BEL (vs coefficient 1 pour les autres épreuves). " +
    "Durée : 6 heures aux ENS, 5 heures à la BCE. " +
    "L'étudiant doit traiter un sujet littéraire (souvent une citation issue d'une œuvre au programme) " +
    "en respectant la structure canonique : introduction (1 à 2 pages), développement en trois parties " +
    "de longueurs strictement égales (thèse / antithèse / dépassement), transitions entre parties, " +
    "conclusion (~1 page). Règle d'or du corpus : 70 % d'exemples issus du programme + 30 % de lectures " +
    "annexes personnelles. Chaque paragraphe = (1) thèse, (2) exemple, (3) citation du corpus + " +
    "citation critique, (4) explicitation du lien avec le sujet. Le sujet n'est JAMAIS un prétexte " +
    "pour réciter son cours : il faut y revenir régulièrement par les mots mêmes de la citation.",

  expectedStructure: [
    // =========================== INTRODUCTION ===========================
    {
      order: 0,
      title: 'Introduction',
      nature: 'main',
      required: true,
      wordCountHint: 500,
      description:
        "L'introduction (1 à 2 pages) suit un ordre canonique STRICT : " +
        "(1) Accroche — valorisée si pertinente, mais pas indispensable ; peut être une considération " +
        "générale sur la littérature, le genre ou la période, en lien direct avec le sujet. " +
        "(2) Présentation de l'ouvrage dont est tirée la citation (auteur, œuvre, date, contexte " +
        "littéraire si pertinent). " +
        "(3) Écriture de la citation EN ENTIER, entre guillemets, sans la modifier. " +
        "(4) Analyse des termes les plus importants de la citation — étape NEUTRE, " +
        "simple explicitation du propos de l'auteur (définition, étymologie, synonymes éventuels). " +
        "Décortiquer le sujet presque mot à mot, en étudiant les structures grammaticales " +
        "significatives et les formules marquantes. " +
        "(5) Conduite du propos vers l'affleurement d'une TENSION — faire émerger la contradiction " +
        "ou le problème que soulève la citation. " +
        "(6) Énonciation de la problématique — strictement limitée à 1 ou 2 questions " +
        "(3 au maximum), au risque de diluer le propos. " +
        "(7) Annonce du plan — indiquer brièvement les trois moments du développement " +
        "(thèse / antithèse / dépassement).",
    },

    // =========================== DÉVELOPPEMENT ===========================
    {
      order: 1,
      title: 'Développement — Partie I : Thèse',
      nature: 'main',
      required: true,
      wordCountHint: 900,
      description:
        "Première partie du développement — LONGUEUR STRICTEMENT ÉGALE aux deux autres parties. " +
        "Étayer et aller dans le sens de l'auteur de la citation proposée. " +
        "Chaque paragraphe doit être consacré à UNE idée dominante et suivre la structure : " +
        "(a) exposé de la thèse (argument principal du paragraphe), " +
        "(b) illustration par un exemple précis tiré du corpus, " +
        "(c) citation — idéalement une citation du corpus + une citation critique d'un spécialiste, " +
        "(d) explicitation du lien entre les citations, la thèse défendue et le sujet. " +
        "Revenir régulièrement aux mots de la citation pour éviter le hors-sujet. " +
        "Mobiliser prioritairement les œuvres du programme (règle 70/30).",
    },
    {
      order: 2,
      title: 'Développement — Partie II : Antithèse',
      nature: 'main',
      required: true,
      wordCountHint: 900,
      description:
        "Deuxième partie du développement — LONGUEUR STRICTEMENT ÉGALE aux deux autres. " +
        "Réfuter le propos de l'auteur, le contrecarrer en soulignant ses limites avec des " +
        "contre-exemples. L'antithèse n'est PAS l'inverse de la thèse : c'est la mise en évidence " +
        "des LIMITES et des INSUFFISANCES de la position défendue en I. " +
        "Même structure par paragraphe que la partie I : (a) thèse, (b) exemple, (c) citation, " +
        "(d) explicitation du lien avec le sujet. " +
        "TRANSITION OBLIGATOIRE à la fin de la partie II (avant III) : saut de ligne + alinéa, " +
        "1 à 3 phrases qui résument la partie précédente et introduisent la suivante.",
    },
    {
      order: 3,
      title: 'Développement — Partie III : Dépassement',
      nature: 'main',
      required: true,
      wordCountHint: 900,
      description:
        "Troisième partie du développement — LONGUEUR STRICTEMENT ÉGALE aux deux autres. " +
        "DÉPASSEMENT du sujet : synthèse qui propose d'autres paradigmes qu'une simple dualité " +
        "'d'accord / pas d'accord'. La partie III doit apporter un regard NOUVEAU — un changement " +
        "de niveau d'analyse, une autre perspective critique, une conciliation qui n'était pas " +
        "visible depuis l'opposition I/II. " +
        "Même structure par paragraphe : (a) thèse, (b) exemple, (c) citation, (d) explicitation. " +
        "TRANSITION OBLIGATOIRE entre II et III (voir partie II).",
    },

    // =========================== CONCLUSION ===========================
    {
      order: 4,
      title: 'Conclusion',
      nature: 'main',
      required: true,
      wordCountHint: 350,
      description:
        "Conclusion d'environ 1 page, en deux temps : " +
        "(1) Résumé succinct et FIDÈLE du développement — reprendre les idées principales énoncées " +
        "dans les trois parties, sans ajouter d'éléments nouveaux (la conclusion n'est PAS le lieu " +
        "de rattraper un oubli). " +
        "(2) Ouverture JUDICIEUSE et APPROPRIÉE — peut être effectuée à l'aide d'une citation " +
        "d'un autre auteur, ou par l'évocation du contexte littéraire de l'extrait proposé. " +
        "Faire le lien avec un courant ou une période. ÉVITER LES GÉNÉRALITÉS. " +
        "Conseil méthodologique : rédiger la conclusion après le brouillon et AVANT l'introduction, " +
        "l'esprit frais — ne pas la rédiger à la hâte dans les dernières minutes.",
    },
  ],

  specificRules: [
    // --- Structure ---
    "L'introduction fait 1 à 2 pages ; le développement comporte 3 PARTIES DE LONGUEURS " +
      "STRICTEMENT ÉGALES ; la conclusion fait environ 1 page.",
    "Une première partie très développée et une troisième expédiée en quelques lignes signale un " +
      "manque de maîtrise de la gestion du temps — prévoir au brouillon une répartition approximative " +
      "du nombre de pages par partie et s'y tenir.",
    "L'introduction ne doit JAMAIS donner les conclusions à l'avance.",
    "La problématique doit strictement se limiter à 1 ou 2 questions (3 au maximum) — au-delà, le " +
      "propos se dilue dans des méandres obscurs.",
    "L'annonce du plan ne se substitue PAS à la position du problème.",

    // --- Argumentation et citations ---
    "Chaque paragraphe du développement suit la structure : (1) exposé de la thèse, (2) exemple " +
      "précis, (3) citation du corpus + citation critique d'un spécialiste, (4) explicitation du " +
      "lien avec le sujet.",
    "Règle des 70/30 : 70 % d'exemples issus du corpus au programme + 30 % de lectures annexes " +
      "personnelles. Ne mobiliser que les œuvres au programme prive la copie d'une culture " +
      "littéraire personnelle ; ne mobiliser que des lectures annexes donne l'impression que le " +
      "programme n'a pas été travaillé.",
    "Employer régulièrement les mots de la citation et y revenir dans chaque partie — c'est le " +
      "meilleur moyen de montrer que l'on traite le sujet et non qu'on le prend pour prétexte.",
    "Les sujets au concours affirment souvent une position unilatérale : il faut soit faire " +
      "affleurer une tension directement (sujet binaire), soit appuyer l'affirmation puis la " +
      "contrecarrer (sujet unilatéral).",

    // --- Transitions ---
    "Transitions OBLIGATOIRES entre chaque partie du développement. Elles sont délimitées " +
      "visuellement par un saut de ligne puis un alinéa.",
    "Une transition = 1 à 3 phrases qui résument en une phrase l'idée générale de la partie " +
      "précédente et conduisent subtilement la réflexion vers la partie suivante.",
    "Une transition absente ou bâclée donne l'impression d'un devoir décousu et signale un défaut " +
      "de maîtrise de la progression de la réflexion.",

    // --- Travail au brouillon ---
    "L'analyse du sujet est CRUCIALE : elle détermine l'orientation du propos. Ne pas la négliger.",
    "Décortiquer le sujet presque mot à mot : étudier les structures grammaticales significatives " +
      "et les formules marquantes qui participent au sens général et à la portée du propos.",
    "L'analyse des termes doit être NEUTRE — explicitation du propos de l'auteur, sans rien " +
      "ajouter de personnel. Ce n'est pas le moment de défendre une thèse.",
    "Se constituer une liste des termes pris indépendamment, avec définition, étymologie et " +
      "synonymes utilisables dans le développement pour éviter les répétitions.",
    "Noter TOUT au brouillon — noms, dates, œuvres, citations — au fil de l'eau, sans attendre. " +
      "Le stress fait fuir les idées ; ne pas se dire 'je le noterai plus tard'.",
    "Faire le lien entre les axes d'analyse et les œuvres au programme : chaque œuvre doit être " +
      "convoquée, soit pour étayer l'argumentaire du sujet, soit pour le contredire.",
    "Rédiger la conclusion après le brouillon et AVANT l'introduction : l'esprit est frais, on " +
      "évite la hâte du dernier paragraphe lu par le correcteur.",

    // --- Présentation ---
    "Ne pas réfléchir à la conclusion dans les dernières minutes de l'épreuve.",
    "Éviter les généralités dans l'ouverture — construire un propos qui fasse le lien avec un " +
      "courant ou une période littéraire.",
    "Si aucune citation d'ouverture n'est véritablement adéquate, évoquer le contexte littéraire " +
      "de l'extrait proposé plutôt que de forcer une citation hors de propos.",
  ],

  methodologicalGuidance:
    "La dissertation littéraire est un exercice SCOLAIRE ET CODÉ, mais qui demande une réelle " +
    "maîtrise : c'est l'épreuve phare de la prépa A/L (coefficient 2 à la BEL, 6h aux ENS, 5h à " +
    "la BCE). " +
    "Le travail au brouillon est déterminant : (1) lecture attentive de la citation, (2) analyse " +
    "neutre des termes (définition, étymologie, synonymes), (3) jeté d'idées au fil de l'eau, " +
    "(4) élaboration d'une problématique qui fait affleurer la tension, (5) plan détaillé, " +
    "(6) rédaction de la conclusion AVANT l'introduction. " +
    "Le développement suit le canevas dialectique thèse / antithèse / dépassement, en trois " +
    "parties DE LONGUEURS STRICTEMENT ÉGALES. Chaque paragraphe = une idée dominante, structurée " +
    "en quatre temps : thèse / exemple / citation (corpus + critique) / explicitation du lien au " +
    "sujet. " +
    "La règle des 70/30 (corpus / lectures annexes) est la bonne équation. Le sujet n'est JAMAIS " +
    "un prétexte pour réciter son cours : il faut y revenir régulièrement par les mots mêmes de " +
    "la citation. " +
    "Les erreurs les plus sanctionnées : (a) traiter la citation comme prétexte, (b) déséquilibrer " +
    "les trois parties, (c) négliger les transitions, (d) oublier la règle 70/30. " +
    "Le correcteur valorise : la maîtrise de la méthode, la pertinence de la réflexion, " +
    "l'originalité des références personnelles, et la rigueur du lien constant au sujet.",

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
    "Registre académique littéraire — l'objectif est de DÉMONTRER par un raisonnement structuré " +
    "tout en cultivant une écriture précise et élégante. " +
    "3e personne ou « nous » de modestie ; la 1re personne est rare et réservée aux prises de " +
    "position argumentées. " +
    "Phrases articulées par des connecteurs logiques (« or », « en effet », « néanmoins », " +
    "« cependant », « ainsi », « par conséquent », « ce faisant », « en revanche », « toutefois », " +
    "« du reste », « par ailleurs »). " +
    "Vocabulaire critique littéraire précis : registre, tonalité, genre, sous-genre, figure de " +
    "style, prosodie, narratologie, énonciation, focalisation, hypotexte, intertextualité, " +
    "esthétique, poétique, mimesis, diégèse, etc. — défini à sa 1ʳᵉ occurrence si nécessaire. " +
    "Privilégier la JUSTESSE de l'analyse littéraire au style pur : le correcteur attend un " +
    "raisonnement argumenté, pas une page de stylistique gratuite. " +
    "Aucune affirmation non illustrée — toute thèse doit s'appuyer sur un exemple précis tiré " +
    "du corpus ou d'une lecture personnelle. " +
    "Reprendre régulièrement les mots de la citation dans le développement pour ancrer le propos " +
    "dans le sujet. " +
    "Éviter les formules péremptoires (« il est évident que », « tout le monde sait que ») et " +
    "les généralités creuses. " +
    "Éviter le jargon hermétique : un terme technique doit être éclairant, pas obscur.",

  citationStyle:
    "Citations littéraires intégrées au texte, entre guillemets français « ». " +
    "Toujours attribuer explicitement la citation (nom de l'auteur, œuvre, date si pertinent). " +
    "Exemple : Comme l'écrit Stendhal dans Le Rouge et le Noir (1830), « un roman est un miroir " +
    "qui se promène sur une grande route ». " +
    "Citation courte : intégrée au texte. Citation longue (> 3 lignes) : en retrait, simple " +
    "interligne, sans guillemets. " +
    "Ne JAMAIS citer un auteur hors contexte — la citation doit avoir un lien DIRECT avec " +
    "l'argument développé. " +
    "Privilégier les citations issues du corpus au programme (règle 70/30) et les accompagner " +
    "d'une citation critique d'un spécialiste quand cela renforce l'argument. " +
    "Auteurs du programme à mobiliser selon les œuvres au programme (typiquement 3 à 5 œuvres " +
    "annuelles en khâgne) : quelques-uns parmi — Rabelais, Montaigne, Corneille, Racine, Molière, " +
    "La Fontaine, Mme de Lafayette, Voltaire, Rousseau, Diderot, Laclos, Chateaubriand, Hugo, " +
    "Balzac, Stendhal, Flaubert, Baudelaire, Zola, Maupassant, Rimbaud, Mallarmé, Proust, Gide, " +
    "Valéry, Sartre, Camus, Beckett, Sarraute, Duras, Perec, Modiano, etc. " +
    "Critiques littéraires mobilisables : Sainte-Beuve, Taine, Lanson, Thibaudet, Barthes, " +
    "Genette, Starobinski, Richard, Compagnon, Riffaterre, Bloom, etc.",

  extraPromptContext: (project) => {
    const extras: string[] = []

    extras.push(
      "EXERCICE = DISSERTATION LITTÉRAIRE (prépa A/L, BEL, ENS). " +
      "La structure est imposée : introduction (1-2 pages, 7 étapes canoniques) / développement " +
      "en 3 parties DE LONGUEURS STRICTEMENT ÉGALES (thèse / antithèse / dépassement) / conclusion " +
      "(~1 page, résumé fidèle + ouverture). " +
      "Chaque paragraphe du développement = (1) thèse, (2) exemple précis, (3) citation du corpus " +
      "+ citation critique, (4) explicitation du lien au sujet. " +
      "Transitions OBLIGATOIRES entre les parties (saut de ligne + alinéa, 1-3 phrases). " +
      "Règle 70/30 : 70 % d'exemples du corpus + 30 % de lectures annexes personnelles. " +
      "Le sujet n'est JAMAIS un prétexte pour réciter son cours : revenir régulièrement aux mots " +
      "de la citation dans chaque partie. " +
      "Ne JAMAIS donner les conclusions dans l'introduction. " +
      "L'antithèse n'est pas le contraire de la thèse — c'est la mise en évidence de ses LIMITES. " +
      "La partie III n'est pas une synthèse thèse+antithèse — c'est un DÉPASSEMENT qui propose " +
      "d'autres paradigmes qu'une simple dualité 'd'accord / pas d'accord'."
    )

    // Détection : prépa littéraire / khâgne
    if (project.level && /khâgne|hypokhâgne|prépa|cpge|classes préparatoires|a\/l/i.test(project.level)) {
      extras.push(
        "CLASSES PRÉPARATOIRES A/L : niveau d'exigence élevé. " +
        "Durée de l'épreuve : 6h aux ENS, 5h à la BCE. Coefficient 2 à la BEL. " +
        "Volume attendu : 7 à 12 pages selon la vitesse de rédaction. " +
        "Le correcteur attend : (a) la maîtrise parfaite de la méthode (introduction en 7 étapes, " +
        "développement en 3 parties équilibrées, conclusion en 2 temps), (b) une culture littéraire " +
        "FINE et PRÉCISE du corpus au programme, (c) des lectures personnelles originales (30 % " +
        "minimum), (d) une argumentation rigoureuse et structurée, (e) un style clair et précis. " +
        "Les œuvres au programme changent chaque année — s'assurer de connaître le corpus en vigueur."
      )
    }

    // Détection : université (L1-L3 lettres modernes / lettres classiques)
    if (project.level && /licence|l1|l2|l3|université|modernes|classiques/i.test(project.level)) {
      extras.push(
        "NIVEAU UNIVERSITAIRE (L1-L3 lettres modernes / classiques) : la dissertation universitaire " +
        "exige une problématisation plus conceptuelle, une connaissance fine du corpus et des " +
        "approches critiques contemporaines. " +
        "Volume attendu : 7 à 10 pages en examen terminal, 10-15 pages en dissertation maison. " +
        "Préciser le cadre critique (auteur, œuvre, période, courant). " +
        "Citations précises avec référence (œuvre, page si possible). " +
        "Mobiliser la critique récente (Genette, Compagnon, Riffaterre, etc.) en plus du corpus " +
        "littéraire principal."
      )
    }

    // Détection : lycée / Terminale L
    if (project.level && /terminale|bac|lycée|tl|t.l/i.test(project.level)) {
      extras.push(
        "NIVEAU TERMINALE L : la dissertation littéraire au bac français dure 4 heures. " +
        "Volume attendu : 5 à 7 pages. " +
        "Le correcteur attend la maîtrise de la méthode (introduction en 7 étapes, plan " +
        "dialectique, conclusion en 2 temps) ET une culture littéraire précise (œuvres au " +
        "programme, citations exactes, repères historiques). " +
        "Le programme officiel du bac L comporte typically 3 œuvres étudiées en objet d'étude."
      )
    }

    // Détection : contexte africain (Cameroun, Côte d'Ivoire, Sénégal, etc.)
    if (project.country && /cameroun|côte.?d?ivoire|ivoirien|sénégal|togo|mali|burkina|niger|bénin|gabon|congo|afrique/i.test(project.country)) {
      extras.push(
        "CONTEXTE AFRIQUE FRANCOPHONE : la dissertation littéraire y est également pratiquée " +
        "(séries A4, D, G au baccalauréat). " +
        "Le corpus est souvent constitué d'œuvres africaines francophones (Senghor, Césaire, " +
        "Sembène Ousmane, Mongo Beti, Ahmadou Kourouma, Cheikh Hamidou Kane, Yambo Ouologuem, " +
        "Sony Labou Tansi, Calixthe Beyala, Alain Mabanckou, Léonora Miano, etc.) aux côtés " +
        "des œuvres du canon français. " +
        "Quand pertinent, croiser les perspectives : littérature africaine / littérature française, " +
        "oralité / écriture, tradition / modernité, indigénat / universel."
      )
    }

    // Si le sujet est une citation, le rappeler explicitement
    if (project.theme && /^["«']/.test(project.theme.trim())) {
      extras.push(
        "SUJET-CITATION DÉTECTÉ : le sujet est une citation littéraire à discuter. " +
        "Méthode spécifique : (1) identifier l'auteur et l'œuvre dont elle est tirée, " +
        "(2) expliciter le sens littéral et le contexte d'énonciation (qui parle ? à qui ? " +
        "dans quel chapitre / acte / strophe ?), " +
        "(3) dégager la thèse implicite de l'auteur, " +
        "(4) la mettre en débat — est-elle vraie pour tout le corpus ? sous quelles conditions ? " +
        "quelles limites ?, " +
        "(5) la dépasser vers une réflexion plus large sur la littérature, le genre ou la période. " +
        "Le plan peut rester dialectique (thèse / antithèse / dépassement), mais la première " +
        "partie doit EXPOSER la pensée de l'auteur avant de la discuter. " +
        "Reprendre régulièrement les mots de la citation dans chaque partie."
      )
    }

    return extras.join('\n')
  },

  // --- Champs spécifiques à la dissertation littéraire ---
  planTypes: [
    {
      id: 'dialectique',
      label: 'Plan dialectique (thèse — antithèse — dépassement)',
      whenToUse:
        "Le plan canonique de la dissertation littéraire en A/L. Convient aux sujets-citations " +
        "qui prêtent au débat et aux sujets interrogatifs. " +
        "La partie I étaye la position de l'auteur ; la partie II en montre les limites ; " +
        "la partie III propose un dépassement (autre paradigme, autre niveau d'analyse).",
      structure: [
        "I. Thèse — étayer et illustrer la position de l'auteur (exemples du corpus)",
        "II. Antithèse — LIMITES de la thèse (contre-exemples, nuances, objections)",
        "III. Dépassement — synthèse qui propose d'autres paradigmes qu'une simple dualité",
      ],
    },
    {
      id: 'thematique',
      label: 'Plan thématique (par aspects / notions du sujet)',
      whenToUse:
        "Pour les sujets qui confrontent deux notions (ex. : « Roman et vérité », " +
        "« Poésie et engagement ») ou qui se prêtent à un traitement par aspects " +
        "(psychologique, moral, esthétique, politique). " +
        "Chaque partie explore un angle différent du sujet sans jamais l'abandonner.",
      structure: [
        "I. Thème 1 — analyse du premier aspect / de la première notion",
        "II. Thème 2 — analyse du second aspect / de la seconde notion",
        "III. Confrontation / dépassement — mise en rapport et dépassement des deux aspects",
      ],
    },
    {
      id: 'analytique',
      label: 'Plan analytique (analyse — conditions — évaluation)',
      whenToUse:
        "Pour les sujets en « en quoi », « comment », « pourquoi ». " +
        "Moins courant en dissertation littéraire qu'en dissertation philosophique, " +
        "mais possible pour les sujets qui portent sur un procédé littéraire précis.",
      structure: [
        "I. Analyse du problème (dégager les enjeux esthétiques, historiques, poétiques)",
        "II. Conditions de possibilité (sous quelles conditions X est-il possible en littérature ?)",
        "III. Évaluation critique (portée, limites, implications pour le corpus)",
      ],
    },
  ],

  // Notions et concepts littéraires à mobiliser selon le sujet
  notionBank: [
    // Concepts esthétiques
    'beau', 'sublime', 'laid', 'esthétique', 'poétique', 'mimesis', 'vérité en littérature',
    'réalisme', 'naturalisme', 'romantisme', 'symbolisme', 'surréalisme', 'modernité littéraire',
    // Genres et sous-genres
    'roman', 'nouvelle', 'conte', 'récit', 'théâtre', 'tragédie', 'comédie', 'drame',
    'poésie', 'sonnet', 'ode', 'élégie', 'essai', 'autobiographie', 'mémoires',
    // Procédés et techniques
    'style', 'figures de style', 'métaphore', 'métonymie', 'ironie', 'intertextualité',
    'hypotexte', 'parodie', 'pastiche', 'focalisation', 'narrateur', 'point de vue',
    'énonciation', 'diégèse', 'intradiégétique', 'extradiégétique',
    // Relations littérature / monde
    'engagement', 'littérature engagée', 'littérature et société', 'littérature et politique',
    'littérature et histoire', 'littérature et morale', 'littérature et vérité',
    'littérature et réel', 'fiction', 'mensonge', 'sincérité', 'authenticité',
    // Auteur et lecteur
    'auteur', 'scripteur', 'narrateur', 'personnage', 'lecteur', 'réception',
    "intention de l'auteur", "mort de l'auteur", 'lecteur modèle',
    // Langage et forme
    'langage', 'forme', 'fond', 'style', 'genre', 'règle', 'convention', 'transgression',
    'oralité', 'écriture', 'réécriture', 'intertextualité',
  ],

  // Auteurs du canon littéraire français et francophone mobilisables
  authorBank: [
    // Moyen Âge et Renaissance
    "Rabelais", "Montaigne", "Du Bellay", "Ronsard",
    // XVIIe siècle (classicisme)
    "Corneille", "Racine", "Molière", "La Fontaine", "Mme de Lafayette", "Pascal", "La Bruyère", "Bossuet",
    // XVIIIe siècle (Lumières)
    "Voltaire", "Rousseau", "Diderot", "Montesquieu", "Beaumarchais", "Laclos", "Sade",
    // XIXe siècle
    "Chateaubriand", "Hugo", "Balzac", "Stendhal", "Flaubert", "Baudelaire", "Zola",
    "Maupassant", "Rimbaud", "Mallarmé", "Verlaine", "Nerval", "Vigny", "Musset", "Sand",
    // XXe siècle
    "Proust", "Gide", "Valéry", "Apollinaire", "Cendrars", "Breton", "Aragon", "Éluard",
    "Céline", "Malraux", "Sartre", "Camus", "Beckett", "Ionesco", "Genet", "Anouilh",
    "Sarraute", "Duras", "Robbe-Grillet", "Perec", "Modiano", "Yourcenar", "Colette",
    // XXIe siècle et contemporains
    "Houellebecq", "Eribon", "Ernaux", "Marianne", "Bon",
    // Littérature francophone (Afrique, Antilles, Maghreb)
    "Senghor", "Césaire", "Glissant", "Fanon", "Sembène Ousmane", "Mongo Beti",
    "Ahmadou Kourouma", "Cheikh Hamidou Kane", "Yambo Ouologuem", "Sony Labou Tansi",
    "Calixthe Beyala", "Alain Mabanckou", "Léonora Miano", "Tierno Monénembo",
    "Kateb Yacine", "Mohammed Dib", "Assia Djebar", "Tahar Ben Jelloun",
    // Critiques littéraires
    "Sainte-Beuve", "Taine", "Lanson", "Thibaudet", "Barthes", "Genette",
    "Starobinski", "Jean-Pierre Richard", "Compagnon", "Riffaterre", "Bloom",
  ],

  // Banque de sujets types (dissertation littéraire)
  subjectBank: [
    // Sujets sur le roman
    "« Le roman est un miroir qui se promène sur une grande route. » Stendhal — discutez.",
    "Le roman doit-il se faire le miroir de la société ?",
    "La fiction romanesque est-elle un mensonge qui dit la vérité ?",
    "Un personnage de roman doit-il être exemplaire pour intéresser le lecteur ?",
    "Le romancier peut-il se passer de descriptions ?",
    "Le roman ne sert-il qu'à distraire ?",
    "Le personnage de roman doit-il ressembler au lecteur pour l'intéresser ?",

    // Sujets sur la poésie
    "La poésie est-elle seulement l'expression des sentiments personnels ?",
    "« La poésie ne sert à rien. » Que pensez-vous de cette affirmation ?",
    "La poésie doit-elle obligatoirement passer par le respect des règles poétiques ?",
    "Le poète est-il un voyant comme l'affirme Rimbaud ?",
    "La poésie peut-elle changer le monde ?",
    "Y a-t-il une fonction politique de la poésie ?",
    "La poésie est-elle incompatible avec la prose ?",

    // Sujets sur le théâtre
    "Le théâtre est-il seulement une représentation de la vie ?",
    "Le théâtre peut-il se passer de la parole ?",
    "La tragédie est-elle encore possible au XXIe siècle ?",
    "Le rire au théâtre exclut-il la réflexion ?",
    "Le metteur en scène doit-il trahir le texte de l'auteur ?",
    "Le théâtre est-il un art de la convention ?",
    "Peut-on rire de tout au théâtre ?",

    // Sujets sur la littérature et la société
    "La littérature engage-t-elle son auteur ?",
    "« L'art pour l'art. » Cette conception de la littérature vous paraît-elle défendable ?",
    "La littérature doit-elle être utile ?",
    "La littérature peut-elle changer la société ?",
    "Un écrivain doit-il prendre position dans son œuvre ?",
    "La littérature engagée est-elle encore d'actualité ?",

    // Sujets sur la forme et le fond
    "« Le style c'est l'homme même. » Buffon — commentez.",
    "La forme prime-t-elle sur le fond en littérature ?",
    "Peut-on séparer le fond de la forme en littérature ?",
    "La contrainte formelle est-elle un obstacle ou un moteur de la création ?",
    "Le respect des règles littéraires est-il un frein à l'écriture ?",
    "La transgression des règles est-elle une condition de la création littéraire ?",

    // Sujets sur l'auteur et le lecteur
    "« La mort de l'auteur. » Barthes — commentez.",
    "Le lecteur participe-t-il à la création de l'œuvre ?",
    "L'intention de l'auteur importe-t-elle pour interpréter l'œuvre ?",
    "Une œuvre littéraire peut-elle exister sans lecteur ?",
    "Faut-il connaître l'auteur pour comprendre son œuvre ?",

    // Sujets sur la vérité en littérature
    "La littérature dit-elle la vérité ?",
    "« La littérature est un mensonge qui dit la vérité. » Sartre — discutez.",
    "La fiction peut-elle dire le réel mieux que le documentaire ?",
    "La sincérité de l'écrivain est-elle une condition de la grande littérature ?",
    "Le « je » littéraire est-il toujours sincère ?",

    // Sujets sur la mémoire et l'écriture
    "L'écriture est-elle un acte de mémoire ?",
    "La littérature peut-elle réparer les traumatismes de l'histoire ?",
    "Écrire, est-ce se souvenir ?",
    "La littérature de témoignage est-elle encore de la littérature ?",

    // Sujets sur la réécriture et l'intertextualité
    "Toute œuvre littéraire est-elle une réécriture ?",
    "La réécriture est-elle un hommage ou un pillage ?",
    "Peut-on écrire sans être influencé par ses prédécesseurs ?",
    "L'intertextualité enrichit-elle l'œuvre ou la parasite ?",
  ],

  commonPitfalls: [
    // Piège n°1 selon Major-Prépa : le plus sanctionné
    "Traiter la citation comme un PRÉTEXTE pour réciter son cours — c'est l'erreur la plus " +
      "sanctionnée. Reprendre régulièrement les mots de la citation dans chaque partie.",

    // Piège n°2
    "Déséquilibrer les trois parties : une première partie très développée et une troisième " +
      "expédiée en quelques lignes signale un défaut de gestion du temps. Les trois parties " +
      "doivent avoir des longueurs STRICTEMENT équivalentes.",

    // Piège n°3
    "Négliger les transitions : une transition absente ou bâclée donne l'impression d'un devoir " +
      "décousu. Elles sont OBLIGATOIRES entre les parties (saut de ligne + alinéa, 1-3 phrases).",

    // Piège n°4
    "Oublier la règle 70/30 : ne mobiliser que les œuvres au programme prive la copie d'une " +
      "dimension de culture littéraire personnelle ; à l'inverse, ne mobiliser que des lectures " +
      "annexes donne l'impression que le programme n'a pas été travaillé.",

    // Autres pièges
    "Donner ses conclusions dans l'introduction ou dans l'annonce de plan.",
    "Substituer l'annonce de plan à la position du problème.",
    "Faire de la partie III une simple synthèse I+II — elle doit apporter du NOUVEAU " +
      "(dépassement, autre paradigme).",
    "Confondre « antithèse » avec « contraire » — l'antithèse expose les LIMITES de la thèse.",
    "Citer un auteur hors contexte, sans lien direct avec le sujet ou l'argument.",
    "Réciter son cours au lieu d'argumenter à partir de la citation.",
    "Empiler les exemples sans les analyser — un exemple ne vaut que par son explicitation.",
    "Surcharger la copie de citations au détriment de l'argumentation personnelle.",
    "Négliger la relecture (fautes d'orthographe et de syntaxe coûtent cher).",
    "Reformuler le sujet sans avoir défini les termes au préalable — l'analyse est NEUTRE.",
    "Forcer une ouverture par une citation hors de propos — mieux vaut évoquer le contexte " +
      "littéraire de l'extrait.",
    "Réfléchir à la conclusion dans les dernières minutes — la rédiger après le brouillon, " +
      "AVANT l'introduction.",
    "Oublier de faire le lien entre les axes d'analyse et les œuvres au programme.",
  ],
}
