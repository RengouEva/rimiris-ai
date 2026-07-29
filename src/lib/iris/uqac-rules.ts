// ============================================================================
// uqac-rules.ts — Presets UQAC-DALL pour mémoires et thèses
// ----------------------------------------------------------------------------
// Le Guide de présentation des travaux de recherche (Guide DALL) de l'UQAC
// (Université du Québec à Chicoutimi) définit les normes de présentation
// des mémoires de maîtrise et des thèses de doctorat.
//
// Sources croisées :
//   1. Guide DALL de l'UQAC (bibliotheque.uqac.ca/guidedall)
//   2. Guide des mémoires et des thèses de l'Université de Montréal (UdeM,
//      avril 2022 / rév. mars 2025) — document de référence téléversé par
//      l'étudiant (upload/CHE_GuideMemoiresTheses.pdf). Les deux guides
//      partagent la même tradition québécoise francophone et présentent
//      des SIMILITUDES fortes sur les points suivants :
//        • Format papier : Lettre (8½ × 11 po / 21,59 × 27,94 cm)
//        • Marges : 2,5 cm (1 po) sur les quatre côtés
//        • Police : Times New Roman 12 pt (ou police à haute lisibilité 11-12 pt)
//        • Interligne : 1,5 (accepté : double)
//        • Pagination : chiffres arabes, folio centré en bas de page
//        • Citations > 3 lignes : en retrait, simple interligne, sans guillemets
//        • Italique : titres d'ouvrages, mots étrangers
//        • Gras : titres de sections (avec discernement)
//        • Souligné : PROSCRIT
//        • Numérotation hiérarchique : max 5 niveaux (ex. 3.1.5)
//        • Tableaux/figures : numérotés en chiffres arabes, légende, près du texte
//        • Responsabilité de la qualité de la langue : l'étudiante/l'étudiant
//      DIFFÉRENCES mineures UQAC vs UdeM :
//        • UQAC : page de titre selon modèle DALL spécifique (mention du dépôt
//          institutionnel dans le portail_deposit)
//        • UQAC : résumé français obligatoire (≤ 250 mots maîtrise / ≤ 500 doctorat)
//        • UQAC : mots-clés (max 10) en français ET en anglais
//        • UQAC : le jury et la soutenance suivent le Règlement des études
//          cycles supérieurs de l'UQAC (RECS)
//
// PRINCIPE FONDATEUR : l'UQAC est attachée aux TYPES "Mémoire" et "Thèse",
// pas à l'université déclarée par l'étudiant. L'étudiant qui choisit
// "Mémoire de Master" obtient automatiquement les règles UQAC-DALL ; l'étudiant
// qui choisit "Dissertation philosophique" ou "Monographie" n'en obtient aucune.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Types
// ----------------------------------------------------------------------------

export type UQACPresetId =
  | 'licence'
  | 'master'
  | 'doctorat'
  // Alias historiques (mappés sur les presets principaux)
  | 'memoire_licence'
  | 'memoire_master'
  | 'these_doctorat'
  | 'licence3'
  | 'master2'
  | 'm2'
  | 'm1'

export interface UQACPreset {
  id: UQACPresetId
  label: string
  level: 'licence' | 'master' | 'doctorat'
  // Mise en page (valeurs en mm pour faciliter le rendu CSS @page)
  layout: {
    paperFormat: 'Letter' | 'A4'
    paperWidthMm: number
    paperHeightMm: number
    marginTopMm: number
    marginBottomMm: number
    marginLeftMm: number
    marginRightMm: number
    fontFamily: string
    fontSizePt: number
    lineHeight: number
    firstLineIndentMm: number
    paragraphSpacingPt: number
    justified: boolean
  }
  // Volume attendu (pages)
  pageRange: [number, number]
  // Résumé : nombre max de mots selon le niveau
  abstractMaxWords: number
  // Mots-clés : nombre max
  keywordsMax: number
  // Règles spécifiques au niveau
  levelRules: string[]
  // Structure attendue (sections)
  expectedStructure: { title: string; required: boolean; wordCountHint?: number }[]
}

// ----------------------------------------------------------------------------
// 2. Presets par niveau académique
// ----------------------------------------------------------------------------

