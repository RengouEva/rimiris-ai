// Smoke test — vérifie que les skills UQAC et la monographie se chargent et
// produisent un bloc de contexte valide.
import { ALL_SKILLS, getSkill, getDefaultSkill, isUQACDocumentType, buildSkillContext } from '../src/lib/iris/skills'
import { getUQACPreset, buildUQACContextBlock, UQAC_PRESETS } from '../src/lib/iris/uqac-rules'

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('❌ FAIL:', msg)
    process.exit(1)
  }
  console.log('✅', msg)
}

console.log('=== Test 1: Tous les skills sont enregistrés ===')
const ids = ALL_SKILLS.map(s => s.id)
console.log('Skills enregistrés:', ids)
assert(ids.includes('memoire_licence'), 'memoire_licence est enregistré')
assert(ids.includes('memoire_master'), 'memoire_master est enregistré')
assert(ids.includes('these_doctorat'), 'these_doctorat est enregistré')
assert(ids.includes('monographie'), 'monographie est enregistré')
assert(ids.includes('dissertation_philosophique'), 'dissertation_philosophique est enregistré')
assert(ALL_SKILLS.length === 5, `5 skills attendus, trouvé ${ALL_SKILLS.length}`)

console.log('\n=== Test 2: UQAC s\'applique seulement à Mémoire et Thèse ===')
assert(isUQACDocumentType('memoire_licence') === true, 'memoire_licence → UQAC = true')
assert(isUQACDocumentType('memoire_master') === true, 'memoire_master → UQAC = true')
assert(isUQACDocumentType('these_doctorat') === true, 'these_doctorat → UQAC = true')
assert(isUQACDocumentType('monographie') === false, 'monographie → UQAC = false')
assert(isUQACDocumentType('dissertation_philosophique') === false, 'dissertation → UQAC = false')

console.log('\n=== Test 3: Presets UQAC par niveau ===')
const lic = getUQACPreset('licence')
const mas = getUQACPreset('master')
const doc = getUQACPreset('doctorat')
assert(!!lic, 'preset licence existe')
assert(!!mas, 'preset master existe')
assert(!!doc, 'preset doctorat existe')
assert(lic!.pageRange[0] === 30 && lic!.pageRange[1] === 60, `licence 30-60 pages, obtenu ${lic!.pageRange}`)
assert(mas!.pageRange[0] === 80 && mas!.pageRange[1] === 120, `master 80-120 pages, obtenu ${mas!.pageRange}`)
assert(doc!.pageRange[0] === 200 && doc!.pageRange[1] === 400, `doctorat 200-400 pages, obtenu ${doc!.pageRange}`)
assert(lic!.abstractMaxWords === 150, `licence résumé 150 mots, obtenu ${lic!.abstractMaxWords}`)
assert(mas!.abstractMaxWords === 250, `master résumé 250 mots, obtenu ${mas!.abstractMaxWords}`)
assert(doc!.abstractMaxWords === 500, `doctorat résumé 500 mots, obtenu ${doc!.abstractMaxWords}`)

console.log('\n=== Test 4: Alias historiques des presets ===')
assert(getUQACPreset('memoire_licence')?.id === 'licence', 'alias memoire_licence → licence')
assert(getUQACPreset('memoire_master')?.id === 'master', 'alias memoire_master → master')
assert(getUQACPreset('these_doctorat')?.id === 'doctorat', 'alias these_doctorat → doctorat')
assert(getUQACPreset('m2')?.id === 'master', 'alias m2 → master')
assert(getUQACPreset('licence3')?.id === 'licence', 'alias licence3 → licence')

console.log('\n=== Test 5: Mise en page UQAC (marges, police, interligne) ===')
assert(mas!.layout.marginTopMm === 25, `marge haut 25mm, obtenu ${mas!.layout.marginTopMm}`)
assert(mas!.layout.marginBottomMm === 25, `marge bas 25mm, obtenu ${mas!.layout.marginBottomMm}`)
assert(mas!.layout.fontSizePt === 12, `taille police 12pt, obtenu ${mas!.layout.fontSizePt}`)
assert(mas!.layout.lineHeight === 1.5, `interligne 1.5, obtenu ${mas!.layout.lineHeight}`)
assert(mas!.layout.paperFormat === 'Letter', `format Lettre, obtenu ${mas!.layout.paperFormat}`)

