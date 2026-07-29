// ============================================================================
// skills/index.ts — Registre des skills par type de document
// ----------------------------------------------------------------------------
// Point d'entrée unique pour accéder aux skills. Chaque type de document a
// son propre fichier de définition (dissertation-philosophique.ts, etc.) et
// ce fichier les regroupe tous.
//
// Fonction clé : buildSkillContext(project) — assemble le bloc de contexte
// complet injecté dans les prompts IA. Ce bloc contient :
//   1. Le contexte de base du projet (titre, niveau, université...).
//   2. Le contexte du type de document (structure, règles, mise en page).
//   3. Le style d'écriture et la norme de citation du skill.
//   4. Les règles UQAC-DALL SI le skill a appliesUQAC === true
//      (par exemple : mémoires et thèses).
//   5. Les segments additionnels du skill (extraPromptContext).
//
// PRINCIPE FONDATEUR : l'UQAC est attachée aux TYPES "Mémoire" et "Thèse",
// pas à l'université. L'étudiant qui choisit "Mémoire de Master" obtient
// automatiquement les règles UQAC-DALL ; l'étudiant qui choisit "Dissertation
// philosophique" ou "Monographie" n'en obtient aucune.
// ============================================================================

import { buildDocumentTypeContext } from '../document-types'
import type { DocumentTypeSkill } from './types'

import { dissertationPhilosophiqueSkill } from './dissertation-philosophique'

// ----------------------------------------------------------------------------
// 1. Registre de tous les skills
// ----------------------------------------------------------------------------

export const ALL_SKILLS: DocumentTypeSkill[] = [
  dissertationPhilosophiqueSkill,
  // (autres skills à ajouter : memoire-licence, memoire-master, these-doctorat,
  //  monographie, article-scientifique, rapport-stage, projet-fin-etudes,
  //  essai-court, rapport-recherche — non disponibles dans cet état du repo)
]

// ----------------------------------------------------------------------------
// 2. Accès / recherche
// ----------------------------------------------------------------------------

export function getSkill(id: string | undefined): DocumentTypeSkill | undefined {
  if (!id) return undefined
  return ALL_SKILLS.find((s) => s.id === id)
}

export function getDefaultSkill(): DocumentTypeSkill {
  // La dissertation philosophique est le skill par défaut dans cet état du repo
  return dissertationPhilosophiqueSkill
}

// ----------------------------------------------------------------------------
// 3. Détection automatique : ce type de document déclenche-t-il l'UQAC ?
// ----------------------------------------------------------------------------

export function isUQACDocumentType(id: string | undefined): boolean {
  const skill = getSkill(id)
  return !!skill?.appliesUQAC
}

// ----------------------------------------------------------------------------
// 4. Construction du bloc de contexte complet pour un projet
// ----------------------------------------------------------------------------

export interface SkillProjectLike {
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
  guideFileName?: string
  guideText?: string
}

export function buildSkillContext(project: SkillProjectLike | undefined | null): string {
  if (!project) return ''

  const skill = getSkill(project.documentType)

  // --- Bloc de base : infos projet ---
  const base = `
CONTEXTE DU PROJET :
- Titre : ${project.title || 'à définir'}
- Type de document : ${skill?.label || project.documentType || 'dissertation philosophique (non précisé)'}
- Niveau : ${project.level || 'Terminale / non précisé'}
- Filière : ${project.filiere || 'non précisée'}
- Université : ${project.university || 'non précisée'} (${project.country || 'pays non précisé'})
- Norme de citation : ${project.norme || (skill?.citationStyle ? 'définie par le skill' : 'APA')}
`.trim()

  // --- Bloc 1 : contexte du type de document (structure, règles, mise en page) ---
  const docTypeBlock = skill ? buildDocumentTypeContext(skill) : ''

  // --- Bloc 2 : style d'écriture et norme de citation du skill ---
  const writingStyleBlock = skill
    ? `
=== STYLE D'ÉCRITURE ATTENDU POUR CE TYPE DE DOCUMENT ===
${skill.writingStyle}

=== NORME DE CITATION PRÉFÉRÉE POUR CE TYPE DE DOCUMENT ===
${skill.citationStyle}
`.trim()
    : ''

  // --- Bloc 3 : blocs spécifiques au skill ---
  // Pour la dissertation philosophique : types de plans, corpus, pièges.
  const specificBlocks: string[] = []
  if (skill?.planTypes && skill.planTypes.length > 0) {
    const plans = skill.planTypes
      .map(
        (p) =>
          `  • ${p.label}\n    Quand : ${p.whenToUse}\n    Structure :\n${p.structure.map((s) => `      - ${s}`).join('\n')}`
      )
      .join('\n\n')
    specificBlocks.push(
      `=== TYPES DE PLANS ACCEPTÉS ===\n${plans}`
    )
  }
  if (skill?.notionBank && skill.notionBank.length > 0) {
    specificBlocks.push(
      `=== NOTIONS DU PROGRAMME À MOBILISER ===\n${skill.notionBank.join(', ')}`
    )
  }
  if (skill?.authorBank && skill.authorBank.length > 0) {
    specificBlocks.push(
      `=== AUTEURS À CONVOQUER (selon pertinence) ===\n${skill.authorBank.join(', ')}`
    )
  }
  if (skill?.commonPitfalls && skill.commonPitfalls.length > 0) {
    const pitfalls = skill.commonPitfalls.map((p) => `  ⚠ ${p}`).join('\n')
    specificBlocks.push(
      `=== PIÈGES COURANTS À ÉVITER ===\n${pitfalls}`
    )
  }
  if (skill?.subjectBank && skill.subjectBank.length > 0) {
    const subjects = skill.subjectBank.slice(0, 20).map((s) => `  - ${s}`).join('\n')
    specificBlocks.push(
      `=== EXEMPLES DE SUJETS (banque) ===\n${subjects}\n  [... ${skill.subjectBank.length - 20 > 0 ? skill.subjectBank.length - 20 : 0} autres sujets disponibles ...]`
    )
  }
  const specificBlock = specificBlocks.join('\n\n')

  // --- Bloc 4 : contexte additionnel spécifique au skill ---
  const extraBlock = skill?.extraPromptContext
    ? `
=== CONSIGNES SPÉCIFIQUES AU TYPE DE DOCUMENT ===
${skill.extraPromptContext({
  documentType: project.documentType,
  level: project.level,
  filiere: project.filiere,
  university: project.university,
  country: project.country,
  norme: project.norme,
  theme: project.theme,
  entreprise: project.entreprise,
  faculty: project.faculty,
  department: project.department,
  language: project.language,
  directeur: project.directeur,
  title: project.title,
})}
`.trim()
    : ''

  // --- Assemblage final ---
  const parts = [base]
  if (docTypeBlock) parts.push(docTypeBlock)
  if (writingStyleBlock) parts.push(writingStyleBlock)
  if (specificBlock) parts.push(specificBlock)
  if (extraBlock) parts.push(extraBlock)
  return parts.join('\n\n')
}

// ----------------------------------------------------------------------------
// 5. Réexport des skills individuels (pour accès direct si nécessaire)
// ----------------------------------------------------------------------------

export {
  dissertationPhilosophiqueSkill,
}

export type { DocumentTypeSkill, PlanType } from './types'
