// ============================================================================
// skills/types.ts — Interface d'un SKILL de type de document
// ----------------------------------------------------------------------------
// Chaque type de document (mémoire de master, thèse, monographie, dissertation
// philosophique, article...) est implémenté comme un "skill" autonome dans son
// propre fichier.
//
// Un skill contient :
//   1. La définition de base du type de document (DocumentTypeDef) :
//      structure attendue, règles, mise en page.
//   2. Des champs spécifiques au skill :
//      - appliesUQAC : true si les règles UQAC-DALL s'appliquent automatiquement
//        (par exemple pour les mémoires et thèses).
//      - uqacPresetId : quel preset de marges UQAC utiliser par défaut.
//      - writingStyle : ton et registre d'écriture attendus.
//      - citationStyle : norme de citation préférée pour ce type.
//      - extraPromptContext : segments additionnels à injecter dans les prompts.
//
// PRINCIPE FONDATEUR : le contexte est piloté par le TYPE DE DOCUMENT. L'UQAC
// n'est pas détectée par le nom de l'université, elle est attachée aux types
// "Mémoire" et "Thèse" parce que le Guide DALL de l'UQAC est le référentiel
// standard pour ces types au Québec francophone. Les autres types (dissertation
// philosophique, monographie, article…) n'ont PAS de règle UQAC.
// ============================================================================

import type {
  DocumentTypeDef,
  DocumentTypeId,
} from '../document-types'

// Shape minimale du projet passée à `extraPromptContext`. Reprend tous les
// champs utiles pour personnaliser le contexte d'un skill.
export interface SkillProjectContext {
  documentType?: string
  university?: string
  faculty?: string
  department?: string
  filiere?: string
  level?: string
  country?: string
  language?: string
  theme?: string
  entreprise?: string
  directeur?: string
  norme?: string
  title?: string
}

// Types de plans — utilisés par la dissertation philosophique (et
// transposables à d'autres types si nécessaire).
export interface PlanType {
  id: string
  label: string
  whenToUse: string
  structure: string[]
}

export interface DocumentTypeSkill extends DocumentTypeDef {
  // --- Identité du skill ---
  id: DocumentTypeId

  // --- Rattachement UQAC ---
  // true => les règles UQAC-DALL s'appliquent AUTOMATIQUEMENT à ce type
  // (par exemple : tous les mémoires et thèses).
  // false => aucune règle UQAC injectée par défaut.
  appliesUQAC: boolean

  // Si appliesUQAC === true, quel preset de marges utiliser par défaut.
  // (string large — les IDs sont définis dans uqac-rules.ts).
  uqacPresetId?: string

  // --- Style d'écriture ---
  // Notes courtes sur le ton, le registre et les tics de style à éviter,
  // injectées dans les prompts de rédaction et d'humanisation.
  writingStyle: string

  // --- Norme de citation préférée ---
  // Indication de la norme bibliographique la plus adaptée à ce type de
  // document (l'étudiant peut toujours surcharger via project.norme).
  citationStyle: string

  // --- Prompt additionnel spécifique au skill ---
  // Fonction optionnelle qui renvoie un bloc de contexte supplémentaire à
  // injecter dans les prompts (par exemple : consignes méthodologiques
  // spécifiques, contraintes de longueur, etc.).
  extraPromptContext?: (project: SkillProjectContext) => string

  // --- Champs optionnels spécifiques à certains skills ---

  // Dissertation philosophique : types de plans acceptés
  planTypes?: PlanType[]

  // Dissertation philosophique : corpus de notions du programme
  notionBank?: string[]

  // Dissertation philosophique : corpus d'auteurs mobilisables
  authorBank?: string[]

  // Dissertation philosophique : banque de sujets types
  subjectBank?: string[]

  // Dissertation philosophique : pièges courants à éviter
  commonPitfalls?: string[]
}
