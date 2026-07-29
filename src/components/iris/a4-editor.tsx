'use client'

import * as React from 'react'
import {
  Bold,
  Italic,
  Underline,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================================================
// A4Editor — WYSIWYG editor that mimics an A4 page
// - 210mm × 297mm aspect ratio
// - Standard academic margins (25mm)
// - Justified serif body text, sans-serif headings
// - Toolbar: bold, italic, underline, H1/H2/H3, lists, quote, clear formatting
// - Persists HTML to the store
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
// We use this to compute page count from scrollHeight.
const A4_PAGE_HEIGHT_PX = 1122.52

export const A4Editor = React.forwardRef<A4EditorHandle, A4EditorProps>(
  function A4Editor({ value, onChange, editable = true, showToolbar = true, onPageCountChange }, ref) {
    const editorRef = React.useRef<HTMLDivElement>(null)
    const lastValueRef = React.useRef<string>(value)
    const lastPageCountRef = React.useRef<number>(1)
    // Local state for re-rendering page markers when page count changes
    const [pageCountState, setPageCountState] = React.useState<number>(1)

    // ----------------------------------------------------------------------
    // Pagination : measure content height, derive page count, notify parent
    // ----------------------------------------------------------------------
    function recomputePageCount() {
      const el = editorRef.current
      if (!el) return
      // Total content height = scrollHeight (includes padding)
      // A4 page = 297mm. We use ceil to count a partially-filled page as full.
      const px = el.scrollHeight
      const count = Math.max(1, Math.ceil(px / A4_PAGE_HEIGHT_PX))
      if (count !== lastPageCountRef.current) {
        lastPageCountRef.current = count
        setPageCountState(count)
        onPageCountChange?.(count)
      }
    }

    // Expose imperative API
    React.useImperativeHandle(ref, () => ({
      insertHtml: (html: string) => {
        const el = editorRef.current
        if (!el) return
        el.focus()
        // Insert at cursor; if no selection, append to end
        const sel = window.getSelection()
        const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed
        if (hasSelection) {
          const range = sel.getRangeAt(0)
          // Only insert if inside the editor
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
        // Trigger change
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
        // Recompute page count synchronously after a replace
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
      // Also recompute on window resize (page zoom, responsive changes)
      const onResize = () => recomputePageCount()
      window.addEventListener('resize', onResize)
      // Use ResizeObserver to catch content growth from typing
      const el = editorRef.current
      let ro: ResizeObserver | null = null
      if (el && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => recomputePageCount())
        ro.observe(el)
      }
      // Initial computation after mount
      requestAnimationFrame(() => recomputePageCount())
      return () => {
        window.removeEventListener('resize', onResize)
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
    }

    function exec(command: string, val?: string) {
      editorRef.current?.focus()
      document.execCommand(command, false, val)
      handleInput()
    }

    function setBlock(tag: 'h1' | 'h2' | 'h3' | 'p' | 'blockquote') {
      editorRef.current?.focus()
      // Use formatBlock; browsers require <tag> form
      try {
        document.execCommand('formatBlock', false, `<${tag}>`)
      } catch {
        // fallback noop
      }
      handleInput()
    }

    function clearFormatting() {
      editorRef.current?.focus()
      // Remove block formatting first
      document.execCommand('formatBlock', false, '<p>')
      document.execCommand('removeFormat')
      handleInput()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      // Ctrl/Cmd+B/I/U shortcuts
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
      }
    }

    // Prevent pasting rich content from Word/pages — keep clean HTML
    function handlePaste(e: React.ClipboardEvent) {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      // Convert plain text to paragraphs
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
            onBold={() => exec('bold')}
            onItalic={() => exec('italic')}
            onUnderline={() => exec('underline')}
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
          />
        </div>
      </div>
    )
  }
)

// ============================================================================
// A4 page surface — the white sheet
// Now applies the `a4-paginated` class so the CSS background-image renders
// page boundaries every 297mm (visual auto page-break indicator).
// ============================================================================

const A4Page = React.forwardRef<
  HTMLDivElement,
  {
    editable: boolean
    onInput: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onPaste: (e: React.ClipboardEvent) => void
    className?: string
    pageCount?: number
  }
>(function A4Page({ editable, onInput, onKeyDown, onPaste, className, pageCount = 1 }, ref) {
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
// Toolbar
// ============================================================================

function Toolbar({
  onBold,
  onItalic,
  onUnderline,
  onH1,
  onH2,
  onH3,
  onP,
  onUL,
  onOL,
  onQuote,
  onUndo,
  onRedo,
  onClear,
}: {
  onBold: () => void
  onItalic: () => void
  onUnderline: () => void
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
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="sticky top-0 z-10 flex items-center gap-1 px-2 py-1.5 border-b border-border bg-background/95 backdrop-blur-sm flex-wrap">
        <ToolbarButton onClick={onUndo} label="Annuler (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onRedo} label="Rétablir (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={onP} label="Paragraphe">
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onH1} label="Titre 1">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onH2} label="Titre 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onH3} label="Titre 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={onBold} label="Gras (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onItalic} label="Italique (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onUnderline} label="Souligné (Ctrl+U)">
          <Underline className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={onUL} label="Liste à puces">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onOL} label="Liste numérotée">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={onQuote} label="Citation">
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={onClear} label="Effacer la mise en forme">
          <Eraser className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto pr-2 hidden sm:flex items-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Format A4 · 25 mm
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}

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
          className="h-8 w-8 p-0"
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

function Divider() {
  return <span className="w-px h-6 bg-border mx-1" />
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
