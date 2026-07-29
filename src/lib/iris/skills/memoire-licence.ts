// ============================================================================
// skills/memoire-licence.ts — Mémoire de Licence (Baccalauréat) avec règles UQAC-DALL
// ----------------------------------------------------------------------------
// Type de document : travail de fin d'études de 1er cycle (licence / baccalauréat).
// Plus court et plus synthétique qu'un mémoire de maîtrise. Démontre la capacité
// à mobiliser les acquis de la formation sur un problème délimité.
//
// UQAC : OUI. Le Guide DALL de l'UQAC s'applique (adapté au niveau licence).
// Preset par défaut : 'licence' (mêmes marges que master, mais volume réduit).
//
// Volume : 30-60 pages, ~8 000-15 000 mots.
// ============================================================================

import type { DocumentTypeSkill } from './types'
import { getUQACPreset, buildUQACContextBlock } from '../uqac-rules'

const UQAC_LICENCE = getUQACPreset('licence')!

export const memoireLicenceSkill: DocumentTypeSkill = {
  id: 'memoire_licence',
  label: 'Mémoire de Licence (Baccalauréat)',
  shortLabel: 'Mémoire (Licence)',
  icon: 'BookOpen',
  pageRange: [30, 60],
  description:
    "Travail de fin d'études de 1er cycle (licence / baccalauréat universitaire). " +
    "Plus court et plus synthétique qu'un mémoire de maîtrise, il démontre la capacité " +
    "à mobiliser les acquis de la formation sur un problème délimité. Volume : 30 à 60 pages " +
    "(~8 000-15 000 mots). Suit les normes UQAC-DALL adaptées au niveau licence : " +
    "même mise en page que le master (Times New Roman 12pt, interligne 1,5, marges 2,5 cm) " +
    "mais structure simplifiée et exigences bibliographiques réduites. " +
    "Ce type de travail prépare à la recherche sans exiger l'originalité d'une maîtrise.",

  expectedStructure: UQAC_LICENCE.expectedStructure.map((s, i) => ({
    order: i,
    title: s.title,
    nature: (() => {
      if (i < 4) return 'front_matter' as const
      if (i >= UQAC_LICENCE.expectedStructure.length - 2) return 'back_matter' as const
      return 'main' as const
    })(),
    required: s.required,
    wordCountHint: s.wordCountHint,
    description: '',
  })),

  specificRules: [
    "Le mémoire de licence suit le Guide DALL de l'UQAC (adapté au 1er cycle).",
    "Format papier Lettre (8½ × 11 po), marges 2,5 cm sur les quatre côtés.",
    "Police Times New Roman 12 pt, interligne 1,5.",
    "Pagination en chiffres arabes, folio centré en bas de page.",
    "Résumé français ≤ 150 mots + résumé anglais ≤ 150 mots.",
    "Mots-clés : ≤ 5 en français ET en anglais.",
    "Bibliographie : minimum 15 références, dont au moins 5 sources académiques récentes (< 10 ans).",
    "Citations : norme APA 7e édition (préférée).",
    "Le jury d'évaluation comprend 2 à 3 membres.",
    "La soutenance (si requise) dure environ 45 minutes.",
  ],

  methodologicalGuidance:
    "Le mémoire de licence est un travail de synthèse et d'application. " +
    "Il doit démontrer la capacité à formuler une question de recherche, à identifier et " +
    "mobiliser les sources pertinentes, à choisir une méthode d'analyse appropriée, et à " +
    "présenter des résultats de manière structurée. L'originalité attendue est moindre qu'au " +
    "master : il s'agit plutôt de montrer la maîtrise des acquis de la formation. Le sujet doit " +
    "être délimité et réaliste. Éviter les ambitions excessives. Privilégier la rigueur de la " +
    "démarche sur l'étendue du propos. La qualité de la langue et de la présentation est un " +
    "critère d'évaluation important à ce niveau.",

  defaultLayout: {
    paperFormat: UQAC_LICENCE.layout.paperFormat,
    fontFamily: UQAC_LICENCE.layout.fontFamily,
    fontSizePt: UQAC_LICENCE.layout.fontSizePt,
    marginTopMm: UQAC_LICENCE.layout.marginTopMm,
    marginBottomMm: UQAC_LICENCE.layout.marginBottomMm,
    marginLeftMm: UQAC_LICENCE.layout.marginLeftMm,
    marginRightMm: UQAC_LICENCE.layout.marginRightMm,
    lineHeight: UQAC_LICENCE.layout.lineHeight,
    firstLineIndentMm: UQAC_LICENCE.layout.firstLineIndentMm,
    paragraphSpacing: UQAC_LICENCE.layout.paragraphSpacingPt,
    justified: UQAC_LICENCE.layout.justified,
  },
  useRomanPaginationForFrontMatter: false,

  appliesUQAC: true,
  uqacPresetId: 'licence',

  writingStyle:
    "Registre académique, à la 3e personne. Phrases claires et bien structurées. " +
    "Vocabulaire précis mais accessible (niveau licence). Connecteurs logiques explicites. " +
    "Chaque paragraphe développe une idée avec un argument et un exemple. " +
    "Les citations sont présentées et explicitées. Le ton est neutre et argumentatif. " +
    "Éviter le jargon excessif et les généralités non étayées. " +
    "La clarté prime sur l'érudition à ce niveau : mieux vaut une démonstration " +
    "limpide sur un sujet modeste qu'une analyse ambitieuse mais confuse.",

  citationStyle:
    "APA 7e édition par défaut. Format des appels : (Auteur, année, p. X). " +
    "Bibliographie en ordre alphabétique avec retrait suspendu. " +
    "Minimum 15 références dont 5 sources académiques récentes. " +
    "Les sources web sont admises mais doivent être complétées par des sources évaluées par les pairs.",

  extraPromptContext: (project) => {
    const lines: string[] = []
    lines.push(buildUQACContextBlock(UQAC_LICENCE))
    lines.push('')
    lines.push('=== CONSIGNES DE RÉDACTION SPÉCIFIQUES AU MÉMOIRE DE LICENCE ===')
    lines.push('- Le sujet doit être délimité et réaliste : un mémoire de licence ne peut pas tout traiter.')
    lines.push('- L\'introduction présente le sujet, la question de recherche, l\'intérêt et annonce le plan.')
    lines.push('- La revue de littérature est une synthèse organisée par thèmes (pas un résumé séquentiel).')
    lines.push('- La méthodologie décrit la démarche : sources, méthode d\'analyse, limites.')
    lines.push('- Les résultats sont présentés de manière structurée, sans interprétation.')
    lines.push('- La discussion interprète les résultats et les confronte à la littérature.')
    lines.push('- La conclusion répond à la question de recherche et souligne les limites.')
    if (project.filiere) {
      lines.push(`- Adaptation disciplinaire : filière ${project.filiere}.`)
    }
    return lines.join('\n')
  },
}
