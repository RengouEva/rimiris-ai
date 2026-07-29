// ============================================================================
// skills/memoire-master.ts — Mémoire de Master (Maîtrise) avec règles UQAC-DALL
// ----------------------------------------------------------------------------
// Type de document : mémoire de recherche de 2e cycle (maîtrise / master).
// Le mémoire de maîtrise est la réalisation d'un projet de recherche structuré
// et rigoureux démontrant l'aptitude à la recherche et la capacité de procéder
// à des synthèses critiques.
//
// UQAC : OUI. Le Guide DALL de l'UQAC s'applique automatiquement à ce type.
// Preset par défaut : 'master' (marges 25mm, Times New Roman 12pt, interligne 1.5).
//
// Volume : 80-120 pages, ~25 000-40 000 mots.
// ============================================================================

import type { DocumentTypeSkill } from './types'
import { getUQACPreset, buildUQACContextBlock } from '../uqac-rules'

const UQAC_MASTER = getUQACPreset('master')!

export const memoireMasterSkill: DocumentTypeSkill = {
  id: 'memoire_master',
  label: 'Mémoire de Master (Maîtrise)',
  shortLabel: 'Mémoire',
  icon: 'BookOpen',
  pageRange: [80, 120],
  description:
    "Mémoire de recherche de 2e cycle (maîtrise / master recherche). Le mémoire démontre " +
    "l'aptitude de la personne candidate à la recherche : capacité de procéder à des synthèses " +
    "critiques, qualité de la rédaction et de la présentation. Il s'agit d'un travail structuré " +
    "de 80 à 120 pages (~25 000-40 000 mots) qui suit les normes UQAC-DALL automatiquement. " +
    "La structure classique comprend : introduction, recension des écrits, cadre théorique, " +
    "méthodologie, résultats, discussion, conclusion. Le mémoire peut être monographique, " +
    "par articles, ou dossier (sur autorisation).",

  // --- Structure attendue (reprend le preset UQAC master) ---
  expectedStructure: UQAC_MASTER.expectedStructure.map((s, i) => ({
    order: i,
    title: s.title,
    nature: (() => {
      if (i < 9) return 'front_matter' as const
      if (i >= UQAC_MASTER.expectedStructure.length - 2) return 'back_matter' as const
      return 'main' as const
    })(),
    required: s.required,
    wordCountHint: s.wordCountHint,
    description: '',
  })),

  // --- Règles spécifiques ---
  specificRules: [
    "Le mémoire suit le Guide DALL de l'UQAC (mise en page, structure, dépôt).",
    "Format papier Lettre (8½ × 11 po), marges 2,5 cm sur les quatre côtés.",
    "Police Times New Roman 12 pt, interligne 1,5.",
    "Pagination en chiffres arabes, folio centré en bas de page.",
    "Résumé français ≤ 250 mots + résumé anglais ≤ 250 mots (obligatoires).",
    "Mots-clés : ≤ 8 en français ET en anglais.",
    "Citations : norme APA 7e édition (ou Chicago / Vancouver selon le domaine).",
    "Le mémoire peut prendre trois formes : monographique (classique), par articles (sur autorisation), ou dossier (sur autorisation).",
    "Le jury de mémoire comprend 3 membres : direction de recherche + 2 évaluateur/trices.",
    "La soutenance est publique et dure environ 90 minutes.",
    "Le temps maximal d'évaluation par le jury est de 30 jours francs.",
    "Le dépôt final se fait sur Papyrus (dépôt institutionnel).",
  ],

  // --- Orientation méthodologique ---
  methodologicalGuidance:
    "Le mémoire de maîtrise est un premier travail de recherche substantiel. " +
    "Il doit démontrer la maîtrise de la démarche scientifique : formulation d'une problématique, " +
    "recension critique des écrits, choix méthodologique rigoureux, analyse des données, " +
    "discussion nuancée et conclusion ouverte. L'originalité attendue n'est pas une contribution " +
    "majeure au savoir (réservée au doctorat) mais une capacité démontrée à mener un projet de " +
    "recherche de bout en bout. La qualité de la langue et de la présentation matérielle est " +
    "explicitement un critère d'évaluation. Éviter le piège de l'opus magnum : un mémoire trop " +
    "volumineux pénalise l'étudiante/l'étudiant. Viser la clarté, la concision et la rigueur.",

  // --- Mise en page par défaut (reprend le preset UQAC master) ---
  defaultLayout: {
    paperFormat: UQAC_MASTER.layout.paperFormat,
    fontFamily: UQAC_MASTER.layout.fontFamily,
    fontSizePt: UQAC_MASTER.layout.fontSizePt,
    marginTopMm: UQAC_MASTER.layout.marginTopMm,
    marginBottomMm: UQAC_MASTER.layout.marginBottomMm,
    marginLeftMm: UQAC_MASTER.layout.marginLeftMm,
    marginRightMm: UQAC_MASTER.layout.marginRightMm,
    lineHeight: UQAC_MASTER.layout.lineHeight,
    firstLineIndentMm: UQAC_MASTER.layout.firstLineIndentMm,
    paragraphSpacing: UQAC_MASTER.layout.paragraphSpacingPt,
    justified: UQAC_MASTER.layout.justified,
  },
  useRomanPaginationForFrontMatter: false, // UQAC proscrit les chiffres romains

  // --- UQAC ---
  appliesUQAC: true,
  uqacPresetId: 'master',

  // --- Style d'écriture ---
  writingStyle:
    "Registre académique soutenu, à la 3e personne (sauf quand l'auteur/autrice se désigne " +
    "explicitement, par exemple dans l'avant-propos ou les remerciements). Phrases structurées, " +
    "logiques, avec des connecteurs explicites (en effet, or, cependant, par conséquent, en outre...). " +
    "Vocabulaire précis et disciplinaire. Éviter les tournures familières, les contractions, " +
    "les anglicismes. Privilégier la voix active quand elle clarifie le sujet. Chaque paragraphe " +
    "développe UNE idée avec un argument, un exemple, une phrase de synthèse. Les citations sont " +
    "introduites par une phrase de présentation et suivies d'une phrase d'explicitation. " +
    "Le ton reste neutre et argumentatif : convaincre par la raison, pas persuader par l'émotion. " +
    "Éviter les jugements de valeur non argumentés et les généralités hâtives.",

  // --- Norme de citation ---
  citationStyle:
    "APA 7e édition par défaut (sciences humaines et sociales, éducation, psychologie). " +
    "Alternatives selon le domaine : Chicago (histoire, lettres), Vancouver (sciences de la santé), " +
    "MLA (lettres et langues). Format des appels de citation : (Auteur, année, p. X) pour une citation " +
    "textuelle, (Auteur, année) pour une paraphrase. Bibliographie en ordre alphabétique, " +
    "avec retrait suspendu. Les sources électroniques incluent le DOI ou l'URL et la date de consultation.",

  // --- Contexte additionnel injecté dans les prompts ---
  extraPromptContext: (project) => {
    const lines: string[] = []
    lines.push(buildUQACContextBlock(UQAC_MASTER))
    lines.push('')
    lines.push('=== CONSIGNES DE RÉDACTION SPÉCIFIQUES AU MÉMOIRE DE MAÎTRISE ===')
    lines.push('- Chaque chapitre commence sur une nouvelle page.')
    lines.push('- Les titres de chapitres sont numérotés (Chapitre 1, Chapitre 2...) et centrés.')
    lines.push('- Les sous-titres suivent la numérotation hiérarchique (1.1, 1.1.1) avec au plus 5 niveaux.')
    lines.push('- La recension des écrits n\'est pas un résumé séquentiel des sources mais une synthèse critique organisée par thèmes.')
    lines.push('- La méthodologie justifie les CHOIX méthodologiques (pourquoi cette méthode et pas une autre).')
    lines.push('- Les résultats sont présentés de manière neutre, sans interprétation ( réservée à la discussion).')
    lines.push('- La discussion confronte les résultats à la littérature et aux hypothèses.')
    lines.push('- La conclusion répond à la question de recherche, souligne les limites et ouvre des perspectives.')
    if (project.filiere) {
      lines.push(`- Adaptation disciplinaire : filière ${project.filiere}. Respecter les conventions spécifiques au domaine.`)
    }
    if (project.directeur) {
      lines.push(`- Direction de recherche : ${project.directeur}. Le mémoire reflète un travail conduit en étroite collaboration avec la direction.`)
    }
    return lines.join('\n')
  },
}
