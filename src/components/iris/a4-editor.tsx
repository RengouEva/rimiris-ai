'use client'

import * as React from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Pilcrow,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  CaseUpper,
  CaseLower,
  Type as TypeIcon,
  Droplet,
  MousePointerClick,
  Highlighter,
  Subscript,
  Superscript,
  Palette,
  Table2,
  TableProperties,
  Sheet,
  Link2,
  Image as ImageIcon,
  Sigma,
  Minus,
  Calendar,
  Search,
  Replace,
  SeparatorHorizontal,
  AlignVerticalJustifyCenter,
  Grid3x3,
  ChevronRight,
  ChevronLeft,
  PaintBucket,
  Brackets,
  Hash,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================================================
// A4Editor — WYSIWYG editor that mimics an A4 page
// - 210mm × 297mm aspect ratio
// - Standard academic margins (25mm top/sides, 30mm bottom — clearly visualized)
// - Justified serif body text, sans-serif headings
// - Two-row rich toolbar (NO scroll, all tools visible):
//     Row 1: undo/redo | font family | font size | bold/italic/underline/strike |
//            subscript/superscript | case (upper/lower/title) | highlight
//     Row 2: paragraph/H1/H2/H3 | lists/quote | alignment | watermark | select all/clear | erase
// - Per-button active state indicators (voyant lumineux) tracked via
//   document.queryCommandState + selectionchange event.
// - Optional watermark (filigrane) rendered behind the page content.
// - Persists HTML to the store.
// ============================================================================

export interface A4EditorHandle {
  insertHtml: (html: string) => void
  replaceHtml: (html: string) => void
  focus: () => void
  /** Returns the current number of A4 pages based on actual content height */
  getPageCount: () => number
}

interface A4EditorProps {
  value: string // HTML
  onChange: (html: string) => void
  editable?: boolean
  showToolbar?: boolean
  /** Optional callback invoked whenever the page count changes (1, 2, 3, …). */
  onPageCountChange?: (count: number) => void
}

// 297mm in CSS pixels at 96dpi: 297 * 96 / 25.4 ≈ 1122.52px
const A4_PAGE_HEIGHT_PX = 1122.52

// Font families offered in the toolbar.
const FONT_FAMILIES: { label: string; value: string; css: string }[] = [
  { label: 'Times New Roman', value: 'times', css: "'Times New Roman', 'Liberation Serif', Georgia, serif" },
  { label: 'Arial', value: 'arial', css: "Arial, 'Helvetica Neue', sans-serif" },
  { label: 'Calibri', value: 'calibri', css: "Calibri, 'Segoe UI', sans-serif" },
  { label: 'Courier New', value: 'courier', css: "'Courier New', 'Liberation Mono', monospace" },
  { label: 'Georgia', value: 'georgia', css: "Georgia, 'Times New Roman', serif" },
  { label: 'Garamond', value: 'garamond', css: "Garamond, 'Times New Roman', serif" },
  { label: 'Verdana', value: 'verdana', css: "Verdana, Geneva, sans-serif" },
  { label: 'Inter', value: 'inter', css: "'Inter', 'Helvetica Neue', Arial, sans-serif" },
]

// Font sizes (in pt).
const FONT_SIZES: { label: string; value: string }[] = [
  { label: '8', value: '2' },   // 8pt ≈ size 2 in old execCommand fontSize
  { label: '10', value: '1' },  // 10pt
  { label: '12', value: '3' },  // 12pt
  { label: '14', value: '4' },  // 14pt
  { label: '16', value: '5' },  // 18pt
  { label: '18', value: '6' },  // 24pt
  { label: '24', value: '7' },  // 36pt
]

// Line spacing options.
const LINE_SPACINGS: { label: string; value: string }[] = [
  { label: 'Simple',   value: '1.0' },
  { label: '1,15',     value: '1.15' },
  { label: '1,5',      value: '1.5' },
  { label: 'Double',   value: '2.0' },
  { label: 'Serré',    value: '0.9' },
  { label: 'Très large', value: '2.5' },
]

// Special characters offered in the Insert → Special character popover.
const SPECIAL_CHARS: string[] = [
  'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç',
  'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï',
  'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Œ', 'Ø',
  'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Ÿ', 'ß', 'Þ',
  'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç',
  'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï',
  'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', 'œ', 'ø',
  'ù', 'ú', 'û', 'ü', 'ý', 'ÿ', 'þ', 'ð',
  '«', '»', '“', '”', '‘', '’', '„', '‟',
  '—', '–', '·', '•', '…', '‰', '°', '′',
  '″', '‹', '›', '〈', '〉', '⟨', '⟩', '«',
  '←', '↑', '→', '↓', '↔', '⇐', '⇒', '⇔',
  '€', '£', '¥', '¢', '₹', '$', '©', '®',
  '™', '§', '¶', '†', '‡', '№', '∞', '∅',
  '∑', '∏', '∫', '√', '≈', '≠', '≤', '≥',
  '±', '∓', '×', '÷', '·', '∗', '⊕', '⊗',
  'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ',
  'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ',
  'φ', 'χ', 'ψ', 'ω', 'Γ', 'Δ', 'Θ', 'Λ',
  'Π', 'Σ', 'Φ', 'Ψ', 'Ω', '∂', '∇', '∀',
]

// Border style presets for the Borders & Shading popover.
// `value` is a CSS border shorthand applied to the current block element.
const BORDER_PRESETS: { label: string; icon: string; value: string | null }[] = [
  { label: 'Aucune',      icon: '∅',  value: null },
  { label: 'Tous',        icon: '⊞',  value: '1px solid #111' },
  { label: 'Haut',        icon: '⊤',  value: 'top' },
  { label: 'Bas',         icon: '⊥',  value: 'bottom' },
  { label: 'Gauche',      icon: '⊢',  value: 'left' },
  { label: 'Droite',      icon: '⊣',  value: 'right' },
  { label: 'Haut+Bas',    icon: '⊨',  value: 'top-bottom' },
  { label: 'G+D',         icon: '⫴',  value: 'left-right' },
  { label: 'Encadré',     icon: '⊟',  value: '2px solid #7c3aed' },
  { label: 'Pointillés',  icon: '⢾',  value: '1px dashed #7c3aed' },
  { label: 'Double',      icon: '⌶',  value: '3px double #111' },
  { label: 'Ombre',       icon: '⌗',  value: 'shadow' },
]

// Color palette for paragraph background shading (trames).
const SHADE_COLORS: string[] = [
  'transparent',
  '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af',
  '#fef3c7', '#fed7aa', '#fecaca', '#fbcfe8', '#ddd6fe',
  '#bfdbfe', '#bae6fd', '#a7f3d0', '#d9f99d', '#fde68a',
  '#dbeafe', '#e0e7ff', '#fce7f3', '#fae8ff', '#ffedd5',
]

