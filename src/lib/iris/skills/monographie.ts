// ============================================================================
// skills/monographie.ts — Monographie de recherche pédagogique (ENIEG Cameroun)
// ----------------------------------------------------------------------------
// Type de document : monographie de recherche pédagogique appliquée.
// Spécifique au contexte ENIEG (École Normale Supérieure d'Enseignement
// Technique / Institut Supérieur de Technologie) de l'Université de Maroua
// (Cameroun). Ce type de document s'inscrit dans la formation des enseignants
// et formateurs techniques et professionnels.
//
// UQAC : NON. La monographie suit son propre canevas (pédagogique, appliqué,
// contextualisé au terrain éducatif camerounais). Elle n'a aucun rapport avec
// le Guide DALL de l'UQAC.
//
// Source : « Monographie de recherche pédagogique appliquée — ENIEG 2025 »
// (Université de Maroua, document Studocu 150354126).
//
// Volume : 40-80 pages, ~12 000-25 000 mots.
// ============================================================================

import type { DocumentTypeSkill } from './types'

export const monographieSkill: DocumentTypeSkill = {
  id: 'monographie',
  label: 'Monographie de recherche pédagogique',
  shortLabel: 'Monographie',
  icon: 'BookOpen',
  pageRange: [40, 80],
  description:
    "Monographie de recherche pédagogique appliquée, type spécifique à la formation ENIEG " +
    "(École Normale Supérieure d'Enseignement Technique) de l'Université de Maroua (Cameroun). " +
    "Il s'agit d'un travail de recherche contextualisé au terrain éducatif camerounais, qui " +
    "combine : (1) la description monographique d'un établissement ou d'une situation " +
    "pédagogique réelle, (2) l'analyse critique des pratiques, et (3) des propositions " +
    "d'amélioration pédagogique. Volume : 40 à 80 pages (~12 000-25 000 mots). " +
    "La monographie ne suit PAS les règles UQAC-DALL : elle a son propre canevas " +
    "pédagogique et son propre contexte (Afrique francophone, ENIEG, terrain scolaire).",

  expectedStructure: [
    // ====== Pages préliminaires ======
    {
      order: 0,
      title: 'Page de garde',
      nature: 'front_matter',
      required: true,
      description:
        "Page de garde conforme au modèle ENIEG : nom de l'université (Université de Maroua), " +
        "nom de l'établissement (ENIEG), filière, titre de la monographie, nom de l'étudiant(e), " +
        "nom du directeur/trice de mémoire, année académique.",
    },
    {
      order: 1,
      title: 'Dédicace et remerciements',
      nature: 'front_matter',
      required: true,
      wordCountHint: 300,
      description:
        "Dédicace (facultative mais courante) puis remerciements adressés au directeur/trice " +
        "de mémoire, aux autorités académiques de l'ENIEG, au personnel de l'établissement " +
        "d'accueil, et à toute personne ayant contribué à la recherche.",
    },
    {
      order: 2,
      title: 'Résumé et mots-clés',
      nature: 'front_matter',
      required: true,
      wordCountHint: 200,
      description:
        "Résumé de 150-200 mots présentant le contexte, la problématique, la méthodologie, " +
        "les principaux résultats et les recommandations. Mots-clés (5-8) en français.",
    },
    {
      order: 3,
      title: 'Liste des sigles et abréviations',
      nature: 'front_matter',
      required: true,
      description:
        "Liste alphabétique des sigles et abréviations utilisés (ENIEG, MINESEC, MINEDUB, " +
        "CEP, CAP, etc. pour le contexte camerounais).",
    },
    {
      order: 4,
      title: 'Liste des tableaux et figures',
      nature: 'front_matter',
      required: true,
      description:
        "Liste numérotée des tableaux et figures avec renvoi aux pages.",
    },
    {
      order: 5,
      title: 'Sommaire / Table des matières',
      nature: 'front_matter',
      required: true,
      description:
        "Table des matières détaillée avec numérotation hiérarchique (I, II, III pour les " +
        "grandes parties ; A, B, C pour les sous-parties).",
    },

    // ====== Corps de la monographie ======
    {
      order: 6,
      title: 'Introduction générale',
      nature: 'main',
      required: true,
      wordCountHint: 2500,
      description:
        "L'introduction générale comporte 5 étapes : (1) Contexte et justification du choix " +
        "du sujet — situer la recherche dans le contexte éducatif camerounais et l'ENIEG. " +
        "(2) Problématique — formuler la question de recherche à partir des constats du terrain. " +
        "(3) Hypothèses de recherche — propositions de réponses à vérifier. " +
        "(4) Objectifs de la recherche — ce que la monographie vise à atteindre. " +
        "(5) Annonce du plan — présenter l'organisation des parties.",
    },
    {
      order: 7,
      title: 'Partie I — Cadre théorique et conceptuel',
      nature: 'main',
      required: true,
      wordCountHint: 5000,
      description:
        "Cette partie pose les fondements théoriques de la recherche. Elle comprend : " +
        "(A) Revue de littérature sur le thème (auteurs camerounais, africains et internationaux). " +
        "(B) Définition des concepts clés (pédagogie, didactique, évaluation, etc.). " +
        "(C) Cadre institutionnel (le système éducatif camerounais, l'ENIEG, les textes officiels). " +
        "Cette partie mobilise les auteurs de référence en sciences de l'éducation et en pédagogie.",
    },
    {
      order: 8,
      title: 'Partie II — Cadre méthodologique',
      nature: 'main',
      required: true,
      wordCountHint: 3000,
      description:
        "Cette partie décrit la démarche méthodologique : (A) Population et échantillon " +
        "(qui a été étudié : élèves, enseignants,administration). (B) Outils de collecte " +
        "(questionnaire, entretien, observation, grille d'analyse documentaire). " +
        "(C) Déroulement de la collecte (période, lieu, conditions). " +
        "(D) Méthodes d'analyse des données (qualitative, quantitative, mixte).",
    },
    {
      order: 9,
      title: 'Partie III — Présentation de l\'établissement d\'accueil (monographie)',
      nature: 'main',
      required: true,
      wordCountHint: 3000,
      description:
        "Cette partie est le cœur de la MONOGRAPHIE proprement dite : description détaillée " +
        "de l'établissement scolaire étudié. Elle comprend : (A) Historique et création. " +
        "(B) Situation géographique. (C) Organisation administrative (direction, sous-directions). " +
        "(D) Organisation pédagogique (cycles, filières, effectifs). (E) Infrastructures " +
        "(salles, ateliers, laboratoires, bibliothèque). (F) Personnel (enseignants, " +
        "administratifs, d'appui). (G) Particularités et défis de l'établissement.",
    },
    {
      order: 10,
      title: 'Partie IV — Présentation et analyse des résultats',
      nature: 'main',
      required: true,
      wordCountHint: 5000,
      description:
        "Cette partie présente et analyse les données collectées sur le terrain : " +
        "(A) Présentation des résultats par thème (avec tableaux et figures). " +
        "(B) Analyse qualitative et quantitative des données. " +
        "(C) Vérification des hypothèses. (D) Interprétation des résultats. " +
        "Les résultats sont confrontés au cadre théorique de la Partie I.",
    },
    {
      order: 11,
      title: 'Partie V — Discussion et recommandations',
      nature: 'main',
      required: true,
      wordCountHint: 3000,
      description:
        "Cette partie discute les résultats et formule des recommandations : " +
        "(A) Discussion des résultats par rapport à la littérature. " +
        "(B) Limites de la recherche. (C) Recommandations pédagogiques (propositions " +
        "concrètes d'amélioration pour l'établissement et pour le système éducatif). " +
        "(D) Perspectives de recherche.",
    },
    {
      order: 12,
      title: 'Conclusion générale',
      nature: 'main',
      required: true,
      wordCountHint: 1500,
      description:
        "La conclusion générale répond à la question de recherche, synthétise les principaux " +
        "résultats, rappelle la contribution de la monographie, et ouvre sur des perspectives.",
    },

    // ====== Pages annexes ======
    {
      order: 13,
      title: 'Bibliographie',
      nature: 'back_matter',
      required: true,
      description:
        "Bibliographie en norme APA. Inclut les textes officiels camerounais (loils, " +
        "décrets, arrêtés du MINESEC/MINEDUB), les ouvrages de sciences de l'éducation, " +
        "les articles académiques, les mémoires et thèses consultés.",
    },
    {
      order: 14,
      title: 'Annexes',
      nature: 'back_matter',
      required: true,
      description:
        "Les annexes contiennent : les outils de collecte (questionnaire, grille " +
        "d'entretien, grille d'observation), les tableaux statistiques complémentaires, " +
        "les photographies de l'établissement, les documents officiels cités.",
    },
    {
      order: 15,
      title: 'Table des matières',
      nature: 'back_matter',
      required: true,
      description: "Table des matières détaillée finale avec numéros de page.",
    },
  ],

  specificRules: [
    "La monographie suit le canevas ENIEG (Université de Maroua), pas le Guide UQAC-DALL.",
    "Format papier A4 (210 × 297 mm) — norme au Cameroun, contrairement au format Lettre du Québec.",
    "Marges : 2,5 cm sur les quatre côtés.",
    "Police Times New Roman 12 pt, interligne 1,5.",
    "Pagination en chiffres arabes, folio centré en bas de page.",
    "Numérotation des parties en chiffres romains (I, II, III, IV, V) et des sous-parties en lettres (A, B, C).",
    "Citations : norme APA 7e édition.",
    "Bibliographie : minimum 25 références incluant les textes officiels camerounais.",
    "La monographie est contextualisée au terrain éducatif camerounais (MINESEC, MINEDUB, ENIEG).",
    "Les recommandations doivent être concrètes et applicables au contexte de l'établissement.",
    "La partie III (monographie de l'établissement) est obligatoire et fait l'originalité de ce type de document.",
    "Le jury d'évaluation comprend 2 à 3 membres de l'ENIEG.",
    "La soutenance (si requise) dure environ 45-60 minutes.",
  ],

  methodologicalGuidance:
    "La monographie de recherche pédagogique appliquée est un travail hybride : elle combine " +
    "la description monographique (étude de cas d'un établissement réel) et la recherche " +
    "pédagogique (analyse de pratiques, propositions d'amélioration). La spécificité du " +
    "contexte ENIEG/Cameroun est centrale : le système éducatif camerounais (MINESEC pour le " +
    "secondaire, MINEDUB pour le primaire), les filières techniques et professionnelles, " +
    "les réalités du terrain (effectifs, infrastructures, formation des enseignants). " +
    "La recherche est appliquée : elle vise à améliorer concrètement une situation " +
    "pédagogique identifiée. La démarche est empirique (terrain) et critique (analyse des " +
    "pratiques). Les recommandations doivent être réalistes et applicables. " +
    "Éviter le piège de la monographie purement descriptive : l'analyse et les propositions " +
    "d'amélioration sont aussi importantes que la description.",

  defaultLayout: {
    paperFormat: 'A4',
    fontFamily: "'Times New Roman', 'Liberation Serif', Georgia, serif",
    fontSizePt: 12,
    marginTopMm: 25,
    marginBottomMm: 25,
    marginLeftMm: 25,
    marginRightMm: 25,
    lineHeight: 1.5,
    firstLineIndentMm: 12.5,
    paragraphSpacing: 6,
    justified: true,
  },
  useRomanPaginationForFrontMatter: true, // ENIEG utilise les chiffres romains pour le paratexte

  appliesUQAC: false,
  uqacPresetId: undefined,

  writingStyle:
    "Registre académique, à la 3e personne. Phrases claires et bien structurées. " +
    "Vocabulaire pédagogique précis (didactique, pédagogie, évaluation, compétences, " +
    "approche par compétences, socle commun, etc.). Connecteurs logiques explicites. " +
    "Chaque paragraphe développe une idée avec un argument, un exemple tiré du terrain, " +
    "et une phrase de synthèse. Les citations sont présentées et explicitées. " +
    "Le ton est neutre, descriptif (pour la partie monographique) et analytique (pour " +
    "l'analyse des résultats). Éviter les jugements de valeur sur l'établissement : " +
    "privilégier l'observation factuelle et l'analyse argumentée. Les recommandations " +
    "sont formulées de manière constructive et réaliste. Le style est contextualisé : " +
    "il reflète la réalité éducative camerounaise sans tomber dans la caricature.",

  citationStyle:
    "APA 7e édition par défaut. Format des appels : (Auteur, année, p. X). " +
    "Bibliographie en ordre alphabétique avec retrait suspendu. " +
    "Inclure : (1) les textes officiels camerounais (lois, décrets, arrêtés du MINESEC/MINEDUB), " +
    "(2) les ouvrages de sciences de l'éducation (Meirieu, Astolfi, Perrenoud, etc.), " +
    "(3) les articles académiques africains et internationaux, " +
    "(4) les mémoires et thèses consultés (ENIEG, Université de Maroua, ENS Yaoundé).",

  extraPromptContext: (project) => {
    const lines: string[] = []
    lines.push('=== CONTEXTE ENIEG / UNIVERSITÉ DE MAROUA (CAMEROUN) ===')
    lines.push("La monographie s'inscrit dans la formation des enseignants et formateurs de l'ENIEG.")
    lines.push("Le système éducatif camerounais est bipartite :")
    lines.push('  - MINEDUB : Ministère de l\'Éducation de Base (maternelle + primaire)')
    lines.push('  - MINESEC : Ministure de l\'Enseignement Secondaire (collège + lycée)')
    lines.push("L'ENIEG forme les enseignants des disciplines techniques et professionnelles.")
    lines.push('')
    lines.push('=== CONSIGNES DE RÉDACTION SPÉCIFIQUES À LA MONOGRAPHIE ENIEG ===')
    lines.push("- La Partie III (monographie de l'établissement) est OBLIGATOIRE et fait l'originalité de ce type de travail.")
    lines.push("- Décrire l'établissement de manière factuelle et structurée : historique, situation, organisation, effectifs, infrastructures, personnel.")
    lines.push("- L'analyse des résultats est confrontée au cadre théorique (Partie I) et à la réalité du terrain (Partie III).")
    lines.push("- Les recommandations sont CONCRÈTES et applicables : éviter les généralités.")
    lines.push("- Citer les textes officiels camerounais pertinents (lois d'orientation, décrets, arrêtés).")
    lines.push("- Mobiliser les auteurs de référence en sciences de l'éducation ET les travaux africains sur l'éducation.")
    if (project.theme) {
      lines.push(`- Thème de la monographie : ${project.theme}. Le thème doit être contextualisé au terrain camerounais.`)
    }
    if (project.entreprise) {
      lines.push(`- Établissement d'accueil : ${project.entreprise} (objet de la partie III).`)
    }
    if (project.directeur) {
      lines.push(`- Directeur/trice de mémoire : ${project.directeur}.`)
    }
    return lines.join('\n')
  },
}
