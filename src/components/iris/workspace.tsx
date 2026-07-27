'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  Edit3,
  MoreVertical,
  GripVertical,
  FileText,
  Library,
  Sparkles,
  X,
  Send,
  Loader2,
  Brain,
  HelpCircle,
  ArrowLeft,
  ListTree,
  PenLine,
  Wand2,
  FilePlus,
  RefreshCw,
  Expand,
  ListTree as ListTreeIcon,
  Check,
  Printer,
} from 'lucide-react'
import { useIrisStore, type Section, type SectionStatus, htmlToPlainText } from '@/store/iris-store'
import { AGENTS, getAgentForChapter } from '@/lib/iris/agents'
import { A4Editor, type A4EditorHandle } from '@/components/iris/a4-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<SectionStatus, { label: string; color: string; dot: string }> = {
  not_started: { label: 'Vide', color: 'text-muted-foreground', dot: 'bg-muted-foreground/30' },
  in_progress: { label: 'En cours', color: 'text-amber-500', dot: 'bg-amber-500' },
  draft: { label: 'Brouillon', color: 'text-blue-500', dot: 'bg-blue-500' },
  completed: { label: 'Terminé', color: 'text-emerald-500', dot: 'bg-emerald-500' },
}

export function Workspace() {
  const {
    project,
    sections,
    activeSectionId,
    setActiveSection,
    addSection,
    renameSection,
    deleteSection,
    duplicateSection,
    moveSection,
    updateSectionContent,
    setSectionStatus,
    importTemplate,
    aiPanelOpen,
    setAIPanel,
    setBlockedMode,
    setView,
  } = useIrisStore()

  const editorRef = React.useRef<A4EditorHandle>(null)
  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0] || null

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const completedCount = sections.filter((s) => s.status === 'completed').length

  // Bridge: AIPanel -> A4Editor (insert AI-generated draft HTML at cursor)
  const handleInsertDraft = React.useCallback((html: string) => {
    editorRef.current?.insertHtml(html)
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar with sections */}
      <aside className="w-72 border-r border-border bg-muted/20 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Mon mémoire
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <span>{sections.length} sections</span>
            <span>·</span>
            <span>{totalWords} mots</span>
            <span>·</span>
            <span className="text-emerald-500">{completedCount} terminées</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <AnimatePresence>
            {sections.map((section, idx) => (
              <SectionItem
                key={section.id}
                section={section}
                index={idx}
                total={sections.length}
                active={section.id === activeSection?.id}
                onSelect={() => setActiveSection(section.id)}
                onRename={(title) => renameSection(section.id, title)}
                onDelete={() => {
                  if (sections.length === 1) {
                    toast.error("Vous devez garder au moins une section.")
                    return
                  }
                  deleteSection(section.id)
                  toast.success("Section supprimée")
                }}
                onDuplicate={() => {
                  duplicateSection(section.id)
                  toast.success("Section dupliquée")
                }}
                onMoveUp={() => moveSection(section.id, 'up')}
                onMoveDown={() => moveSection(section.id, 'down')}
                onMarkCompleted={() =>
                  setSectionStatus(
                    section.id,
                    section.status === 'completed' ? 'draft' : 'completed'
                  )
                }
              />
            ))}
          </AnimatePresence>

          {sections.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground mb-3">
                Aucune section pour le moment.
              </p>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="p-2 border-t border-border space-y-1.5">
          <Button
            onClick={() => addSection()}
            variant="outline"
            size="sm"
            className="w-full justify-start rounded-lg"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle section
          </Button>
          <Button
            onClick={() => {
              importTemplate()
              toast.success('Template académique (15 chapitres) importé')
            }}
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-lg text-muted-foreground"
          >
            <Library className="h-4 w-4 mr-1.5" />
            Importer le template académique
          </Button>
        </div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeSection ? (
          <EditorView
            section={activeSection}
            project={project}
            editorRef={editorRef}
            onUpdateContent={(c) => updateSectionContent(activeSection.id, c)}
            onOpenAI={() => setAIPanel(true)}
            onOpenBlocked={() => {
              setBlockedMode(true)
              setAIPanel(true)
            }}
          />
        ) : (
          <EmptyState
            onNewSection={() => addSection()}
            onImportTemplate={() => {
              importTemplate()
              toast.success('Template académique importé')
            }}
          />
        )}
      </main>

      {/* AI Panel */}
      <AnimatePresence>
        {aiPanelOpen && activeSection && (
          <AIPanel
            section={activeSection}
            project={project}
            allSections={sections.map((s) => ({ title: s.title, content: s.content }))}
            onClose={() => {
              setAIPanel(false)
              setBlockedMode(false)
            }}
            onInsertDraft={handleInsertDraft}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Section item in sidebar
// ============================================================================

function SectionItem({
  section,
  index,
  total,
  active,
  onSelect,
  onRename,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMarkCompleted,
}: {
  section: Section
  index: number
  total: number
  active: boolean
  onSelect: () => void
  onRename: (title: string) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMarkCompleted: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draftTitle, setDraftTitle] = React.useState(section.title)
  const status = STATUS_CONFIG[section.status]

  React.useEffect(() => {
    setDraftTitle(section.title)
  }, [section.title])

  function commitRename() {
    const t = draftTitle.trim()
    if (t && t !== section.title) {
      onRename(t)
    } else {
      setDraftTitle(section.title)
    }
    setEditing(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cn(
        'group relative rounded-lg transition-all',
        active ? 'bg-card shadow-sm border border-primary/30' : 'hover:bg-card/60 border border-transparent'
      )}
    >
      <div
        onClick={onSelect}
        className="w-full text-left p-2.5 flex items-start gap-2 cursor-pointer"
      >
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="text-[10px] font-mono text-muted-foreground">{index + 1}</span>
          <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setDraftTitle(section.title)
                  setEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none"
            />
          ) : (
            <p className="text-sm font-medium truncate">{section.title}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('text-[10px]', status.color)}>{status.label}</span>
            {section.wordCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{section.wordCount} mots</span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            >
              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Edit3 className="h-3.5 w-3.5 mr-2" />
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkCompleted}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              {section.status === 'completed' ? 'Marquer brouillon' : 'Marquer terminé'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onMoveUp}
              disabled={index === 0}
            >
              <ChevronUp className="h-3.5 w-3.5 mr-2" />
              Monter
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onMoveDown}
              disabled={index === total - 1}
            >
              <ChevronDown className="h-3.5 w-3.5 mr-2" />
              Descendre
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-500">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Editor view
// ============================================================================

function EditorView({
  section,
  project,
  editorRef,
  onUpdateContent,
  onOpenAI,
  onOpenBlocked,
}: {
  section: Section
  project: any
  editorRef: React.RefObject<A4EditorHandle | null>
  onUpdateContent: (content: string) => void
  onOpenAI: () => void
  onOpenBlocked: () => void
}) {
  const [showAIHint, setShowAIHint] = React.useState(false)

  // Show AI hint after some writing
  React.useEffect(() => {
    if (section.wordCount > 50 && section.wordCount < 200 && !section.messages.length) {
      setShowAIHint(true)
    } else {
      setShowAIHint(false)
    }
  }, [section.wordCount, section.messages.length])

  // Compute "page count" (A4 = ~500 words/page)
  const pageCount = Math.max(1, Math.ceil(section.wordCount / 500))

  function handlePrint() {
    window.print()
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Section header — toolbar above the A4 page */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className={STATUS_CONFIG[section.status].color}>
            <span className={cn('w-1.5 h-1.5 rounded-full mr-1', STATUS_CONFIG[section.status].dot)} />
            {STATUS_CONFIG[section.status].label}
          </Badge>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {section.wordCount} mots · {pageCount} page{pageCount > 1 ? 's' : ''} A4
            {section.lastEdited && ` · modifié ${timeAgo(section.lastEdited)}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePrint}
            className="rounded-full text-muted-foreground"
            title="Imprimer / Exporter en PDF"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Imprimer</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenBlocked}
            className="rounded-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Bloqué ?</span>
          </Button>
          <Button
            size="sm"
            onClick={onOpenAI}
            className="rounded-full iris-gradient text-white"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            IRIS
          </Button>
        </div>
      </div>

      {/* A4 Editor — the white page */}
      <A4Editor
        ref={editorRef}
        value={section.content}
        onChange={onUpdateContent}
      />

      {/* AI hint as a floating bottom-right toast */}
      <AnimatePresence>
        {showAIHint && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4 max-w-xs p-3 rounded-xl border border-primary/30 bg-background shadow-lg z-20"
          >
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full iris-gradient flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium mb-1">Envie d'un retour ?</p>
                <p className="text-[11px] text-muted-foreground mb-2">
                  IRIS peut relire votre brouillon et proposer des améliorations.
                </p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={onOpenAI} className="h-7 text-xs">
                    Demander un retour
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAIHint(false)}
                    className="h-7 text-xs"
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({
  onNewSection,
  onImportTemplate,
}: {
  onNewSection: () => void
  onImportTemplate: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl iris-gradient flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-2">Construisez votre mémoire</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Créez une première section, ou importez le template académique complet
          (15 chapitres classiques) que vous pourrez modifier librement.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={onNewSection} className="iris-gradient text-white rounded-full">
            <Plus className="h-4 w-4 mr-1.5" />
            Créer une section
          </Button>
          <Button onClick={onImportTemplate} variant="outline" className="rounded-full">
            <Library className="h-4 w-4 mr-1.5" />
            Template académique
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// AI Panel (sliding right)
// ============================================================================

function AIPanel({
  section,
  project,
  allSections,
  onClose,
  onInsertDraft,
}: {
  section: Section
  project: any
  allSections: { title: string; content: string }[]
  onClose: () => void
  onInsertDraft: (html: string) => void
}) {
  const { addMessage, blockedMode, setBlockedMode } = useIrisStore()
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [draftLoading, setDraftLoading] = React.useState(false)
  const [draftHtml, setDraftHtml] = React.useState<string | null>(null)
  const [draftMode, setDraftMode] = React.useState<'generate' | 'rewrite' | 'expand' | 'structure'>('generate')
  const [draftInstruction, setDraftInstruction] = React.useState('')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [section.messages.length, loading])

  // Reset draft preview when switching sections
  React.useEffect(() => {
    setDraftHtml(null)
    setDraftInstruction('')
  }, [section.id])

  async function send(text: string) {
    if (!text.trim() || loading) return

    addMessage(section.id, { role: 'user', content: text.trim() })
    setInput('')
    setLoading(true)

    try {
      const history = section.messages
        .filter((m) => m.role !== 'system')
        .slice(-6)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: section.title,
          sectionContent: htmlToPlainText(section.content),
          templateRef: section.templateRef,
          project,
          allSections: allSections.map((s) => ({ title: s.title, content: htmlToPlainText(s.content) })),
          history,
          userMessage: text.trim(),
          blockedMode,
        }),
      })
      const data = await res.json()

      addMessage(section.id, {
        role: 'assistant',
        content: data.reply || '...',
        agent: data.agent?.id,
      })

      if (blockedMode) setBlockedMode(false)
    } catch {
      addMessage(section.id, {
        role: 'assistant',
        content: "Erreur de communication. Reformulez votre demande.",
      })
    } finally {
      setLoading(false)
    }
  }

  async function generateDraft() {
    if (draftLoading) return
    setDraftLoading(true)
    setDraftHtml(null)
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: section.title,
          sectionContent: htmlToPlainText(section.content),
          templateRef: section.templateRef,
          project,
          allSections: allSections.map((s) => ({
            title: s.title,
            content: htmlToPlainText(s.content),
          })),
          userInstruction: draftInstruction.trim() || 'Génère un brouillon structuré pour cette section.',
          mode: draftMode,
        }),
      })
      const data = await res.json()
      setDraftHtml(data.html || '<p><em>Erreur de génération.</em></p>')
    } catch {
      setDraftHtml('<p><em>Erreur réseau. Réessayez.</em></p>')
    } finally {
      setDraftLoading(false)
    }
  }

  function acceptDraft() {
    if (!draftHtml) return
    onInsertDraft(draftHtml)
    toast.success('Brouillon inséré dans l\'éditeur — modifiez-le librement.')
    setDraftHtml(null)
    setDraftInstruction('')
  }

  function dismissDraft() {
    setDraftHtml(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send(input)
    }
  }

  // Determine agent
  const agent = React.useMemo(() => {
    if (section.templateRef) {
      return getAgentForChapter(section.templateRef)
    }
    return AGENTS[0] // Pr. IRIS by default
  }, [section.templateRef])

  const suggestions = blockedMode
    ? [
        "Je ne sais pas par où commencer",
        "Je n'arrive pas à formuler cette partie",
        "Aidez-moi à structurer mes idées",
      ]
    : [
        "Relis mon brouillon et donne-moi 3 conseils",
        "Qu'est-ce qui manque à cette section ?",
        "Aide-moi à formuler une phrase d'introduction",
        "Comment améliorer la cohérence avec le reste ?",
      ]

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full sm:w-[28rem] border-l border-border bg-card flex flex-col flex-shrink-0 absolute right-0 top-0 bottom-0 sm:relative z-30"
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-full iris-gradient flex items-center justify-center flex-shrink-0">
          {blockedMode ? (
            <Brain className="h-4 w-4 text-white" />
          ) : (
            <Sparkles className="h-4 w-4 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {blockedMode ? 'Mode débloqué' : agent.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {blockedMode ? 'IRIS vous aide à repartir' : agent.role}
          </p>
        </div>
        {blockedMode && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBlockedMode(false)}
            className="text-xs h-7"
          >
            Retour normal
          </Button>
        )}
        <button onClick={onClose} className="p-1.5 rounded hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Context banner */}
      <div className="px-3 py-2 bg-muted/40 border-b border-border">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
          Section en cours
        </p>
        <p className="text-xs font-medium truncate">{section.title}</p>
      </div>

      {/* ==================================================================== */}
      {/* DRAFT GENERATOR — quick-access panel at the top                      */}
      {/* ==================================================================== */}
      {!blockedMode && (
        <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold">Générer un brouillon formaté</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            IRIS rédige un brouillon déjà mis en forme (titres, paragraphes, listes). Vous l'insérez
            dans l'éditeur A4 puis vous le modifiez librement.
          </p>

          {/* Mode selector */}
          <div className="grid grid-cols-4 gap-1">
            <DraftModeButton
              active={draftMode === 'generate'}
              onClick={() => setDraftMode('generate')}
              icon={<FilePlus className="h-3.5 w-3.5" />}
              label="Générer"
            />
            <DraftModeButton
              active={draftMode === 'rewrite'}
              onClick={() => setDraftMode('rewrite')}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="Réécrire"
            />
            <DraftModeButton
              active={draftMode === 'expand'}
              onClick={() => setDraftMode('expand')}
              icon={<Expand className="h-3.5 w-3.5" />}
              label="Développer"
            />
            <DraftModeButton
              active={draftMode === 'structure'}
              onClick={() => setDraftMode('structure')}
              icon={<ListTreeIcon className="h-3.5 w-3.5" />}
              label="Plan"
            />
          </div>

          {/* Optional instruction */}
          <Textarea
            value={draftInstruction}
            onChange={(e) => setDraftInstruction(e.target.value)}
            placeholder="Instructions optionnelles : « insistez sur la méthodologie quantitative », « ton neutre, 500 mots », etc."
            className="resize-none min-h-[44px] max-h-24 text-xs"
            disabled={draftLoading}
          />

          <div className="flex items-center gap-1.5">
            <Button
              onClick={generateDraft}
              disabled={draftLoading}
              size="sm"
              className="rounded-full iris-gradient text-white flex-1"
            >
              {draftLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Génération…
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  Générer le brouillon
                </>
              )}
            </Button>
          </div>

          {/* Draft preview */}
          <AnimatePresence>
            {draftHtml && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="rounded-lg border border-primary/30 overflow-hidden">
                  <div className="px-2 py-1 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Aperçu du brouillon
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {draftMode === 'structure' ? 'Plan' : 'HTML formaté'}
                    </span>
                  </div>
                  <div
                    className="a4-page prose-iris max-h-72 overflow-y-auto text-black"
                    style={{
                      width: 'auto',
                      minHeight: 'auto',
                      padding: '12pt 14pt',
                      boxShadow: 'none',
                      borderRadius: '0 0 8px 8px',
                      fontSize: '10pt',
                      background: '#fff',
                    }}
                    dangerouslySetInnerHTML={{ __html: draftHtml }}
                  />
                </div>
                <div className="flex gap-1.5">
                  <Button
                    onClick={acceptDraft}
                    size="sm"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Insérer dans l'éditeur
                  </Button>
                  <Button
                    onClick={dismissDraft}
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                  >
                    Ignorer
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {section.messages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              {blockedMode
                ? "Décrivez votre blocage, ou choisissez une suggestion."
                : `Posez votre question à ${agent.name}, ou choisissez une suggestion.`}
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => send(s)}
                  className="w-full text-left text-xs p-2.5 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-primary mr-1.5">→</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          section.messages.map((msg) => {
            const isUser = msg.role === 'user'
            const msgAgent = msg.agent ? AGENTS.find((a) => a.id === msg.agent) : null
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
              >
                {msgAgent && !isUser && (
                  <span className="text-[10px] font-semibold text-primary px-1">
                    {msgAgent.name}
                  </span>
                )}
                <div
                  className={cn(
                    'rounded-2xl p-3 text-sm max-w-[90%]',
                    isUser
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            )
          })
        )}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full iris-gradient flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm p-3">
              <div className="flex items-center gap-1">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={blockedMode ? "Décrivez votre blocage..." : "Votre question..."}
          className="resize-none min-h-16 max-h-32 text-sm"
          disabled={loading}
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Cmd/Ctrl+Entrée</span>
          <Button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            size="sm"
            className="rounded-full iris-gradient text-white"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                Envoyer
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.aside>
  )
}

// ============================================================================
// DraftModeButton — small selectable button for the draft mode
// ============================================================================

function DraftModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-1 py-1.5 rounded-md border text-[10px] font-medium transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ============================================================================
// Utils
// ============================================================================

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'à l\'instant'
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`
  return `il y a ${Math.floor(diff / 86_400_000)} j`
}