export const UQAC_PRESETS: Record<string, UQACPreset> = {
  // =========================== LICENCE (bac) ===========================
  licence: {
    id: 'licence',
    label: 'Licence / Baccalauréat (UQAC-DALL)',
    level: 'licence',
    layout: {
      paperFormat: 'Letter',
      paperWidthMm: 215.9,
      paperHeightMm: 279.4,
      marginTopMm: 25,
      marginBottomMm: 25,
      marginLeftMm: 25,
      marginRightMm: 25,
      fontFamily: "'Times New Roman', 'Liberation Serif', Georgia, serif",
      fontSizePt: 12,
      lineHeight: 1.5,
      firstLineIndentMm: 12.5,
      paragraphSpacingPt: 6,
      justified: true,
    },
    pageRange: [30, 60],
    abstractMaxWords: 150,
    keywordsMax: 5,
    levelRules: [
      "Niveau licence (baccalauréat universitaire) : travail de fin d'études court, axé sur la synthèse et l'application.",
      "Le résumé ne dépasse pas 150 mots.",
      "5 mots-clés maximum (français + anglais).",
      "Bibliographie : minimum 15 références, dont au moins 5 sources académiques récentes (< 10 ans).",
      "Citations : norme APA 7e édition (préférée) ou Chicago (selon le département).",
      "Le travail démontre la capacité à mobiliser les acquis de la formation sur un problème délimité.",
    ],
    expectedStructure: [
      { title: 'Page de titre', required: true },
      { title: 'Résumé et mots-clés (FR/EN)', required: true, wordCountHint: 150 },
      { title: 'Table des matières', required: true },
      { title: 'Remerciements', required: false },
      { title: 'Introduction générale', required: true, wordCountHint: 1500 },
      { title: 'Revue de littérature', required: true, wordCountHint: 3000 },
      { title: 'Méthodologie', required: true, wordCountHint: 1500 },
      { title: 'Résultats et analyse', required: true, wordCountHint: 3000 },
      { title: 'Discussion', required: true, wordCountHint: 1500 },
      { title: 'Conclusion', required: true, wordCountHint: 1000 },
      { title: 'Bibliographie', required: true },
      { title: 'Annexes', required: false },
    ],
  },

  // =========================== MASTER (maîtrise) ===========================
  master: {
    id: 'master',
    label: 'Maîtrise / Master (UQAC-DALL)',
    level: 'master',
    layout: {
      paperFormat: 'Letter',
      paperWidthMm: 215.9,
      paperHeightMm: 279.4,
      marginTopMm: 25,
      marginBottomMm: 25,
      marginLeftMm: 25,
      marginRightMm: 25,
      fontFamily: "'Times New Roman', 'Liberation Serif', Georgia, serif",
      fontSizePt: 12,
      lineHeight: 1.5,
      firstLineIndentMm: 12.5,
      paragraphSpacingPt: 6,
      justified: true,
    },
    pageRange: [80, 120],
    abstractMaxWords: 250,
    keywordsMax: 8,
    levelRules: [
      "Niveau maîtrise : le mémoire doit démontrer l'aptitude à la recherche et la capacité de procéder à des synthèses critiques.",
      "Le résumé français ne dépasse pas 250 mots (une page).",
      "Le résumé anglais (obligatoire) ne dépasse pas 250 mots.",
      "8 mots-clés maximum en français ET en anglais.",
      "Bibliographie : minimum 30 références, majoritairement académiques et récentes.",
      "Citations : norme APA 7e édition (ou Chicago / Vancouver selon le domaine).",
      "Le mémoire de maîtrise comporte généralement 45 crédits, dont 18 à 30 pour la rédaction.",
      "Évaluation : jury de 3 membres (directeur/trice + évaluateur/trice interne + évaluateur/trice externe).",
      "La soutenance est publique et dure environ 90 minutes.",
    ],
    expectedStructure: [
      { title: 'Page de titre', required: true },
      { title: 'Page d\'identification du jury', required: true },
      { title: 'Résumé et mots-clés (FR)', required: true, wordCountHint: 250 },
      { title: 'Résumé et mots-clés (EN)', required: true, wordCountHint: 250 },
      { title: 'Table des matières', required: true },
      { title: 'Liste des tableaux et figures', required: true },
      { title: 'Liste des sigles et abréviations', required: true },
      { title: 'Remerciements', required: false },
      { title: 'Avant-propos', required: false },
      { title: 'Introduction générale', required: true, wordCountHint: 4000 },
      { title: 'Chapitre 1 — Recension des écrits', required: true, wordCountHint: 8000 },
      { title: 'Chapitre 2 — Cadre théorique', required: true, wordCountHint: 5000 },
      { title: 'Chapitre 3 — Méthodologie', required: true, wordCountHint: 5000 },
      { title: 'Chapitre 4 — Présentation des résultats', required: true, wordCountHint: 6000 },
      { title: 'Chapitre 5 — Discussion', required: true, wordCountHint: 5000 },
      { title: 'Conclusion générale', required: true, wordCountHint: 2500 },
      { title: 'Bibliographie', required: true },
      { title: 'Annexes', required: false },
    ],
  },

  // =========================== DOCTORAT (thèse) ===========================
  doctorat: {
    id: 'doctorat',
    label: 'Doctorat / Thèse (UQAC-DALL)',
    level: 'doctorat',
    layout: {
      paperFormat: 'Letter',
      paperWidthMm: 215.9,
      paperHeightMm: 279.4,
      marginTopMm: 25,
      marginBottomMm: 25,
      marginLeftMm: 25,
      marginRightMm: 25,
      fontFamily: "'Times New Roman', 'Liberation Serif', Georgia, serif",
      fontSizePt: 12,
      lineHeight: 1.5,
      firstLineIndentMm: 12.5,
      paragraphSpacingPt: 6,
      justified: true,
    },
    pageRange: [200, 400],
    abstractMaxWords: 500,
    keywordsMax: 10,
    levelRules: [
      "Niveau doctorat : la thèse doit faire état de travaux de recherche approfondis et originaux qui apportent une contribution importante à l'avancement des connaissances.",
      "Le résumé français ne dépasse pas 500 mots (deux pages).",
      "Le résumé anglais (obligatoire) ne dépasse pas 500 mots.",
      "10 mots-clés maximum en français ET en anglais.",
      "Bibliographie : minimum 80 références, reflétant l'état de l'art international.",
      "Citations : norme APA 7e édition (ou Chicago / Vancouver / MLA selon le domaine).",
      "La thèse de doctorat comporte généralement 90 crédits, dont 60 à 90 pour la rédaction.",
      "Évaluation : jury de 4 à 5 membres incluant un examinateur externe international.",
      "La soutenance est publique, dure environ 2 heures, et inclut une présentation de 20-30 minutes.",
      "Originalité : la thèse doit démontrer l'autonomie réelle de chercheur de la personne candidate.",
      "La contribution à l'avancement des connaissances doit être significative et explicite.",
    ],
    expectedStructure: [
      { title: 'Page de titre', required: true },
      { title: 'Page d\'identification du jury', required: true },
      { title: 'Résumé et mots-clés (FR)', required: true, wordCountHint: 500 },
      { title: 'Résumé et mots-clés (EN)', required: true, wordCountHint: 500 },
      { title: 'Résumé dans une autre langue (si applicable)', required: false },
      { title: 'Résumé de vulgarisation', required: false, wordCountHint: 500 },
      { title: 'Table des matières', required: true },
      { title: 'Liste des tableaux', required: true },
      { title: 'Liste des figures', required: true },
      { title: 'Liste des abréviations et sigles', required: true },
      { title: 'Remerciements', required: false },
      { title: 'Avant-propos', required: false },
      { title: 'Introduction générale', required: true, wordCountHint: 8000 },
      { title: 'Chapitre 1 — Recension des écrits', required: true, wordCountHint: 20000 },
      { title: 'Chapitre 2 — Cadre théorique', required: true, wordCountHint: 12000 },
      { title: 'Chapitre 3 — Problématique et hypothèses', required: true, wordCountHint: 8000 },
      { title: 'Chapitre 4 — Méthodologie', required: true, wordCountHint: 12000 },
      { title: 'Chapitre 5 — Présentation des résultats', required: true, wordCountHint: 15000 },
      { title: 'Chapitre 6 — Discussion', required: true, wordCountHint: 12000 },
      { title: 'Chapitre 7 — Limites et perspectives', required: true, wordCountHint: 5000 },
      { title: 'Conclusion générale', required: true, wordCountHint: 4000 },
      { title: 'Bibliographie', required: true },
      { title: 'Annexes', required: false },
      { title: 'Index (si pertinent)', required: false },
    ],
  },
}

