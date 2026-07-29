// ============================================================================
// document-types.ts — Définition de base d'un type de document académique
// ----------------------------------------------------------------------------
// Chaque type de document (mémoire, thèse, monographie, dissertation,
// article...) partage une structure commune :
//   - une liste de sections attendues (paratexte, corps, annexes)
//   - des règles spécifiques au type
//   - une mise en page par défaut (police, marges, interligne)
//   - une orientation méthodologique générale
//
// Les "skills" (cf. ./skills/) étendent cette interface avec des champs
// supplémentaires (appliesUQAC, uqacPresetId, writingStyle, citationStyle,
// extraPromptContext) pour piloter l'injection de contexte dans les prompts IA.
// ============================================================================

export type DocumentTypeId =
  | 'memoire_licence'
  | 'memoire_master'
  | 'these_doctorat'
  | 'monographie'
  | 'article_scientifique'
  | 'rapport_stage'
  | 'projet_fin_etudes'
  | 'essai_court'
  | 'rapport_recherche'
  | 'dissertation_philosophique' // ← NOUVEAU : dissertation philosophique

export type SectionNature = 'front_matter' | 'main' | 'back_matter'

export interface ExpectedSection {
  order: number
  title: string
  nature: SectionNature
  required: boolean
  wordCountHint?: number
  description: string
}

export interface DefaultLayout {
  paperFormat: 'A4' | 'Letter'
  fontFamily: string
  fontSizePt: number
  marginTopMm: number
  marginBottomMm: number
  marginLeftMm: number
  marginRightMm: number
  lineHeight: number
  firstLineIndentMm: number
  paragraphSpacing: number
  justified: boolean
}

export interface DocumentTypeDef {
  id: DocumentTypeId
  label: string
  shortLabel: string
  icon: string
  pageRange: [number, number]
  description: string
  expectedStructure: ExpectedSection[]
  specificRules: string[]
  methodologicalGuidance: string
  defaultLayout: DefaultLayout
  useRomanPaginationForFrontMatter?: boolean
}

// ----------------------------------------------------------------------------
// Helper : construire le bloc de contexte "type de document" injecté dans les
// prompts IA. Reprend la structure, les règles et la mise en page.
// ----------------------------------------------------------------------------

export function buildDocumentTypeContext(def: DocumentTypeDef): string {
  const structure = def.expectedStructure
    .map(
      (s) =>
        `  ${s.order}. [${s.nature}] ${s.title} ${s.required ? '(OBLIGATOIRE)' : '(facultatif)'}${s.wordCountHint ? ` — ~${s.wordCountHint} mots` : ''}\n     ${s.description}`
    )
    .join('\n')

  const rules = def.specificRules.map((r) => `  - ${r}`).join('\n')

  const layout = def.defaultLayout
  const layoutStr = `  - Format : ${layout.paperFormat}
  - Police : ${layout.fontFamily}, ${layout.fontSizePt}pt
  - Marges : haut ${layout.marginTopMm}mm, bas ${layout.marginBottomMm}mm, gauche ${layout.marginLeftMm}mm, droite ${layout.marginRightMm}mm
  - Interligne : ${layout.lineHeight}
  - Retrait 1ère ligne : ${layout.firstLineIndentMm}mm
  - Espacement paragraphes : ${layout.paragraphSpacing}
  - Alignement : ${layout.justified ? 'justifié' : 'aligné à gauche'}`

  return `=== TYPE DE DOCUMENT : ${def.label} ===
${def.description}

VOLUME ATTENDU : ${def.pageRange[0]}-${def.pageRange[1]} pages

STRUCTURE ATTENDUE (${def.expectedStructure.length} sections) :
${structure}

RÈGLES SPÉCIFIQUES :
${rules}

ORIENTATION MÉTHODOLOGIQUE :
${def.methodologicalGuidance}

MISE EN PAGE PAR DÉFAUT :
${layoutStr}
${def.useRomanPaginationForFrontMatter ? '  - Pagination : chiffres romains pour le paratexte, arabes pour le corps.' : ''}`
}
