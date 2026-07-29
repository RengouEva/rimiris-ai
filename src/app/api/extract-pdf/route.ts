import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as crypto from 'node:crypto'
import { requireSession, checkLLMRateLimit } from '@/lib/iris/security'

const execFileAsync = promisify(execFile)

export const runtime = 'nodejs'
export const maxDuration = 60

// ============================================================================
// /api/extract-pdf
// Accepts a multipart/form-data upload of a single PDF file, extracts its text
// content using Python's `pdfplumber` (robust, handles complex PDFs), and
// returns:
//   { text, fileName, numPages, charCount, truncated }
//
// The text is stored in the IrisStore as `project.guideText` and injected in
// every AI prompt as permanent methodological context.
//
// We use Python via subprocess because the npm pdf-parse packages have
// reliability issues in Next.js (worker setup, test-file side-effects, etc.).
// Python's pdfplumber is the gold standard for PDF text extraction.
// ============================================================================

export async function POST(req: NextRequest) {
  // VULN-02 + VULN-17: Auth + Content-Length validation
  const auth = requireSession(req)
  if (!auth.ok) return auth.response
  const llmRL = checkLLMRateLimit(req, auth.session!.accountId)
  if (!llmRL.allowed) {
    return NextResponse.json({ error: llmRL.error }, { status: 429 })
  }

  // VULN-17: Validate Content-Length BEFORE reading the body to prevent
  // memory exhaustion via oversized uploads.
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
  const MAX_UPLOAD_BYTES = 30 * 1024 * 1024 // 30 MB hard cap (25 MB PDF + multipart overhead)
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Upload trop volumineux (${(contentLength / 1024 / 1024).toFixed(1)} MB). Maximum : 30 MB.` },
      { status: 413 },
    )
  }

  let tmpPdfPath: string | null = null
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Aucun fichier reçu. Envoyez un PDF via le champ "file".' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Le fichier doit être au format PDF.' },
        { status: 400 }
      )
    }

    // 25 MB max
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF trop volumineux (max 25 Mo).' },
        { status: 400 }
      )
    }

    // Write to a temp file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const tmpDir = join(tmpdir(), 'iris-pdf-extract')
    await mkdir(tmpDir, { recursive: true })
    // VULN-16: use crypto.randomBytes instead of Math.random() for the
    // temp filename — Math.random() is not cryptographically secure and
    // predictable filenames would let an attacker pre-create symlinks.
    const randId = crypto.randomBytes(8).toString('hex')
    tmpPdfPath = join(tmpDir, `guide-${Date.now()}-${randId}.pdf`)
    await writeFile(tmpPdfPath, buffer)

    // Run a small Python script that uses pdfplumber to extract text + page count
    const pythonScript = `
import sys
import json
import pdfplumber

path = sys.argv[1]
out = {"text": "", "numPages": 0, "error": None}
try:
    with pdfplumber.open(path) as pdf:
        out["numPages"] = len(pdf.pages)
        chunks = []
        for page in pdf.pages:
            t = page.extract_text() or ""
            chunks.append(t)
        out["text"] = "\\n\\n".join(chunks)
except Exception as e:
    out["error"] = str(e)
print(json.dumps(out, ensure_ascii=False))
`

    const { stdout, stderr } = await execFileAsync('python3', ['-c', pythonScript, tmpPdfPath], {
      timeout: 30_000,
      maxBuffer: 20 * 1024 * 1024,
    })

    if (stderr) {
      console.warn('[extract-pdf] Python stderr:', stderr.toString().slice(0, 500))
    }

    let parsed: { text: string; numPages: number; error: string | null }
    try {
      parsed = JSON.parse(stdout.trim().split('\n').pop() || '{}')
    } catch (e: any) {
      throw new Error('Réponse Python illisible: ' + stdout.slice(0, 200))
    }

    if (parsed.error) {
      throw new Error(parsed.error)
    }

    let text: string = (parsed.text || '').trim()
    // Clean up the extracted text
    text = text
      .replace(/\u00AD/g, '') // soft hyphen
      .replace(/-\n(\w)/g, '$1') // hyphenation at EOL → join word
      .replace(/ﬁ/g, 'fi')
      .replace(/ﬂ/g, 'fl')
      .replace(/ﬀ/g, 'ff')
      .replace(/ﬃ/g, 'ffi')
      .replace(/ﬄ/g, 'ffl')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')

    // Truncate to ~30k chars to keep localStorage / prompts manageable
    const MAX_CHARS = 30000
    let truncated = false
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS)
      truncated = true
    }

    return NextResponse.json({
      text,
      fileName: file.name,
      numPages: parsed.numPages || 0,
      charCount: text.length,
      truncated,
    })
  } catch (err: any) {
    console.error('[API /extract-pdf] Error:', err)
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Échec de l'extraction du PDF. Vérifiez que le fichier n'est pas protégé par mot de passe.",
        text: '',
      },
      { status: 500 }
    )
  } finally {
    // Always clean up the temp file
    if (tmpPdfPath) {
      try {
        await unlink(tmpPdfPath)
      } catch {
        // ignore
      }
    }
  }
}