// ----------------------------------------------------------------------------
// 3. Alias historiques — mappent les anciens IDs vers les presets principaux
// ----------------------------------------------------------------------------

export const UQAC_PRESET_ALIASES: Record<string, string> = {
  memoire_licence: 'licence',
  memoire_master: 'master',
  these_doctorat: 'doctorat',
  licence3: 'licence',
  master2: 'master',
  m2: 'master',
  m1: 'master',
}

// ----------------------------------------------------------------------------
// 4. Accès / résolution (avec alias)
// ----------------------------------------------------------------------------

export function getUQACPreset(id: string | undefined): UQACPreset | undefined {
  if (!id) return undefined
  // Résolution directe
  if (UQAC_PRESETS[id]) return UQAC_PRESETS[id]
  // Résolution par alias
  const canonical = UQAC_PRESET_ALIASES[id]
  if (canonical && UQAC_PRESETS[canonical]) return UQAC_PRESETS[canonical]
  return undefined
}

export function getDefaultUQACPreset(level: 'licence' | 'master' | 'doctorat'): UQACPreset {
  return UQAC_PRESETS[level]
}

// ----------------------------------------------------------------------------
// 5. Construction du bloc de contexte UQAC injecté dans les prompts IA
// ----------------------------------------------------------------------------

export function buildUQACContextBlock(preset: UQACPreset): string {
  const l = preset.layout
  const structure = preset.expectedStructure
    .map(
      (s, i) =>
        `  ${i + 1}. ${s.title} ${s.required ? '(OBLIGATOIRE)' : '(facultatif)'}${s.wordCountHint ? ` — ~${s.wordCountHint} mots` : ''}`
    )
    .join('\n')

  const rules = preset.levelRules.map((r) => `  - ${r}`).join('\n')

  return `=== RÈGLES UQAC-DALL (${preset.label}) ===
Le mémoire ou la thèse suit le Guide de présentation des travaux de recherche (DALL) de l'UQAC.

NORMES DE MISE EN PAGE :
  - Format papier : ${l.paperFormat} (${l.paperWidthMm} × ${l.paperHeightMm} mm)
  - Marges : haut ${l.marginTopMm}mm, bas ${l.marginBottomMm}mm, gauche ${l.marginLeftMm}mm, droite ${l.marginRightMm}mm
  - Police : ${l.fontFamily}
  - Taille : ${l.fontSizePt}pt
  - Interligne : ${l.lineHeight}
  - Retrait première ligne : ${l.firstLineIndentMm}mm
  - Espacement entre paragraphes : ${l.paragraphSpacingPt}pt
  - Alignement : ${l.justified ? 'justifié' : 'aligné à gauche'}
  - Pagination : chiffres arabes, folio centré en bas de page
  - Première page de chapitre : pas de folio (mais comptée)

VOLUME ATTENDU : ${preset.pageRange[0]}-${preset.pageRange[1]} pages

RÈGLES SPÉCIFIQUES AU NIVEAU :
${rules}

RÉSUMÉ : ≤ ${preset.abstractMaxWords} mots (FR + EN obligatoires)
MOTS-CLÉS : ≤ ${preset.keywordsMax} (FR + EN)

STRUCTURE ATTENDUE :
${structure}

RÈGLES TYPOGRAPHIQUES (UQAC-DALL, communes avec le Guide UdeM) :
  - Italique : titres d'ouvrages, mots étrangers non francisés (avec discernement)
  - Gras : titres de sections uniquement (avec discernement)
  - Souligné : PROSCRIT (utiliser l'italique ou le gras)
  - Citations < 3 lignes : entre guillemets français « », sans italique
  - Citations > 3 lignes : en retrait, simple interligne, sans guillemets ni italique
  - Numérotation hiérarchique : max 5 niveaux (ex. 3.1.5)
  - Tableaux et figures : numérotés en chiffres arabes, légende, placés près du texte
  - Système international d'unités (SI) pour les données quantitatives
  - Responsabilité de la qualité de la langue : l'étudiante/l'étudiant
  - Les manuscrits ne peuvent plus être modifiés après le dépôt final

NORME DE CITATION PRÉFÉRÉE : APA 7e édition (ou Chicago / Vancouver / MLA selon le domaine).`
}
