// Shared helper — builds the "GUIDE MÉTHODOLOGIQUE" context block that every
// AI prompt should include when the student has uploaded their university's
// methodological guide (Phase 0 — permanent context).

export interface ProjectLike {
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

/**
 * Returns a formatted context block for the methodological guide, or an empty
 * string if no guide has been uploaded.
 *
 * The text is truncated to ~6k chars per prompt to keep token budget manageable
 * (the full text stays in the store for future reference).
 */
export function buildGuideContext(project: ProjectLike | undefined | null): string {
  if (!project?.guideText || !project.guideText.trim()) return ''
  const guideExcerpt = project.guideText.slice(0, 6000)
  const truncated = project.guideText.length > 6000
  return `
GUIDE MÉTHODOLOGIQUE DE L'UNIVERSITÉ (${project.guideFileName || 'fichier sans nom'}) — CONTEXTE PERMANENT, À RESPECTER STRICTEMENT :
${guideExcerpt}${truncated ? '\n[…extrait tronqué…]' : ''}
`.trim()
}

/**
 * Returns the base project context block (university, faculty, level, norm, etc.).
 */
export function buildProjectContext(project: ProjectLike | undefined | null): string {
  if (!project) return ''
  return `
CONTEXTE DU PROJET :
- Titre : ${project.title || 'à définir'}
- Niveau : ${project.level || 'Master'}
- Filière : ${project.filiere || 'non précisée'}
- Université : ${project.university || 'non précisée'} (${project.country || 'pays non précisé'})
- Faculté : ${project.faculty || 'non précisée'}
- Département : ${project.department || 'non précisé'}
- Norme de citation : ${project.norme || 'APA'}
- Terrain : ${project.entreprise || 'non précisé'}
- Directeur : ${project.directeur || 'non précisé'}
`.trim()
}
