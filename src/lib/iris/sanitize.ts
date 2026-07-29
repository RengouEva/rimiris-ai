/**
 * HTML sanitizer for dangerouslySetInnerHTML (VULN-08).
 *
 * Strips:
 *   - <script> tags entirely
 *   - All on* event handler attributes (onclick, onerror, onmouseover, …)
 *   - javascript: URLs in href/src
 *   - <iframe>, <object>, <embed>, <form>, <input> tags
 *   - data: URLs in href (can be used for phishing / script exfil)
 *
 * Allowed tags: standard academic content (p, h1-h6, ul, ol, li, strong, em,
 * blockquote, code, pre, table, thead, tbody, tr, td, th, a, br, hr, img,
 * div, span, figure, figcaption, mark, sub, sup).
 *
 * Allowed attrs (global): class, style (with restrictions), id.
 * Allowed attrs (a): href (http/https/mailto only), title, target, rel.
 * Allowed attrs (img): src (http/https only), alt, width, height.
 *
 * Implementation note: uses DOMParser when available (browser). On the
 * server we fall back to regex-based stripping (good enough for the
 * AI-generated content rendered client-side).
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'strong', 'em', 'b', 'i', 'u', 's', 'mark', 'small', 'sub', 'sup',
  'blockquote', 'q', 'cite',
  'code', 'pre', 'kbd', 'samp', 'var',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
  'figure', 'figcaption',
  'section', 'article', 'aside', 'header', 'footer', 'nav',
  'details', 'summary',
  'abbr', 'address', 'time',
])

const BLOCKED_TAGS = new Set([
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'textarea', 'select', 'option', 'applet', 'base', 'meta', 'link',
  'style', 'svg', 'math',
])

const ALLOWED_GLOBAL_ATTRS = new Set(['class', 'id', 'title'])
const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
  time: new Set(['datetime']),
}

function isSafeUrl(url: string): boolean {
  const trimmed = (url || '').trim().toLowerCase()
  if (!trimmed) return false
  // Allow http, https, mailto, tel
  if (/^(https?|mailto|tel):/i.test(trimmed)) return true
  // Allow relative URLs (no protocol)
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return true
  // Block everything else (javascript:, data:, file:, vbscript:, etc.)
  return false
}

function sanitizeStyle(style: string): string {
  // Remove anything that smells like script execution or external fetches
  // (expression(), url(javascript:), behavior, etc.)
  return style
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*['"]?\s*javascript:/gi, 'url(')
    .replace(/url\s*\(\s*['"]?\s*data:/gi, 'url(')
    .replace(/behavior\s*:/gi, 'behavior-disabled:')
    .replace(/-moz-binding\s*:/gi, '-moz-binding-disabled:')
}

/**
 * Browser-side sanitizer using DOMParser (safe — does not execute scripts
 * on parse, and we strip them before serialization).
 */
function sanitizeBrowser(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // Walk all elements
  const walk = (node: Element) => {
    const children = Array.from(node.children)
    for (const child of children) {
      const tag = child.tagName.toLowerCase()
      if (BLOCKED_TAGS.has(tag)) {
        child.remove()
        continue
      }
      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: replace with its children
        while (child.firstChild) {
          node.insertBefore(child.firstChild, child)
        }
        child.remove()
        continue
      }
      // Strip disallowed attributes
      const allowedAttrs = new Set([
        ...ALLOWED_GLOBAL_ATTRS,
        ...(ALLOWED_ATTRS_BY_TAG[tag] || []),
      ])
      const attrs = Array.from(child.attributes)
      for (const attr of attrs) {
        const name = attr.name.toLowerCase()
        // Strip all on* event handlers
        if (name.startsWith('on')) {
          child.removeAttribute(attr.name)
          continue
        }
        // Strip javascript: in href/src
        if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
          child.removeAttribute(attr.name)
          continue
        }
        // Sanitize style
        if (name === 'style') {
          child.setAttribute('style', sanitizeStyle(attr.value))
          continue
        }
        if (!allowedAttrs.has(name)) {
          child.removeAttribute(attr.name)
        }
      }
      // Force rel="noopener noreferrer" on target="_blank" links
      if (tag === 'a' && child.getAttribute('target') === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer')
      }
      walk(child)
    }
  }

  walk(doc.body)
  return doc.body.innerHTML
}

/**
 * Server-side / fallback sanitizer (regex-based). Used when DOMParser is
 * unavailable. Not as robust as the DOM walker but catches the main XSS
 * vectors: script tags, on* handlers, javascript: URLs, dangerous tags.
 */
function sanitizeRegex(html: string): string {
  let out = html
  // Remove blocked tags entirely (including content for script/style)
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  out = out.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
  out = out.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
  out = out.replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '')
  out = out.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
  out = out.replace(/<applet\b[^>]*>[\s\S]*?<\/applet>/gi, '')
  // Remove opening/closing tags for blocked elements without content
  out = out.replace(/<\/?(script|iframe|object|embed|form|input|button|textarea|select|option|applet|base|meta|link|svg|math)\b[^>]*>/gi, '')
  // Strip all on* event handler attributes
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // Strip javascript: URLs in href/src
  out = out.replace(/(href|src)\s*=\s*("[^"]*|'[^']*|[^\s>]+)/gi, (match, attr, val) => {
    const cleaned = val.replace(/^["']?/, '').replace(/["']?$/, '')
    if (/^\s*javascript:/i.test(cleaned) || /^\s*data:/i.test(cleaned) || /^\s*vbscript:/i.test(cleaned)) {
      return ''
    }
    return match
  })
  // Strip style attributes that contain expression() or javascript:
  out = out.replace(/style\s*=\s*("[^"]*"|'[^']*')/gi, (match, val) => {
    const cleaned = sanitizeStyle(val)
    return `style=${cleaned}`
  })
  return out
}

/**
 * Sanitize an HTML string for safe insertion via dangerouslySetInnerHTML.
 * Uses DOMParser in the browser; falls back to regex on the server.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      return sanitizeBrowser(html)
    } catch {
      return sanitizeRegex(html)
    }
  }
  return sanitizeRegex(html)
}