export const A4Editor = React.forwardRef<A4EditorHandle, A4EditorProps>(
  function A4Editor({ value, onChange, editable = true, showToolbar = true, onPageCountChange }, ref) {
    const editorRef = React.useRef<HTMLDivElement>(null)
    const lastValueRef = React.useRef<string>(value)
    const lastPageCountRef = React.useRef<number>(1)
    const [pageCountState, setPageCountState] = React.useState<number>(1)

    // Active formatting state — refreshed on selectionchange and on input.
    const [activeState, setActiveState] = React.useState({
      bold: false,
      italic: false,
      underline: false,
      strikeThrough: false,
      subscript: false,
      superscript: false,
      insertUnorderedList: false,
      insertOrderedList: false,
      justifyLeft: false,
      justifyCenter: false,
      justifyRight: false,
      justifyFull: true, // default for academic body text
      block: 'p', // 'p' | 'h1' | 'h2' | 'h3' | 'blockquote'
    })

    // Watermark state — applied to the A4 page background.
    const [watermark, setWatermark] = React.useState<{
      enabled: boolean
      text: string
      opacity: number
      angle: number
    }>({
      enabled: false,
      text: 'CONFIDENTIEL',
      opacity: 0.08,
      angle: -30,
    })

    // Find & Replace state — drives the FindReplaceButton popover.
    const [findState, setFindState] = React.useState<{
      query: string
      replacement: string
      count: number
      current: number
    }>({ query: '', replacement: '', count: 0, current: 0 })

    // Ref to the last match found — used by replace() to know which text node to update.
    const lastMatchRef = React.useRef<Range | null>(null)

    // ----------------------------------------------------------------------
    // Pagination : measure content height, derive page count, notify parent
    // ----------------------------------------------------------------------
    function recomputePageCount() {
      const el = editorRef.current
      if (!el) return
      const px = el.scrollHeight
      const count = Math.max(1, Math.ceil(px / A4_PAGE_HEIGHT_PX))
      if (count !== lastPageCountRef.current) {
        lastPageCountRef.current = count
        setPageCountState(count)
        onPageCountChange?.(count)
      }
    }

    // ----------------------------------------------------------------------
    // Refresh active formatting state from the current selection.
    // Uses document.queryCommandState for the boolean commands and a manual
    // check on the closest block ancestor for formatBlock.
    // ----------------------------------------------------------------------
    function refreshActiveState() {
      if (!editorRef.current) return
      // Only refresh when the selection is inside our editor
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      if (!editorRef.current.contains(range.commonAncestorContainer)) return

      const safe = (cmd: string) => {
        try {
          return document.queryCommandState(cmd)
        } catch {
          return false
        }
      }

      // Determine the block tag of the current selection
      let node: Node | null = range.commonAncestorContainer
      let blockTag = 'p'
      while (node && node !== editorRef.current) {
        if (node.nodeType === 1) {
          const tag = (node as HTMLElement).tagName.toLowerCase()
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'div', 'li'].includes(tag)) {
            blockTag = tag === 'div' || tag === 'li' ? 'p' : tag
            break
          }
        }
        node = node.parentNode
      }

      setActiveState({
        bold: safe('bold'),
        italic: safe('italic'),
        underline: safe('underline'),
        strikeThrough: safe('strikeThrough'),
        subscript: safe('subscript'),
        superscript: safe('superscript'),
        insertUnorderedList: safe('insertUnorderedList'),
        insertOrderedList: safe('insertOrderedList'),
        justifyLeft: safe('justifyLeft'),
        justifyCenter: safe('justifyCenter'),
        justifyRight: safe('justifyRight'),
        justifyFull: safe('justifyFull'),
        block: blockTag as any,
      })
    }

    // Expose imperative API
    React.useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        const el = editorRef.current
        if (!el) return
        el.focus()
        const sel = window.getSelection()
        const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed
        if (hasSelection) {
          const range = sel.getRangeAt(0)
          if (el.contains(range.commonAncestorContainer)) {
            range.deleteContents()
            const fragment = range.createContextualFragment(html)
            const lastNode = fragment.lastChild
            range.insertNode(fragment)
            if (lastNode) {
              range.setStartAfter(lastNode)
              range.setEndAfter(lastNode)
              sel.removeAllRanges()
              sel.addRange(range)
            }
          } else {
            appendHtml(el, html)
          }
        } else {
          appendHtml(el, html)
        }
        const newHtml = el.innerHTML
        lastValueRef.current = newHtml
        onChange(newHtml)
      },
      replaceHtml: (html: string) => {
        const el = editorRef.current
        if (!el) return
        el.innerHTML = html || ''
        lastValueRef.current = html || ''
        onChange(html || '')
        el.focus()
        requestAnimationFrame(() => recomputePageCount())
      },
      focus: () => editorRef.current?.focus(),
      getPageCount: () => lastPageCountRef.current,
    }))

    // ----------------------------------------------------------------------
    // Recompute page count when value changes (external updates, e.g., AI draft)
    // ----------------------------------------------------------------------
    React.useEffect(() => {
      recomputePageCount()
    }, [value])

    React.useEffect(() => {
      const onResize = () => recomputePageCount()
      window.addEventListener('resize', onResize)
      // Listen for selection changes to update active state indicators
      const onSelChange = () => refreshActiveState()
      document.addEventListener('selectionchange', onSelChange)
      const el = editorRef.current
      let ro: ResizeObserver | null = null
      if (el && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => recomputePageCount())
        ro.observe(el)
      }
      requestAnimationFrame(() => recomputePageCount())
      return () => {
        window.removeEventListener('resize', onResize)
        document.removeEventListener('selectionchange', onSelChange)
        ro?.disconnect()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sync external value -> editor (only when it really changed externally)
    React.useEffect(() => {
      const el = editorRef.current
      if (!el) return
      if (value !== lastValueRef.current && value !== el.innerHTML) {
        el.innerHTML = value || ''
        lastValueRef.current = value
      }
    }, [value])

    // Initialize once
    React.useEffect(() => {
      const el = editorRef.current
      if (!el) return
      if (el.innerHTML !== (value || '')) {
        el.innerHTML = value || ''
        lastValueRef.current = value || ''
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handleInput() {
      const el = editorRef.current
      if (!el) return
      const html = el.innerHTML
      lastValueRef.current = html
      onChange(html)
      recomputePageCount()
      refreshActiveState()
    }

    function exec(command: string, val?: string) {
      editorRef.current?.focus()
      document.execCommand(command, false, val)
      handleInput()
    }

    function setBlock(tag: 'h1' | 'h2' | 'h3' | 'p' | 'blockquote') {
      editorRef.current?.focus()
      try {
        document.execCommand('formatBlock', false, `<${tag}>`)
      } catch {
        // fallback noop
      }
      handleInput()
    }

    function clearFormatting() {
      editorRef.current?.focus()
      document.execCommand('formatBlock', false, '<p>')
      document.execCommand('removeFormat')
      // Also clear subscript/superscript and lists
      document.execCommand('unlink')
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Case conversion — operates on the current selection.
    // If the selection is collapsed, no-op.
    // ----------------------------------------------------------------------
    function convertCase(mode: 'upper' | 'lower' | 'title') {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        toast_editor('Sélectionnez d\'abord le texte à transformer.')
        return
      }
      const range = sel.getRangeAt(0)
      const text = range.toString()
      if (!text) return
      let out = text
      if (mode === 'upper') out = text.toUpperCase()
      else if (mode === 'lower') out = text.toLowerCase()
      else if (mode === 'title') {
        out = text
          .toLowerCase()
          .replace(/(^|\s|[\.\!\?\;\:])([a-zà-ÿ])/g, (_, p1, p2) => p1 + p2.toUpperCase())
      }
      // Insert as a text node (preserves any inline styles of the wrapping element)
      const textNode = document.createTextNode(out)
      range.deleteContents()
      range.insertNode(textNode)
      // Reselect the new text so the user can continue working on it
      const newRange = document.createRange()
      newRange.selectNodeContents(textNode)
      sel.removeAllRanges()
      sel.addRange(newRange)
      handleInput()
    }

    // Apply font family to the current selection (or future typing at caret)
    function applyFontFamily(fontValue: string) {
      const ff = FONT_FAMILIES.find((f) => f.value === fontValue)
      if (!ff) return
      exec('fontName', ff.css)
    }

    // Apply font size to the current selection.
    // execCommand('fontSize', false, n) only accepts 1..7, so we use the
    // FONT_SIZES mapping above. To get true pt sizes we additionally wrap the
    // selection in a <span style="font-size:Npt"> — but execCommand is simpler
    // and matches what most users expect from a basic WYSIWYG toolbar.
    function applyFontSize(sizeValue: string) {
      exec('fontSize', sizeValue)
    }

    // Apply text color via execCommand('foreColor')
    function applyTextColor(color: string) {
      exec('foreColor', color)
    }

    // Apply highlight color via execCommand('hiliteColor') (fallback 'backColor')
    function applyHighlight(color: string) {
      editorRef.current?.focus()
      try {
        if (!document.execCommand('hiliteColor', false, color)) {
          document.execCommand('backColor', false, color)
        }
      } catch {
        document.execCommand('backColor', false, color)
      }
      handleInput()
    }

    // Select all content inside the editor (object selection)
    function selectAllInEditor() {
      const el = editorRef.current
      if (!el) return
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      refreshActiveState()
    }

    // Clear selection (collapse caret)
    function clearSelection() {
      const sel = window.getSelection()
      sel?.removeAllRanges()
      editorRef.current?.focus()
      refreshActiveState()
    }

    // ----------------------------------------------------------------------
    // Deselect highlight — clears the highlight (surlignage) from the current
    // selection by applying a transparent background color.
    // ----------------------------------------------------------------------
    function clearHighlight() {
      editorRef.current?.focus()
      // hiliteColor with 'transparent' clears the highlight in modern browsers.
      try {
        document.execCommand('hiliteColor', false, 'transparent')
      } catch {
        document.execCommand('backColor', false, 'transparent')
      }
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a table at the caret position.
    // Generates an HTML <table> with <thead> (1 row) + <tbody> (rows-1 rows).
    // ----------------------------------------------------------------------
    function insertTable(rows: number, cols: number) {
      const hasHeader = true
      const head = hasHeader
        ? `<thead><tr>${Array.from({ length: cols }, (_, i) => `<th>En-tête ${i + 1}</th>`).join('')}</tr></thead>`
        : ''
      const bodyRows = Array.from(
        { length: Math.max(1, rows - (hasHeader ? 1 : 0)) },
        (_, r) =>
          `<tr>${Array.from({ length: cols }, () => `<td>&nbsp;</td>`).join('')}</tr>`
      ).join('')
      const html = `<table class="iris-table"><caption>Légende du tableau</caption>${head}<tbody>${bodyRows}</tbody></table><p>&nbsp;</p>`
      editorRef.current?.focus()
      document.execCommand('insertHTML', false, html)
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a spreadsheet-like table (feuille de calcul).
    // Generates an HTML <table class="iris-spreadsheet"> with column headers
    // (A, B, C, ...) and row numbers (1, 2, 3, ...) — like Excel.
    // ----------------------------------------------------------------------
    function insertSpreadsheet(rows: number, cols: number) {
      const colHeaders = Array.from({ length: cols }, (_, i) =>
        String.fromCharCode(65 + i)
      )
      const head = `<thead><tr><th class="iris-corner">#</th>${colHeaders.map((c) => `<th class="iris-col-h">${c}</th>`).join('')}</tr></thead>`
      const bodyRows = Array.from({ length: rows }, (_, r) => {
        const cells = Array.from({ length: cols }, () => `<td>&nbsp;</td>`).join('')
        return `<tr><th class="iris-row-h">${r + 1}</th>${cells}</tr>`
      }).join('')
      const html = `<table class="iris-spreadsheet">${head}<tbody>${bodyRows}</tbody></table><p>&nbsp;</p>`
      editorRef.current?.focus()
      document.execCommand('insertHTML', false, html)
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a hyperlink on the current selection (or with placeholder text).
    // ----------------------------------------------------------------------
    function insertHyperlink(url: string) {
      if (!url) return
      editorRef.current?.focus()
      const sel = window.getSelection()
      // If no selection, insert the URL as the link text
      if (!sel || sel.isCollapsed) {
        const safe = escapeHtml(url)
        document.execCommand('insertHTML', false, `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a> `)
      } else {
        document.execCommand('createLink', false, url)
        // Add target=_blank to the newly created link
        const link = (editorRef.current?.querySelector('a[href="' + url + '"]:last-of-type') ||
          editorRef.current?.querySelector('a[href="' + url + '"]')) as HTMLAnchorElement | null
        if (link) {
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
        }
      }
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert an image (by URL) at the caret position.
    // ----------------------------------------------------------------------
    function insertImageByUrl(url: string, alt?: string) {
      if (!url) return
      editorRef.current?.focus()
      const safe = escapeHtml(url)
      const altSafe = escapeHtml(alt || 'Image')
      document.execCommand('insertHTML', false, `<img src="${safe}" alt="${altSafe}" class="iris-img" />`)
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a special character at the caret position.
    // ----------------------------------------------------------------------
    function insertSpecialChar(ch: string) {
      editorRef.current?.focus()
      document.execCommand('insertText', false, ch)
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a horizontal rule (separateur horizontal).
    // ----------------------------------------------------------------------
    function insertHorizontalRule() {
      editorRef.current?.focus()
      document.execCommand('insertHorizontalRule')
      // Add an empty paragraph after the HR so the user can keep typing below it
      document.execCommand('insertHTML', false, '<p>&nbsp;</p>')
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a manual page break (saut de page manuel).
    // Renders as a labelled bar in the editor, becomes `break-after: page` in print.
    // ----------------------------------------------------------------------
    function insertPageBreak() {
      editorRef.current?.focus()
      const html = `<div class="iris-page-break" contenteditable="false" data-iris="page-break"><span>Saut de page</span></div><p>&nbsp;</p>`
      document.execCommand('insertHTML', false, html)
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert current date (and optionally time) at the caret position.
    // ----------------------------------------------------------------------
    function insertDate(withTime = false) {
      editorRef.current?.focus()
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      let str = `${dd}/${mm}/${yyyy}`
      if (withTime) {
        const hh = String(now.getHours()).padStart(2, '0')
        const mi = String(now.getMinutes()).padStart(2, '0')
        str += ` à ${hh}:${mi}`
      }
      document.execCommand('insertText', false, str)
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Insert a footnote marker — a superscript number that links to a note
    // at the bottom of the section. For simplicity, we insert just the
    // superscript marker (the student adds the note text at the bottom).
    // ----------------------------------------------------------------------
    function insertFootnote() {
      editorRef.current?.focus()
      // Find the highest footnote number currently in the document
      const existing = editorRef.current?.querySelectorAll('sup.iris-fn')
      const next = (existing?.length || 0) + 1
      const html = `<sup class="iris-fn" data-fn="${next}"><a href="#fn-${next}" id="fnref-${next}">[${next}]</a></sup>`
      document.execCommand('insertHTML', false, html)
      // Append the footnote definition at the end of the editor if not exists
      const editor = editorRef.current
      if (editor) {
        let notes = editor.querySelector('.iris-footnotes')
        if (!notes) {
          notes = document.createElement('div')
          notes.className = 'iris-footnotes'
          notes.setAttribute('contenteditable', 'true')
          notes.innerHTML = '<p><strong>Notes</strong></p>'
          editor.appendChild(notes)
        }
        const p = document.createElement('p')
        p.id = `fn-${next}`
        p.innerHTML = `<sup>[${next}]</sup> &nbsp; <span class="iris-fn-text">Saisissez votre note ici…</span>`
        notes.appendChild(p)
      }
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Apply line spacing to the current block (paragraph, heading, quote).
    // ----------------------------------------------------------------------
    function setLineSpacing(value: string) {
      const block = getCurrentBlockElement()
      if (!block) return
      block.style.lineHeight = value
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Indent / outdent the current block (uses execCommand).
    // ----------------------------------------------------------------------
    function indentBlock() {
      editorRef.current?.focus()
      document.execCommand('indent')
      handleInput()
    }
    function outdentBlock() {
      editorRef.current?.focus()
      document.execCommand('outdent')
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Apply a border style to the current block element.
    // `value` is either a full CSS shorthand, or a keyword (top/bottom/left/right/
    // top-bottom/left-right/shadow) handled separately.
    // ----------------------------------------------------------------------
    function applyBorder(preset: { label: string; value: string | null }) {
      const block = getCurrentBlockElement()
      if (!block) return
      // Reset all borders first
      block.style.border = ''
      block.style.borderTop = ''
      block.style.borderBottom = ''
      block.style.borderLeft = ''
      block.style.borderRight = ''
      block.style.boxShadow = ''
      block.style.padding = ''
      if (preset.value == null) {
        handleInput()
        return
      }
      if (preset.value === 'shadow') {
        block.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.18)'
        block.style.padding = '8pt 12pt'
      } else if (['top', 'bottom', 'left', 'right'].includes(preset.value)) {
        const side = preset.value as 'top' | 'bottom' | 'left' | 'right'
        const cap = side.charAt(0).toUpperCase() + side.slice(1)
        ;(block.style as any)[`border${cap}`] = '1.5px solid #111'
        block.style.padding = '6pt 8pt'
      } else if (preset.value === 'top-bottom') {
        block.style.borderTop = '1.5px solid #111'
        block.style.borderBottom = '1.5px solid #111'
        block.style.padding = '6pt 8pt'
      } else if (preset.value === 'left-right') {
        block.style.borderLeft = '1.5px solid #111'
        block.style.borderRight = '1.5px solid #111'
        block.style.padding = '6pt 8pt'
      } else {
        // Full shorthand
        block.style.border = preset.value
        block.style.padding = '6pt 8pt'
      }
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Apply a paragraph background color (trame) to the current block.
    // ----------------------------------------------------------------------
    function applyParagraphBackground(color: string) {
      const block = getCurrentBlockElement()
      if (!block) return
      if (color === 'transparent') {
        block.style.backgroundColor = ''
      } else {
        block.style.backgroundColor = color
        if (!block.style.padding) block.style.padding = '4pt 8pt'
      }
      handleInput()
    }

    // ----------------------------------------------------------------------
    // Helper — find the block element containing the current selection.
    // Returns the closest p/h1/h2/h3/blockquote/li/div (with class) ancestor.
    // ----------------------------------------------------------------------
    function getCurrentBlockElement(): HTMLElement | null {
      const editor = editorRef.current
      if (!editor) return null
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return null
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer
      while (node && node !== editor) {
        if (node.nodeType === 1) {
          const tag = (node as HTMLElement).tagName.toLowerCase()
          if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'li', 'pre', 'div'].includes(tag)) {
            return node as HTMLElement
          }
        }
        node = node.parentNode
      }
      return editor
    }

    // ----------------------------------------------------------------------
    // Find & Replace — search the editor content for `query` and select the
    // next match. Uses TreeWalker to traverse text nodes.
    // ----------------------------------------------------------------------
    function findInDocument(query: string) {
      const editor = editorRef.current
      if (!editor || !query) {
        setFindState((s) => ({ ...s, query, count: 0, current: 0 }))
        lastMatchRef.current = null
        return
      }
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.includes(query)) {
            return NodeFilter.FILTER_REJECT
          }
          // Skip text inside script/style
          const parent = node.parentElement
          if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })
      const matches: { node: Text; offset: number }[] = []
      let cur: Node | null
      while ((cur = walker.nextNode())) {
        const text = cur as Text
        const idx = text.nodeValue!.indexOf(query)
        if (idx >= 0) matches.push({ node: text, offset: idx })
      }
      if (matches.length === 0) {
        setFindState((s) => ({ ...s, query, count: 0, current: 0 }))
        lastMatchRef.current = null
        toast_editor(`Aucune occurrence de « ${query} ».`)
        return
      }
      // Find next match after current selection
      const sel = window.getSelection()
      let startIdx = 0
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        for (let i = 0; i < matches.length; i++) {
          const m = matches[i]
          // Skip matches that are entirely before the current selection
          if (
            m.node === range.startContainer &&
            m.offset + query.length <= range.startOffset
          ) continue
          startIdx = i
          break
        }
      }
      const m = matches[startIdx]
      const range = document.createRange()
      range.setStart(m.node, m.offset)
      range.setEnd(m.node, m.offset + query.length)
      sel?.removeAllRanges()
      sel?.addRange(range)
      lastMatchRef.current = range.cloneRange()
      // Scroll the match into view
      const rect = range.getBoundingClientRect()
      if (rect.top < 80 || rect.top > window.innerHeight - 80) {
        window.scrollBy({ top: rect.top - 200, behavior: 'smooth' })
      }
      setFindState((s) => ({ ...s, query, count: matches.length, current: startIdx + 1 }))
    }

    function replaceInDocument(query: string, replacement: string, all = false) {
      const editor = editorRef.current
      if (!editor || !query) return
      let count = 0
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.includes(query)) {
            return NodeFilter.FILTER_REJECT
          }
          const parent = node.parentElement
          if (parent && ['SCRIPT', 'STYLE'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })
      const nodes: Text[] = []
      let cur: Node | null
      while ((cur = walker.nextNode())) nodes.push(cur as Text)
      for (const text of nodes) {
        if (!text.nodeValue) continue
        if (all) {
          const newValue = text.nodeValue.split(query).join(replacement)
          if (newValue !== text.nodeValue) {
            text.nodeValue = newValue
            count += (text.nodeValue.match(new RegExp(escapeRegExp(replacement), 'g')) || []).length
          }
        } else {
          // Replace only the next occurrence after the last match
          const idx = text.nodeValue.indexOf(query)
          if (idx >= 0) {
            text.nodeValue =
              text.nodeValue.slice(0, idx) +
              replacement +
              text.nodeValue.slice(idx + query.length)
            count = 1
            // Select the replacement so find-next continues from here
            const range = document.createRange()
            range.setStart(text, idx)
            range.setEnd(text, idx + replacement.length)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
            lastMatchRef.current = range.cloneRange()
            break
          }
        }
      }
      if (count > 0) handleInput()
      setFindState((s) => ({ ...s, replacement, current: all ? 0 : s.current, count: all ? 0 : s.count }))
      toast_editor(all ? `${count} remplacement(s) effectué(s).` : (count ? 'Remplacement effectué.' : 'Aucune occurrence trouvée.'))
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        exec('bold')
      } else if (meta && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        exec('italic')
      } else if (meta && e.key.toLowerCase() === 'u') {
        e.preventDefault()
        exec('underline')
      } else if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault()
        exec('strikethrough')
      } else if (meta && e.key.toLowerCase() === 'e') {
        // Ctrl+E = center alignment (custom shortcut)
        e.preventDefault()
        exec('justifyCenter')
      } else if (meta && e.shiftKey && e.key.toLowerCase() === 'a') {
        // Ctrl+Shift+A = select all in editor
        e.preventDefault()
        selectAllInEditor()
      } else if (meta && e.key.toLowerCase() === 'f') {
        // Ctrl+F = find (we mark it handled so the browser's native find doesn't fire)
        // The FindReplaceButton popover is the actual UI; Ctrl+F just dispatches
        // a custom event the toolbar can listen for. For now we focus the editor
        // and let the user click the Recherche button — this avoids hijacking
        // the browser native find which some users may prefer.
        // No preventDefault() — let the browser handle it if it wants to.
      } else if (meta && e.key.toLowerCase() === 'k') {
        // Ctrl+K = insert hyperlink (Google Docs / Notion convention)
        e.preventDefault()
        const url = window.prompt('URL du lien :', 'https://')
        if (url) insertHyperlink(url)
      } else if (meta && e.shiftKey && e.key === 'Enter') {
        // Ctrl+Shift+Enter = insert manual page break
        e.preventDefault()
        insertPageBreak()
      } else if (meta && e.shiftKey && (e.key === '7' || e.key === '8')) {
        // Ctrl+Shift+7 = numbered list, Ctrl+Shift+8 = bulleted list (Google Docs convention)
        e.preventDefault()
        if (e.key === '7') exec('insertOrderedList')
        else exec('insertUnorderedList')
      }
    }

    function handlePaste(e: React.ClipboardEvent) {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      const html = text
        .split(/\n\s*\n+/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('')
      document.execCommand('insertHTML', false, html)
      handleInput()
    }

    return (
      <div className="flex flex-col h-full">
        {showToolbar && editable && (
          <Toolbar
            active={activeState}
            onBold={() => exec('bold')}
            onItalic={() => exec('italic')}
            onUnderline={() => exec('underline')}
            onStrike={() => exec('strikeThrough')}
            onSubscript={() => exec('subscript')}
            onSuperscript={() => exec('superscript')}
            onH1={() => setBlock('h1')}
            onH2={() => setBlock('h2')}
            onH3={() => setBlock('h3')}
            onP={() => setBlock('p')}
            onUL={() => exec('insertUnorderedList')}
            onOL={() => exec('insertOrderedList')}
            onQuote={() => setBlock('blockquote')}
            onUndo={() => exec('undo')}
            onRedo={() => exec('redo')}
            onClear={clearFormatting}
            onAlignLeft={() => exec('justifyLeft')}
            onAlignCenter={() => exec('justifyCenter')}
            onAlignRight={() => exec('justifyRight')}
            onAlignJustify={() => exec('justifyFull')}
            onCaseUpper={() => convertCase('upper')}
            onCaseLower={() => convertCase('lower')}
            onCaseTitle={() => convertCase('title')}
            onFontFamily={applyFontFamily}
            onFontSize={applyFontSize}
            onTextColor={applyTextColor}
            onHighlight={applyHighlight}
            onClearHighlight={clearHighlight}
            onSelectAll={selectAllInEditor}
            onClearSelection={clearSelection}
            watermark={watermark}
            onWatermarkChange={setWatermark}
            onIndent={indentBlock}
            onOutdent={outdentBlock}
            onLineSpacing={setLineSpacing}
            onApplyBorder={applyBorder}
            onApplyParagraphBackground={applyParagraphBackground}
            onInsertTable={insertTable}
            onInsertSpreadsheet={insertSpreadsheet}
            onInsertHyperlink={insertHyperlink}
            onInsertImage={insertImageByUrl}
            onInsertSpecialChar={insertSpecialChar}
            onInsertHR={insertHorizontalRule}
            onInsertPageBreak={insertPageBreak}
            onInsertDate={() => insertDate(false)}
            onInsertDateTime={() => insertDate(true)}
            onInsertFootnote={insertFootnote}
            findState={findState}
            onFind={findInDocument}
            onReplace={replaceInDocument}
          />
        )}

        <div className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-8 flex justify-center">
          <A4Page
            ref={editorRef}
            editable={editable}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="shadow-xl"
            pageCount={pageCountState}
            watermark={watermark.enabled ? watermark : null}
          />
        </div>
      </div>
    )
  }
)

// ============================================================================
// A4 page surface — the white sheet.
// Now renders the watermark layer behind the content and uses the
// `a4-paginated` class so the CSS background-image renders page boundaries
// every 297mm (visual auto page-break indicator).
// ============================================================================

interface WatermarkConfig {
  text: string
  opacity: number
  angle: number
}

const A4Page = React.forwardRef<
  HTMLDivElement,
  {
    editable: boolean
    onInput: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onPaste: (e: React.ClipboardEvent) => void
    className?: string
    pageCount?: number
    watermark?: WatermarkConfig | null
  }
>(function A4Page({ editable, onInput, onKeyDown, onPaste, className, pageCount = 1, watermark }, ref) {
  return (
    <div className="relative" style={{ width: '210mm' }}>
      <div
        ref={ref}
        contentEditable={editable}
        suppressContentEditableWarning
        spellCheck
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        className={cn(
          'a4-page',
          'a4-paginated',
          'bg-white text-black',
          'mx-auto',
          'outline-none',
          'prose-iris',
          editable && 'cursor-text',
          className
        )}
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '25mm 25mm 30mm 25mm',
        }}
        data-placeholder="Commencez à écrire ici, ou demandez à IRIS de générer un brouillon formaté…"
      />
      {/* Watermark layer — rendered behind the content, repeated on each A4 page.
          Only visible when `watermark` prop is non-null. */}
      {watermark && (
        <div
          className="a4-watermark-layer"
          aria-hidden
          style={{
            // Position repeated watermark text every 297mm
            // The CSS uses background-image with text rendered as SVG data URI
            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
                 <text x='300' y='200' text-anchor='middle'
                       font-family='Inter, Arial, sans-serif'
                       font-size='90'
                       font-weight='700'
                       fill='#000000'
                       opacity='${watermark.opacity}'
                       transform='rotate(${watermark.angle} 300 200)'>
                   ${escapeHtml(watermark.text || 'CONFIDENTIEL')}
                 </text>
               </svg>`
            )}")`,
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            backgroundSize: '600px 400px',
          }}
        />
      )}
      {/* Page markers — small "Page N" labels in the bottom margin of each A4 page.
          Only rendered in the editor (hidden in print via CSS). */}
      {Array.from({ length: pageCount }, (_, i) => (
        <span
          key={`pg-${i}`}
          className="a4-page-marker"
          style={{
            top: `calc(${(i + 1) * 297}mm - 18mm)`,
          }}
        >
          — {i + 1} —
        </span>
      ))}
      {/* Margin labels — "MARGE 30 mm" in the bottom margin zone of each A4 page,
          reinforcing visually that the bottom margin must be respected. */}
      {Array.from({ length: pageCount }, (_, i) => (
        <span
          key={`ml-${i}`}
          className="a4-margin-label"
          style={{
            top: `calc(${(i + 1) * 297}mm - 15mm)`,
          }}
        >
          ⚠ Marge 30 mm
        </span>
      ))}
    </div>
  )
})

// ============================================================================
// Toolbar — 3 rows, all visible, no scroll.
// Active state indicators (voyant lumineux): when a toggle is active for the
// current selection, the button gets a filled background and a small dot.
// ============================================================================

interface ActiveState {
  bold: boolean
  italic: boolean
  underline: boolean
  strikeThrough: boolean
  subscript: boolean
  superscript: boolean
  insertUnorderedList: boolean
  insertOrderedList: boolean
  justifyLeft: boolean
  justifyCenter: boolean
  justifyRight: boolean
  justifyFull: boolean
  block: string
}

interface ToolbarProps {
  active: ActiveState
  onBold: () => void
  onItalic: () => void
  onUnderline: () => void
  onStrike: () => void
  onSubscript: () => void
  onSuperscript: () => void
  onH1: () => void
  onH2: () => void
  onH3: () => void
  onP: () => void
  onUL: () => void
  onOL: () => void
  onQuote: () => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onAlignLeft: () => void
  onAlignCenter: () => void
  onAlignRight: () => void
  onAlignJustify: () => void
  onCaseUpper: () => void
  onCaseLower: () => void
  onCaseTitle: () => void
  onFontFamily: (v: string) => void
  onFontSize: (v: string) => void
  onTextColor: (c: string) => void
  onHighlight: (c: string) => void
  onClearHighlight: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  watermark: { enabled: boolean; text: string; opacity: number; angle: number }
  onWatermarkChange: (w: { enabled: boolean; text: string; opacity: number; angle: number }) => void
  // Layout (disposition)
  onIndent: () => void
  onOutdent: () => void
  onLineSpacing: (v: string) => void
  // Borders & Shading
  onApplyBorder: (preset: { label: string; value: string | null }) => void
  onApplyParagraphBackground: (c: string) => void
  // Insert tools
  onInsertTable: (rows: number, cols: number) => void
  onInsertSpreadsheet: (rows: number, cols: number) => void
  onInsertHyperlink: (url: string) => void
  onInsertImage: (url: string, alt?: string) => void
  onInsertSpecialChar: (ch: string) => void
  onInsertHR: () => void
  onInsertPageBreak: () => void
  onInsertDate: () => void
  onInsertDateTime: () => void
  onInsertFootnote: () => void
  // Find & Replace
  findState: { query: string; replacement: string; count: number; current: number }
  onFind: (q: string) => void
  onReplace: (q: string, r: string, all?: boolean) => void
}

function Toolbar(props: ToolbarProps) {
  const {
    active,
    onBold, onItalic, onUnderline, onStrike, onSubscript, onSuperscript,
    onH1, onH2, onH3, onP, onUL, onOL, onQuote,
    onUndo, onRedo, onClear,
    onAlignLeft, onAlignCenter, onAlignRight, onAlignJustify,
    onCaseUpper, onCaseLower, onCaseTitle,
    onFontFamily, onFontSize,
    onTextColor, onHighlight, onClearHighlight,
    onSelectAll, onClearSelection,
    watermark, onWatermarkChange,
    onIndent, onOutdent, onLineSpacing,
    onApplyBorder, onApplyParagraphBackground,
    onInsertTable, onInsertSpreadsheet,
    onInsertHyperlink, onInsertImage,
    onInsertSpecialChar, onInsertHR, onInsertPageBreak,
    onInsertDate, onInsertDateTime, onInsertFootnote,
    findState, onFind, onReplace,
  } = props

  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* ====================== Row 1 ====================== */}
        <div className="flex items-center gap-1 px-2 py-1.5 flex-nowrap overflow-x-hidden">
          <ToolbarButton onClick={onUndo} label="Annuler (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onRedo} label="Rétablir (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>

          <Divider />

          {/* Font family */}
          <Select onValueChange={onFontFamily}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Police" />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.css }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font size */}
          <Select onValueChange={onFontSize}>
            <SelectTrigger className="h-8 w-[68px] text-xs">
              <SelectValue placeholder="Taille" />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label} pt
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Divider />

          {/* Bold / Italic / Underline / Strikethrough with active state */}
          <ToolbarToggle onClick={onBold} label="Gras (Ctrl+B)" active={active.bold}>
            <Bold className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onItalic} label="Italique (Ctrl+I)" active={active.italic}>
            <Italic className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onUnderline} label="Souligné (Ctrl+U)" active={active.underline}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onStrike} label="Barré (Ctrl+S)" active={active.strikeThrough}>
            <Strikethrough className="h-4 w-4" />
          </ToolbarToggle>

          <Divider />

          {/* Subscript / Superscript */}
          <ToolbarToggle onClick={onSubscript} label="Indice" active={active.subscript}>
            <Subscript className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onSuperscript} label="Exposant" active={active.superscript}>
            <Superscript className="h-4 w-4" />
          </ToolbarToggle>

          <Divider />

          {/* Case conversion — operates on selection */}
          <ToolbarButton onClick={onCaseUpper} label="MAJUSCULES">
            <CaseUpper className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onCaseLower} label="minuscules">
            <CaseLower className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onCaseTitle} label="Titre (1ère lettre)">
            <span className="text-[11px] font-bold leading-none">Ab</span>
          </ToolbarButton>

          <Divider />

          {/* Text color + Highlight + Deselect highlight */}
          <TextColorButton onColor={onTextColor} />
          <HighlightButton onColor={onHighlight} />
          <ToolbarButton onClick={onClearHighlight} label="Désélectionner le surlignage">
            <Highlighter className="h-4 w-4 relative" />
            <span
              className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-red-500 leading-none"
              aria-hidden
            >
              ✕
            </span>
          </ToolbarButton>

          {/* Spacer pushes the rest to the right */}
          <div className="ml-auto pr-2 hidden lg:flex items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Format A4 · 25 mm
            </span>
          </div>
        </div>

        {/* ====================== Row 2 ====================== */}
        <div className="flex items-center gap-1 px-2 pb-1.5 pt-0.5 flex-nowrap overflow-x-hidden border-t border-border/50">
          {/* Block format */}
          <ToolbarToggle onClick={onP} label="Paragraphe" active={active.block === 'p'}>
            <Pilcrow className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onH1} label="Titre 1" active={active.block === 'h1'}>
            <Heading1 className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onH2} label="Titre 2" active={active.block === 'h2'}>
            <Heading2 className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onH3} label="Titre 3" active={active.block === 'h3'}>
            <Heading3 className="h-4 w-4" />
          </ToolbarToggle>

          <Divider />

          {/* Lists + Quote */}
          <ToolbarToggle onClick={onUL} label="Liste à puces" active={active.insertUnorderedList}>
            <List className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onOL} label="Liste numérotée" active={active.insertOrderedList}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onQuote} label="Citation" active={active.block === 'blockquote'}>
            <Quote className="h-4 w-4" />
          </ToolbarToggle>

          <Divider />

          {/* Alignment — disposition */}
          <ToolbarToggle onClick={onAlignLeft} label="Aligner à gauche" active={active.justifyLeft}>
            <AlignLeft className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onAlignCenter} label="Centrer (Ctrl+E)" active={active.justifyCenter}>
            <AlignCenter className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onAlignRight} label="Aligner à droite" active={active.justifyRight}>
            <AlignRight className="h-4 w-4" />
          </ToolbarToggle>
          <ToolbarToggle onClick={onAlignJustify} label="Justifier" active={active.justifyFull}>
            <AlignJustify className="h-4 w-4" />
          </ToolbarToggle>

          <Divider />

          {/* Indent / Outdent — disposition (retraits) */}
          <ToolbarButton onClick={onOutdent} label="Diminuer le retrait">
            <ChevronLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onIndent} label="Augmenter le retrait">
            <ChevronRight className="h-4 w-4" />
          </ToolbarButton>

          {/* Line spacing — interligne */}
          <LineSpacingButton onApply={onLineSpacing} />

          <Divider />

          {/* Borders & Shading — bordures et trames */}
          <BordersButton onApply={onApplyBorder} />
          <ParagraphBackgroundButton onApply={onApplyParagraphBackground} />

          <Divider />

          {/* Watermark (filigrane) */}
          <WatermarkButton watermark={watermark} onChange={onWatermarkChange} />

          <Divider />

          {/* Find & Replace */}
          <FindReplaceButton findState={findState} onFind={onFind} onReplace={onReplace} />

          <Divider />

          {/* Object selection */}
          <ToolbarButton onClick={onSelectAll} label="Tout sélectionner (Ctrl+Shift+A)">
            <MousePointerClick className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={onClearSelection} label="Désélectionner">
            <span className="text-[10px] font-bold leading-none">✕</span>
          </ToolbarButton>

          <Divider />

          {/* Clear formatting */}
          <ToolbarButton onClick={onClear} label="Effacer la mise en forme">
            <Eraser className="h-4 w-4" />
          </ToolbarButton>

          <div className="ml-auto pr-2 hidden lg:flex items-center gap-1.5">
            {watermark.enabled && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
                <Droplet className="h-3 w-3" />
                Filigrane actif
              </span>
            )}
          </div>
        </div>

        {/* ====================== Row 3 — Insertion ====================== */}
        <div className="flex items-center gap-1 px-2 pb-1.5 pt-0.5 flex-nowrap overflow-x-hidden border-t border-border/50">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pr-1">
            Insérer
          </span>

          {/* Table */}
          <TableInsertButton onInsert={onInsertTable} />

          {/* Spreadsheet (feuille de calcul) */}
          <SpreadsheetInsertButton onInsert={onInsertSpreadsheet} />

          <Divider />

          {/* Hyperlink */}
          <HyperlinkButton onInsert={onInsertHyperlink} />

          {/* Image */}
          <ImageButton onInsert={onInsertImage} />

          {/* Special character */}
          <SpecialCharButton onInsert={onInsertSpecialChar} />

          <Divider />

          {/* Horizontal rule */}
          <ToolbarButton onClick={onInsertHR} label="Séparateur horizontal">
            <SeparatorHorizontal className="h-4 w-4" />
          </ToolbarButton>

          {/* Page break */}
          <ToolbarButton onClick={onInsertPageBreak} label="Saut de page">
            <div className="flex flex-col items-center leading-none">
              <span className="text-[8px]">□</span>
              <span className="h-[2px] w-3.5 bg-foreground mt-0.5 rounded-full" />
              <span className="text-[8px] mt-0.5">□</span>
            </div>
          </ToolbarButton>

          <Divider />

          {/* Date / DateTime */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0"
                    tabIndex={-1}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Date du jour
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onInsertDate}>
                <Calendar className="h-3.5 w-3.5 mr-2" />
                Date (jj/mm/aaaa)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onInsertDateTime}>
                <Calendar className="h-3.5 w-3.5 mr-2" />
                Date et heure
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Footnote */}
          <ToolbarButton onClick={onInsertFootnote} label="Note de bas de page">
            <Brackets className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-primary leading-none">
              ¹
            </span>
          </ToolbarButton>

          {/* Spacer pushes the rest to the right */}
          <div className="ml-auto pr-2 hidden lg:flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Édition A4 · 297 mm
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ============================================================================
// Toolbar buttons
// ============================================================================

function ToolbarButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 flex-shrink-0"
          onClick={onClick}
          tabIndex={-1}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

// ToolbarToggle — same as ToolbarButton but shows an ACTIVE state (voyant lumineux)
// when the formatting is active for the current selection.
function ToolbarToggle({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  active: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          tabIndex={-1}
          className={cn(
            'relative h-8 w-8 p-0 flex-shrink-0 transition-colors',
            active
              ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          {children}
          {/* Active state indicator — small dot in the bottom-right corner */}
          {active && (
            <span
              className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"
              aria-hidden
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function Divider() {
  return <span className="w-px h-6 bg-border mx-1 flex-shrink-0" />
}

// ============================================================================
// Text color + Highlight buttons with color swatch popover
// ============================================================================

const TEXT_COLORS = [
  '#000000', '#1a1a2e', '#581c87', '#7c3aed', '#a16207',
  '#b91c1c', '#15803d', '#1d4ed8', '#0e7490', '#6b7280',
  '#ffffff', '#fbbf24', '#f97316', '#ef4444', '#22c55e',
]

function TextColorButton({ onColor }: { onColor: (c: string) => void }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 relative"
              tabIndex={-1}
            >
              <TypeIcon className="h-4 w-4" />
              <span
                className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full"
                style={{ backgroundColor: '#7c3aed' }}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Couleur du texte
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Couleur du texte
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColor(c)}
              className="w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
              tabIndex={-1}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HighlightButton({ onColor }: { onColor: (c: string) => void }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 relative"
              tabIndex={-1}
            >
              <Highlighter className="h-4 w-4" />
              <span
                className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full"
                style={{ backgroundColor: '#fbbf24' }}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Surligner
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Couleur de surlignage
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {['#fef08a', '#fed7aa', '#fecaca', '#d9f99d', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#bae6fd', '#fef9c3', '#e0e7ff'].map((c) => (
            <button
              key={c}
              onClick={() => onColor(c)}
              className="w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
              title={c}
              tabIndex={-1}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Watermark button + popover (filigrane)
// ============================================================================

function WatermarkButton({
  watermark,
  onChange,
}: {
  watermark: { enabled: boolean; text: string; opacity: number; angle: number }
  onChange: (w: { enabled: boolean; text: string; opacity: number; angle: number }) => void
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 px-2 flex-shrink-0 gap-1.5',
                watermark.enabled
                  ? 'bg-violet-500/15 text-violet-600 hover:bg-violet-500/20'
                  : 'hover:bg-muted'
              )}
              tabIndex={-1}
            >
              <Droplet className="h-4 w-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Filigrane</span>
              {watermark.enabled && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"
                  aria-hidden
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Filigrane (watermark)
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Filigrane</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Ajoute un texte en arrière-plan de la page A4. Utile pour marquer
            un brouillon ou un document confidentiel.
          </p>
          <div className="flex items-center justify-between">
            <Label htmlFor="wm-enabled" className="text-xs cursor-pointer">
              Activer le filigrane
            </Label>
            <button
              id="wm-enabled"
              type="button"
              role="switch"
              aria-checked={watermark.enabled}
              onClick={() => onChange({ ...watermark, enabled: !watermark.enabled })}
              className={cn(
                'w-9 h-5 rounded-full transition-colors relative',
                watermark.enabled ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  watermark.enabled ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wm-text" className="text-xs">Texte du filigrane</Label>
            <Input
              id="wm-text"
              value={watermark.text}
              onChange={(e) => onChange({ ...watermark, text: e.target.value })}
              placeholder="CONFIDENTIEL"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wm-opacity" className="text-xs">
              Opacité : {Math.round(watermark.opacity * 100)}%
            </Label>
            <input
              id="wm-opacity"
              type="range"
              min={0.02}
              max={0.3}
              step={0.01}
              value={watermark.opacity}
              onChange={(e) => onChange({ ...watermark, opacity: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wm-angle" className="text-xs">
              Angle : {watermark.angle}°
            </Label>
            <input
              id="wm-angle"
              type="range"
              min={-90}
              max={90}
              step={5}
              value={watermark.angle}
              onChange={(e) => onChange({ ...watermark, angle: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Insert Table — popover with a 6×6 grid picker for choosing rows × cols
// ============================================================================

function TableInsertButton({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [hover, setHover] = React.useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const MAX = 6
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 flex-shrink-0 gap-1"
              tabIndex={-1}
            >
              <Table2 className="h-4 w-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Tableau</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insérer un tableau
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          {hover.r > 0 && hover.c > 0
            ? `${hover.r} × ${hover.c}`
            : 'Choisissez la taille'}
        </p>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${MAX}, 18px)` }}
          onMouseLeave={() => setHover({ r: 0, c: 0 })}
        >
          {Array.from({ length: MAX * MAX }, (_, i) => {
            const r = Math.floor(i / MAX) + 1
            const c = (i % MAX) + 1
            const isOn = r <= hover.r && c <= hover.c
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover({ r, c })}
                onClick={() => onInsert(r, c)}
                className={cn(
                  'w-[18px] h-[18px] rounded-sm border transition-colors',
                  isOn
                    ? 'bg-primary border-primary'
                    : 'bg-muted/40 border-border hover:bg-muted'
                )}
                tabIndex={-1}
              />
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Cliquez pour insérer un tableau avec ligne d’en-tête.
        </p>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Insert Spreadsheet (feuille de calcul) — Excel-like grid with row/col headers
// ============================================================================

function SpreadsheetInsertButton({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [hover, setHover] = React.useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const MAX = 6
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 flex-shrink-0 gap-1"
              tabIndex={-1}
            >
              <Sheet className="h-4 w-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Feuille</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insérer une feuille de calcul (style tableur)
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          {hover.r > 0 && hover.c > 0
            ? `${hover.r} lignes × ${hover.c} colonnes`
            : 'Choisissez la taille'}
        </p>
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${MAX}, 18px)` }}
          onMouseLeave={() => setHover({ r: 0, c: 0 })}
        >
          {Array.from({ length: MAX * MAX }, (_, i) => {
            const r = Math.floor(i / MAX) + 1
            const c = (i % MAX) + 1
            const isOn = r <= hover.r && c <= hover.c
            return (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHover({ r, c })}
                onClick={() => onInsert(r, c)}
                className={cn(
                  'w-[18px] h-[18px] rounded-sm border transition-colors',
                  isOn
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-muted/40 border-border hover:bg-muted'
                )}
                tabIndex={-1}
              />
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Feuille style Excel : en-têtes A, B, C… et numéros 1, 2, 3…
        </p>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Hyperlink — popover with URL input
// ============================================================================

function HyperlinkButton({ onInsert }: { onInsert: (url: string) => void }) {
  const [url, setUrl] = React.useState('')
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setUrl('') }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              tabIndex={-1}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insérer un lien hypertexte
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <Label className="text-xs font-medium">URL du lien</Label>
        <Input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemple.com"
          className="h-8 text-xs mt-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (url.trim()) {
                onInsert(url.trim())
                setOpen(false)
                setUrl('')
              }
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="w-full mt-2 h-8"
          disabled={!url.trim()}
          onClick={() => {
            onInsert(url.trim())
            setOpen(false)
            setUrl('')
          }}
        >
          Insérer le lien
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          Sélectionnez d’abord le texte à transformer en lien, sinon l’URL elle-même
          sera insérée comme texte cliquable.
        </p>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Image — popover with URL input + alt text
// ============================================================================

function ImageButton({ onInsert }: { onInsert: (url: string, alt?: string) => void }) {
  const [url, setUrl] = React.useState('')
  const [alt, setAlt] = React.useState('')
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setUrl(''); setAlt('') } }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              tabIndex={-1}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Insérer une image (URL)
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <Label className="text-xs font-medium">URL de l’image</Label>
        <Input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://exemple.com/image.png"
          className="h-8 text-xs mt-1"
        />
        <Label className="text-xs font-medium mt-2 block">Texte alternatif</Label>
        <Input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Description de l’image"
          className="h-8 text-xs mt-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (url.trim()) {
                onInsert(url.trim(), alt.trim())
                setOpen(false)
                setUrl(''); setAlt('')
              }
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          className="w-full mt-2 h-8"
          disabled={!url.trim()}
          onClick={() => {
            onInsert(url.trim(), alt.trim())
            setOpen(false)
            setUrl(''); setAlt('')
          }}
        >
          Insérer l’image
        </Button>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Special character — popover with a grid of common academic characters
// ============================================================================

function SpecialCharButton({ onInsert }: { onInsert: (ch: string) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              tabIndex={-1}
            >
              <Sigma className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Caractères spéciaux
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Caractères spéciaux
        </p>
        <div className="grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
          {SPECIAL_CHARS.map((ch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onInsert(ch)
                setOpen(false)
              }}
              className="w-7 h-7 rounded-sm border border-border hover:bg-primary hover:text-primary-foreground transition-colors text-[13px] font-medium"
              tabIndex={-1}
              title={ch}
            >
              {ch}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Line spacing — dropdown with preset values (Simple / 1.15 / 1.5 / Double…)
// ============================================================================

function LineSpacingButton({ onApply }: { onApply: (v: string) => void }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 flex-shrink-0 gap-1"
              tabIndex={-1}
            >
              <AlignVerticalJustifyCenter className="h-4 w-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Interligne</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Interligne du paragraphe
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {LINE_SPACINGS.map((ls) => (
          <DropdownMenuItem key={ls.value} onClick={() => onApply(ls.value)}>
            <span className="font-mono text-xs mr-2 w-10">{ls.value}</span>
            <span className="text-xs">{ls.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ============================================================================
// Borders — popover with border style presets applied to current block
// ============================================================================

function BordersButton({ onApply }: { onApply: (preset: { label: string; value: string | null }) => void }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 flex-shrink-0 gap-1"
              tabIndex={-1}
            >
              <TableProperties className="h-4 w-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Bordures</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Bordures du paragraphe
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Bordures et encadrements
        </p>
        <div className="grid grid-cols-3 gap-1">
          {BORDER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onApply(preset)}
              className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-md border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
              tabIndex={-1}
              title={preset.label}
            >
              <span className="text-base leading-none">{preset.icon}</span>
              <span className="text-[9px] font-medium leading-none">{preset.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          Applique une bordure au paragraphe courant (placez le curseur dedans).
        </p>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Paragraph background (trames) — popover with color palette
// ============================================================================

function ParagraphBackgroundButton({ onApply }: { onApply: (c: string) => void }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0 relative"
              tabIndex={-1}
            >
              <PaintBucket className="h-4 w-4" />
              <span
                className="absolute bottom-0.5 left-1 right-1 h-1 rounded-full"
                style={{ backgroundColor: '#a16207' }}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Trame de fond du paragraphe
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Couleur de fond du paragraphe
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {SHADE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onApply(c)}
              className={cn(
                'w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform',
                c === 'transparent' && 'relative'
              )}
              style={c === 'transparent' ? undefined : { backgroundColor: c }}
              title={c === 'transparent' ? 'Aucun fond' : c}
              tabIndex={-1}
            >
              {c === 'transparent' && (
                <span className="absolute inset-0 flex items-center justify-center text-red-500 text-base font-bold">
                  ✕
                </span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Find & Replace — popover with find/replace inputs + actions
// ============================================================================

function FindReplaceButton({
  findState,
  onFind,
  onReplace,
}: {
  findState: { query: string; replacement: string; count: number; current: number }
  onFind: (q: string) => void
  onReplace: (q: string, r: string, all?: boolean) => void
}) {
  const [query, setQuery] = React.useState(findState.query)
  const [replacement, setReplacement] = React.useState(findState.replacement)
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 flex-shrink-0 gap-1"
              tabIndex={-1}
            >
              <Search className="h-4 w-4" />
              <span className="text-[11px] font-medium hidden sm:inline">Rechercher</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Rechercher / Remplacer (Ctrl+F)
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div>
            <Label className="text-[11px] font-medium">Rechercher</Label>
            <div className="flex gap-1 mt-1">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Texte à rechercher…"
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onFind(query)
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={!query.trim()}
                onClick={() => onFind(query)}
                title="Rechercher le suivant"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </div>
            {findState.count > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Occurrence {findState.current} / {findState.count}
              </p>
            )}
          </div>
          <div>
            <Label className="text-[11px] font-medium">Remplacer par</Label>
            <div className="flex gap-1 mt-1">
              <Input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="Texte de remplacement…"
                className="h-8 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onReplace(query, replacement, false)
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-2"
                disabled={!query.trim()}
                onClick={() => onReplace(query, replacement, false)}
                title="Remplacer l’occurrence courante"
              >
                <Replace className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full h-8"
            disabled={!query.trim()}
            onClick={() => onReplace(query, replacement, true)}
          >
            Tout remplacer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// Utils
// ============================================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function appendHtml(el: HTMLElement, html: string) {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  el.appendChild(template.content.cloneNode(true))
}

// Tiny inline notifier — we don't want to import sonner here (kept the editor
// dependency-free of store/UI state). The parent component can override this
// by patching the function if needed.
function toast_editor(msg: string) {
  if (typeof window !== 'undefined') {
    // Best-effort: log + brief visual cue via the active editor's parent.
    // The EditorView (workspace.tsx) shows the actual toast via sonner when
    // the user clicks a button. This is a fallback for selection-required actions.
    // eslint-disable-next-line no-console
    console.info('[A4Editor]', msg)
  }
}
