// ============================================================================
// skills/these-doctorat.ts — Thèse de Doctorat avec règles UQAC-DALL
// ----------------------------------------------------------------------------
// Type de document : thèse de doctorat (3e cycle). La thèse est le résultat
// d'une recherche approfondie et originale qui apporte une contribution
// importante et significative à l'avancement des connaissances.
//
// UQAC : OUI. Le Guide DALL de l'UQAC s'applique automatiquement à ce type.
// Preset par défaut : 'doctorat'.
//
// Volume : 200-400 pages, ~60 000-120 000 mots.
// ============================================================================

import type { DocumentTypeSkill } from './types'
import { getUQACPreset, buildUQACContextBlock } from '../uqac-rules'

const UQAC_DOCTORAT = getUQACPreset('doctorat')!

export const theseDoctoratSkill: DocumentTypeSkill = {
  id: 'these_doctorat',
  label: 'Thèse de Doctorat',
  shortLabel: 'Thèse',
  icon: 'GraduationCap',
  pageRange: [200, 400],
  description:
    "Thèse de doctorat (3e cycle). La thèse fait état de travaux de recherche approfondis et " +
    "originaux qui apportent une contribution importante à l'avancement des connaissances dans " +
    "un domaine. Elle doit démontrer l'autonomie réelle de chercheur de la personne candidate. " +
    "Volume : 200 à 400 pages (~60 000-120 000 mots). Suit les normes UQAC-DALL. " +
    "La thèse peut être monographique, par articles (sur autorisation), dossier, ou création " +
    "(recherche-création). L'évaluation est menée par un jury de 4 à 5 membres incluant un " +
    "examinateur externe international. La soutenance est publique et dure environ 2 heures.",

  expectedStructure: UQAC_DOCTORAT.expectedStructure.map((s, i) => ({
    order: i,
    title: s.title,
    nature: (() => {
      if (i < 12) return 'front_matter' as const
      if (i >= UQAC_DOCTORAT.expectedStructure.length - 3) return 'back_matter' as const
      return 'main' as const
    })(),
    required: s.required,
    wordCountHint: s.wordCountHint,
    description: '',
  })),

  specificRules: [
    "La thèse suit le Guide DALL de l'UQAC.",
    "Format papier Lettre (8½ × 11 po), marges 2,5 cm sur les quatre côtés.",
    "Police Times New Roman 12 pt, interligne 1,5.",
    "Pagination en chiffres arabes, folio centré en bas de page.",
    "Résumé français ≤ 500 mots (2 pages) + résumé anglais ≤ 500 mots.",
    "Mots-clés : ≤ 10 en français ET en anglais.",
    "Bibliographie : minimum 80 références, reflétant l'état de l'art international.",
    "Citations : APA 7e édition (ou Chicago / Vancouver / MLA selon le domaine).",
    "La thèse peut prendre quatre formes : monographique, par articles, dossier, ou création.",
    "Le jury de thèse comprend 4 à 5 membres dont un examinateur externe international.",
    "La soutenance est publique, dure ~2 heures, et inclut une présentation de 20-30 minutes par la candidate/le candidat.",
    "Le temps maximal d'évaluation par le jury est de 90 jours francs.",
    "Le rapport de l'examinateur externe est attendu sous 4 à 5 semaines.",
    "La thèse doit démontrer : autonomie réelle de chercheur, contribution significative, qualité du contenu et de la forme.",
    "L'usage de l'intelligence artificielle générative doit être déclaré de manière transparente et éthique.",
  ],

  methodologicalGuidance:
    "La thèse de doctorat est le couronnement d'une formation à la recherche. " +
    "Elle doit démontrer l'autonomie réelle de chercheur : la candidate/le candidat conçoit, " +
    "mène et défend un projet de recherche original de bout en bout. La contribution à " +
    "l'avancement des connaissances doit être significative, explicite et située dans l'état de " +
    "l'art international. La recension des écrits est exhaustive et critique. La méthodologie " +
    "est rigoureusement justifiée. Les résultats sont présentés avec précision. La discussion " +
    "confronte les résultats à la littérature internationale et explicite la contribution " +
    "originale. Les limites sont assumées. Les perspectives ouvrent de nouveaux champs. " +
    "La qualité de la langue et de la présentation matérielle est un critère explicite " +
    "d'évaluation. Le manuscrit déposé ne peut plus être modifié : il faut viser l'excellence " +
    "avant le dépôt final.",

  defaultLayout: {
    paperFormat: UQAC_DOCTORAT.layout.paperFormat,
    fontFamily: UQAC_DOCTORAT.layout.fontFamily,
    fontSizePt: UQAC_DOCTORAT.layout.fontSizePt,
    marginTopMm: UQAC_DOCTORAT.layout.marginTopMm,
    marginBottomMm: UQAC_DOCTORAT.layout.marginBottomMm,
    marginLeftMm: UQAC_DOCTORAT.layout.marginLeftMm,
    marginRightMm: UQAC_DOCTORAT.layout.marginRightMm,
    lineHeight: UQAC_DOCTORAT.layout.lineHeight,
    firstLineIndentMm: UQAC_DOCTORAT.layout.firstLineIndentMm,
    paragraphSpacing: UQAC_DOCTORAT.layout.paragraphSpacingPt,
    justified: UQAC_DOCTORAT.layout.justified,
  },
  useRomanPaginationForFrontMatter: false,

  appliesUQAC: true,
  uqacPresetId: 'doctorat',

  writingStyle:
    "Registre académique soutenu et rigoureux, à la 3e personne. Argumentation rationnelle " +
    "et nuancée. Phrases longues mais bien articulées, avec des connecteurs logiques précis " +
    "(en effet, or, cependant, néanmoins, par conséquent, en outre, par ailleurs...). " +
    "Vocabulaire disciplinaire maîtrisé et précis. Distinction claire entre les faits " +
    "(résultats), leur interprétation (discussion), et la littérature. Chaque affirmation " +
    "est étayée par une référence, un argument, ou une donnée. Les citations sont intégrées " +
    "et explicitées. Le ton est neutre, scientifique, et évite tout jugement de valeur non " +
    "argumenté. L'originalité de la contribution est explicitement mise en évidence. " +
    "Les limites de la recherche sont assumées avec honnêteté intellectuelle. " +
    "Éviter : les généralités, les affirmations non sourcées, les jugements péremptoires, " +
    "les digressions, et l'accumulation de citations non discutées.",

  citationStyle:
    "APA 7e édition par défaut (sciences humaines et sociales). Alternatives : " +
    "Chicago (histoire, lettres), Vancouver (sciences de la santé, biomédical), " +
    "MLA (lettres et langues), IEEE (génie, informatique). " +
    "Format des appels : (Auteur, année, p. X) pour citation textuelle, (Auteur, année) pour paraphrase. " +
    "Bibliographie exhaustive en ordre alphabétique avec retrait suspendu. " +
    "Les sources électroniques incluent systématiquement le DOI. " +
    "Les sources primaires et secondaires sont clairement distinguées.",

  extraPromptContext: (project) => {
    const lines: string[] = []
    lines.push(buildUQACContextBlock(UQAC_DOCTORAT))
    lines.push('')
    lines.push('=== CONSIGNES DE RÉDACTION SPÉCIFIQUES À LA THÈSE DE DOCTORAT ===')
    lines.push('- Chaque chapitre commence sur une nouvelle page et est numéroté (Chapitre 1, 2, ...).')
    lines.push('- La recension des écrits est EXHAUSTIVE et organisée par thèmes, pas par auteur.')
    lines.push('- Le cadre théorique explicite les concepts, les modèles et les hypothèses de la recherche.')
    lines.push('- La problématique formule clairement la question de recherche et les hypothèses.')
    lines.push('- La méthodologie justifie chaque choix méthodologique par rapport à la question de recherche.')
    lines.push('- Les résultats sont présentés de manière neutre et structurée (tableaux, figures, etc.).')
    lines.push('- La discussion confronte les résultats à la littérature ET aux hypothèses.')
    lines.push('- Les limites méthodologiques sont explicitement reconnues.')
    lines.push('- La conclusion situe la contribution originale et ouvre des perspectives de recherche.')
    lines.push('- L\'originalité de la contribution doit être mise en évidence à plusieurs reprises.')
    lines.push('- L\'honnêteté intellectuelle prime : citer toutes les sources, déclarer les conflits, assumer les limites.')
    if (project.filiere) {
      lines.push(`- Adaptation disciplinaire : ${project.filiere}. Respecter les conventions spécifiques.`)
    }
    if (project.directeur) {
      lines.push(`- Direction de recherche : ${project.directeur}. La thèse est un travail autonome conduit sous supervision.`)
    }
    return lines.join('\n')
  },
}