console.log('\n=== Test 6: buildSkillContext produit un bloc complet ===')
const ctx = buildSkillContext({
  documentType: 'memoire_master',
  title: 'Test mémoire',
  level: 'master',
  university: 'UQAC',
  filiere: 'Sciences de l\'éducation',
  norme: 'APA',
  country: 'Canada',
})
assert(ctx.includes('Mémoire de Master'), 'contexte contient le label du skill')
assert(ctx.includes('UQAC'), 'contexte contient UQAC')
assert(ctx.includes('Times New Roman'), 'contexte contient la police')
assert(ctx.includes('2,5 cm') || ctx.includes('25mm') || ctx.includes('25 mm'), 'contexte contient les marges')
assert(ctx.includes('APA'), 'contexte contient la norme APA')
assert(ctx.includes('STRUCTURE ATTENDUE'), 'contexte contient la structure')
assert(ctx.includes('interligne') || ctx.includes('Interligne') || ctx.includes('1.5') || ctx.includes('1,5'), 'contexte contient l\'interligne')

console.log('\n=== Test 7: Monographie (ENIEG Cameroun) — pas d\'UQAC ===')
const mono = getSkill('monographie')!
assert(mono.appliesUQAC === false, 'monographie n\'applique pas UQAC')
assert(mono.defaultLayout.paperFormat === 'A4', 'monographie utilise A4 (pas Letter)')
assert(mono.expectedStructure.length >= 15, `monographie a ≥15 sections, obtenu ${mono.expectedStructure.length}`)
// Vérifie la partie III (monographie de l'établissement) — spécifique à l'ENIEG
const partie3 = mono.expectedStructure.find(s => s.title.includes('établissement'))
assert(!!partie3, 'monographie contient la Partie III (établissement d\'accueil)')

const monoCtx = buildSkillContext({
  documentType: 'monographie',
  title: 'Monographie test',
  university: 'Université de Maroua',
  country: 'Cameroun',
})
assert(monoCtx.includes('ENIEG') || monoCtx.includes('Maroua') || monoCtx.includes('Cameroun'), 'contexte monographie contient ENIEG/Maroua/Cameroun')
// La monographie mentionne explicitement qu'elle ne suit PAS UQAC-DALL (dans sa description),
// mais le BLOC DE RÈGLES UQAC (=== RÈGLES UQAC-DALL) ne doit PAS être injecté.
assert(!monoCtx.includes('=== RÈGLES UQAC-DALL'), 'contexte monographie ne contient PAS le bloc de règles UQAC-DALL')

console.log('\n=== Test 8: Dissertation philosophique — pas d\'UQAC ===')
const dis = getSkill('dissertation_philosophique')!
assert(dis.appliesUQAC === false, 'dissertation n\'applique pas UQAC')
assert(dis.pageRange[0] === 4 && dis.pageRange[1] === 8, `dissertation 4-8 pages, obtenu ${dis.pageRange}`)

console.log('\n=== Test 9: getDefaultSkill ===')
const def = getDefaultSkill()
assert(def.id === 'memoire_master', `skill par défaut = memoire_master, obtenu ${def.id}`)

console.log('\n=== Test 10: buildUQACContextBlock contient les règles typographiques ===')
const block = buildUQACContextBlock(mas!)
assert(block.includes('Souligné : PROSCRIT'), 'bloc UQAC contient "Souligné proscrit"')
assert(block.includes('chiffres arabes'), 'bloc UQAC contient "chiffres arabes"')
assert(block.includes('Citations'), 'bloc UQAC contient les règles de citations')

console.log('\n🎉 TOUS LES TESTS SONT PASSÉS — les skills UQAC et la monographie fonctionnent.')
console.log('\nRécapitulatif des skills disponibles:')
ALL_SKILLS.forEach(s => {
  const uqac = s.appliesUQAC ? `[UQAC: ${s.uqacPresetId}]` : '[non-UQAC]'
  console.log(`  - ${s.label} ${uqac} — ${s.pageRange[0]}-${s.pageRange[1]} pages`)
})
