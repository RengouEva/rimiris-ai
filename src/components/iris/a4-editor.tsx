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
            onSelectAll={selectAllInEditor}
            onClearSelection={clearSelection}
            watermark={watermark}
            onWatermarkChange={setWatermark}
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
          key={i}
          className="a4-page-marker"
          style={{
            top: `calc(${(i + 1) * 297}mm - 18mm)`,
          }}
        >
          — {i + 1} —
        </span>
      ))}
    </div>
  )
})

// ============================================================================
// Toolbar — 2 rows, all visible, no scroll.
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
  onSelectAll: () => void
  onClearSelection: () => void
  watermark: { enabled: boolean; text: string; opacity: number; angle: number }
  onWatermarkChange: (w: { enabled: boolean; text: string; opacity: number; angle: number }) => void
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
    onTextColor, onHighlight,
    onSelectAll, onClearSelection,
    watermark, onWatermarkChange,
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

          {/* Text color + Highlight */}
          <TextColorButton onColor={onTextColor} />
          <HighlightButton onColor={onHighlight} />

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

          {/* Watermark (filigrane) */}
          <WatermarkButton watermark={watermark} onChange={onWatermarkChange} />

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
// Utils
// ============================================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
