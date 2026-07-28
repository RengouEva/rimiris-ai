import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { buildProjectContext } from '@/lib/iris/prompt-context'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Anti-plagiat interne — pré-vérification AVANT l'audit final.
 *
 * Trois volets de détection :
 *   1. Redondance interne entre sections (deux sections qui disent la même chose)
 *   2. Formulations passe-partout / remplissage (boilerplate)
 *   3. Affirmations non sourcées (claims sans appui théorique)
 *
 * Note : ce module ne fait PAS de recherche externe (pas d'API Turnitin).
 * Il signale les risques INTERNES pour que l'étudiant retravaille son texte
 * avant la soumission finale.
 */

interface PlagiarismRequest {
  project: Record<string, any>
  sections: { title: string; content: string }[]
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Jaccard similarity on word-shingles (k=3).
 * Returns 0-1 similarity score between two plain-text strings.
 */
function shingleSimilarity(a: string, b: string, k = 3): number {
  if (!a || !b) return 0
  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean)
  const wordsB = b.toLowerCase().split(/\s+/).filter(Boolean)
  if (wordsA.length < k || wordsB.length < k) return 0

  const shinglesA = new Set<string>()
  for (let i = 0; i <= wordsA.length - k; i++) {
    shinglesA.add(wordsA.slice(i, i + k).join(' '))
  }
  const shinglesB = new Set<string>()
  for (let i = 0; i <= wordsB.length - k; i++) {
    shinglesB.add(wordsB.slice(i, i + k).join(' '))
  }

  let intersection = 0
  for (const s of shinglesA) {
    if (shinglesB.has(s)) intersection++
  }
  const union = shinglesA.size + shinglesB.size - intersection
  return union === 0 ? 0 : intersection / union
}

// Common boilerplate phrases that suggest low-originality writing.
const BOILERPLATE_PATTERNS: RegExp[] = [
  /de nos jours/gi,
  /depuis toujours/gi,
  /il convient de noter que/gi,
  /il est important de souligner que/gi,
  /il faut savoir que/gi,
  /comme tout le monde le sait/gi,
  /il est à noter que/gi,
  /force est de constater que/gi,
  /en ce qui concerne/gi,
  /dans le monde entier/gi,
  /à l'heure actuelle/gi,
  /au fil des années/gi,
  /il va sans dire que/gi,
  /notre société moderne/gi,
  /il est indéniable que/gi,
]

interface Flag {
  id: string
  type: 'internal_redundancy' | 'boilerplate' | 'short_section' | 'unsupported_claim'
  severity: 'high' | 'medium' | 'low'
  message: string
  sectionA: string
  sectionB?: string
  excerpt?: string
  suggestion: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlagiarismRequest
    const { project, sections } = body

    const projectContext = buildProjectContext(project)
    const drafted = sections
      .filter((s) => s.content.trim().length > 50)
      .map((s) => ({
        title: s.title,
        plain: stripHtml(s.content),
      }))

    if (drafted.length === 0) {
      return NextResponse.json({
        report: {
          flags: [],
          globalSimilarity: 0,
          checkedAt: Date.now(),
          sectionsChecked: 0,
        },
      })
    }

    const flags: Flag[] = []

    // ============================================================
    // 1. Internal redundancy — pairwise shingle similarity
    // ============================================================
    let maxSim = 0
    let sumSim = 0
    let pairCount = 0
    for (let i = 0; i < drafted.length; i++) {
      for (let j = i + 1; j < drafted.length; j++) {
        const sim = shingleSimilarity(drafted[i].plain, drafted[j].plain)
        maxSim = Math.max(maxSim, sim)
        sumSim += sim
        pairCount++
        if (sim >= 0.25) {
          // Find the longest shared shingle for the excerpt
          const wordsA = drafted[i].plain.toLowerCase().split(/\s+/)
          const wordsB = drafted[j].plain.toLowerCase().split(/\s+/)
          let longestMatch = ''
          for (let k = 0; k < wordsA.length - 4; k++) {
            for (let len = 8; len <= Math.min(20, wordsA.length - k); len++) {
              const candidate = wordsA.slice(k, k + len).join(' ')
              if (drafted[j].plain.toLowerCase().includes(candidate) && candidate.length > longestMatch.length) {
                longestMatch = candidate
              }
            }
          }
          flags.push({
            id: `flag-red-${i}-${j}`,
            type: 'internal_redundancy',
            severity: sim >= 0.4 ? 'high' : sim >= 0.3 ? 'medium' : 'low',
            message: `Redondance interne détectée (${Math.round(sim * 100)}%) entre "${drafted[i].title}" et "${drafted[j].title}".`,
            sectionA: drafted[i].title,
            sectionB: drafted[j].title,
            excerpt: longestMatch ? `« ${longestMatch} »` : undefined,
            suggestion:
              'Fusionnez les passages redondants ou reformulez l\'un des deux pour qu\'il apporte un angle complémentaire (définition vs analyse, description vs interprétation).',
          })
        }
      }
    }
    const avgSim = pairCount > 0 ? sumSim / pairCount : 0

    // ============================================================
    // 2. Boilerplate phrases — pattern matching
    // ============================================================
    for (const sec of drafted) {
      for (const pattern of BOILERPLATE_PATTERNS) {
        const matches = sec.plain.match(pattern)
        if (matches) {
          // Find a context excerpt around the first match
          const idx = sec.plain.toLowerCase().indexOf(matches[0].toLowerCase())
          const start = Math.max(0, idx - 30)
          const end = Math.min(sec.plain.length, idx + matches[0].length + 30)
          const excerpt = sec.plain.slice(start, end)
          flags.push({
            id: `flag-boiler-${sec.title}-${matches[0]}`.replace(/\s+/g, '-').slice(0, 80),
            type: 'boilerplate',
            severity: 'low',
            message: `Formulation passe-partout détectée : « ${matches[0]} ».`,
            sectionA: sec.title,
            excerpt: `…${excerpt}…`,
            suggestion:
              'Remplacez par une formulation plus précise et ancrée dans votre sujet. Les formules génériques affaiblissent la rigueur académique.',
          })
        }
      }
    }

    // ============================================================
    // 3. Short sections — signal sections that need expansion
    // ============================================================
    for (const sec of drafted) {
      const wordCount = sec.plain.split(/\s+/).filter(Boolean).length
      if (wordCount < 80) {
        flags.push({
          id: `flag-short-${sec.title}`.replace(/\s+/g, '-').slice(0, 80),
          type: 'short_section',
          severity: wordCount < 40 ? 'medium' : 'low',
          message: `Section courte (${wordCount} mots) — probablement sous-développée.`,
          sectionA: sec.title,
          excerpt: sec.plain.slice(0, 120) + (sec.plain.length > 120 ? '…' : ''),
          suggestion:
            "Développez cette section : ajoutez un exemple, une définition de concept, une référence théorique, ou fusionnez-la avec une section voisine si elle n'a pas sa place.",
        })
      }
    }

    // ============================================================
    // 4. Unsupported claims — AI-powered detection (best-effort)
    // ============================================================
    // Only run if there are non-trivial drafted sections (to save tokens)
    if (drafted.length >= 2 && drafted.some((s) => s.plain.length > 500)) {
      try {
        const sectionsForAI = drafted
          .slice(0, 6)
          .map((s) => `### ${s.title}\n${s.plain.slice(0, 1000)}`)
          .join('\n\n---\n\n')

        const aiPrompt = `${projectContext}

MÉMOIRE À ANALYSER (extrait) :
${sectionsForAI}

Détecte les AFFIRMATIONS NON SOURCÉES dans ce mémoire — c'est-à-dire les phrases où l'étudiant affirme quelque chose qui devrait être étayé par une référence théorique, un chiffre, ou une citation, mais qui ne l'est pas.

Exemples typiques :
- "De nombreuses études montrent que…" (sans citer les études)
- "Il est prouvé que…" (sans source)
- "La plupart des entreprises…" (sans donnée)
- "Selon certains auteurs…" (sans nommer les auteurs)

Réponds STRICTEMENT dans ce format JSON :
{
  "claims": [
    {
      "section": "Titre de la section",
      "excerpt": "L'extrait problématique (max 200 caractères)",
      "suggestion": "Ce qu'il faudrait ajouter (auteur, année, source)"
    }
  ]
}

- Maximum 5 claims.
- Ignore les affirmations qui sont manifestement l'opinion de l'étudiant (marquées par "nous pensons", "il nous semble", etc.).
- Réponds en français.`

        const zai = await ZAI.create()
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: aiPrompt },
            { role: 'user', content: 'Analyse.' },
          ],
          thinking: { type: 'disabled' },
          temperature: 0.3,
          max_tokens: 800,
        })
        const raw = completion.choices[0]?.message?.content?.trim() || '{}'
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          for (let i = 0; i < (parsed.claims?.length || 0); i++) {
            const c = parsed.claims[i]
            flags.push({
              id: `flag-claim-${i}`,
              type: 'unsupported_claim',
              severity: 'medium',
              message: `Affirmation non sourcée : « ${(c.excerpt || '').slice(0, 80)}${(c.excerpt || '').length > 80 ? '…' : ''} »`,
              sectionA: c.section || 'Section inconnue',
              excerpt: c.excerpt,
              suggestion: c.suggestion || 'Ajoutez une référence théorique ou un chiffre pour étayer cette affirmation.',
            })
          }
        }
      } catch (err) {
        // AI detection is best-effort — if it fails, return the rule-based flags
        console.error('[API /ai/plagiarism] AI detection failed:', err)
      }
    }

    // ============================================================
    // Compute global internal similarity
    // ============================================================
    // Combine pairwise average + max (weighted) — capped to 100
    const globalSimilarity = Math.min(100, Math.round((avgSim * 0.6 + maxSim * 0.4) * 100))

    // Sort flags by severity (high → medium → low)
    const severityOrder = { high: 0, medium: 1, low: 2 }
    flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      report: {
        flags,
        globalSimilarity,
        checkedAt: Date.now(),
        sectionsChecked: drafted.length,
      },
    })
  } catch (err: any) {
    console.error('[API /ai/plagiarism] Error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
