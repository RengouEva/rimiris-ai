// Smoke test — vérifie que la skill dissertation philosophique s'importe
// correctement et que son contexte se construit sans erreur.
import { dissertationPhilosophiqueSkill } from '../src/lib/iris/skills/dissertation-philosophique'
import { buildSkillContext } from '../src/lib/iris/skills'
import { buildDocumentTypeContext } from '../src/lib/iris/document-types'

console.log('=== SKILL METADATA ===')
console.log('id:', dissertationPhilosophiqueSkill.id)
console.log('label:', dissertationPhilosophiqueSkill.label)
console.log('appliesUQAC:', dissertationPhilosophiqueSkill.appliesUQAC)
console.log('pageRange:', dissertationPhilosophiqueSkill.pageRange)
console.log('expectedStructure length:', dissertationPhilosophiqueSkill.expectedStructure.length)
console.log('specificRules length:', dissertationPhilosophiqueSkill.specificRules.length)
console.log('planTypes length:', dissertationPhilosophiqueSkill.planTypes?.length)
console.log('notionBank length:', dissertationPhilosophiqueSkill.notionBank?.length)
console.log('authorBank length:', dissertationPhilosophiqueSkill.authorBank?.length)
console.log('subjectBank length:', dissertationPhilosophiqueSkill.subjectBank?.length)
console.log('commonPitfalls length:', dissertationPhilosophiqueSkill.commonPitfalls?.length)

console.log('\n=== DOCUMENT TYPE CONTEXT (extrait) ===')
const docCtx = buildDocumentTypeContext(dissertationPhilosophiqueSkill)
console.log(docCtx.substring(0, 1500))
console.log('...[truncated]...')

console.log('\n=== FULL SKILL CONTEXT (extrait) ===')
const fullCtx = buildSkillContext({
  documentType: 'dissertation_philosophique',
  title: 'La liberté est-elle une illusion ?',
  level: 'Terminale',
  country: 'France',
  theme: 'La liberté est-elle une illusion ?',
})
console.log(fullCtx.substring(0, 2000))
console.log('...[truncated]...')
console.log('\nFull context length:', fullCtx.length, 'chars')

console.log('\n✓ SMOKE TEST PASSED')
