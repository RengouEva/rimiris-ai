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
  FileDown,
} from 'lucide-react'
import { useIrisStore, type Section, type SectionStatus, htmlToPlainText } from '@/store/iris-store'
import { AGENTS } from '@/lib/iris/agents'
import { A4Editor, type A4EditorHandle } from '@/components/iris/a4-editor'
import { SectionWorkflowPanel } from '@/components/iris/section-workflow-panel'
import { DraftAllButton } from '@/components/iris/draft-all-button'
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
  interview: { label: 'Entretien', color: 'text-violet-500', dot: 'bg-violet-500' },
  validated: { label: 'Validé', color: 'text-cyan-500', dot: 'bg-cyan-500' },
  in_progress: { label: 'En cours', color: 'text-amber-500', dot: 'bg-amber-500' },
  draft: { label: 'Brouillon', color: 'text-blue-500', dot: 'bg-blue-500' },
  humanized: { label: 'Humanisé', color: 'text-fuchsia-500', dot: 'bg-fuchsia-500' },
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
    themeUnderstanding,
    problemContext,
  } = useIrisStore()

  const editorRef = React.useRef<A4EditorHandle>(null)
  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0] || null

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const completedCount = sections.filter((s) => s.status === 'completed').length

  // Bridge: WorkflowPanel -> A4Editor
  // - insertDraft: append at cursor (used for first draft generation)
  // - replaceDraft: replace entire content (used after humanization, to avoid stacking)
  const handleInsertDraft = React.useCallback((html: string) => {
    editorRef.current?.insertHtml(html)
  }, [])
  const handleReplaceDraft = React.useCallback((html: string) => {
    editorRef.current?.replaceHtml(html)
  }, [])

  // If the project is initialized but theme understanding or problem context
  // is missing, redirect the student to finish the onboarding first.
  React.useEffect(() => {
    if (
      project &&
      sections.length > 0 &&
      (!themeUnderstanding?.validated || !problemContext?.selected)
    ) {
      setView('onboarding')
    }
  }, [project, sections.length, themeUnderstanding, problemContext, setView])

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
                onOpenAI={() => {
                  // Sélectionne la section ET ouvre le panel IA pour elle
                  setActiveSection(section.id)
                  setAIPanel(true)
                }}
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
          <DraftAllButton compact />
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
            onExport={() => setView('export')}
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

      {/* AI Workflow Panel — slides in from the right */}
      <AnimatePresence>
        {aiPanelOpen && activeSection && (
          <SectionWorkflowPanel
            section={activeSection}
            onClose={() => {
              setAIPanel(false)
              setBlockedMode(false)
            }}
            onInsertDraft={handleInsertDraft}
            onReplaceDraft={handleReplaceDraft}
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
  onOpenAI,
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
  onOpenAI: () => void
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

        {/* Bouton IA — ouvre le workflow de section (rédaction / humanisation / validation).
            Apparaît toujours, se met en évidence au survol.
            C'est le seul point d'entrée pour "Rediger avec IA" sur cette section. */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenAI()
          }}
          title="Rédiger cette section avec IRIS"
          className={cn(
            'flex-shrink-0 p-1.5 rounded-md transition-all',
            active
              ? 'iris-gradient text-white shadow-sm'
              : 'opacity-60 group-hover:opacity-100 text-primary hover:bg-primary/10'
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>

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
  onExport,
}: {
  section: Section
  project: any
  editorRef: React.RefObject<A4EditorHandle | null>
  onUpdateContent: (content: string) => void
  onOpenAI: () => void
  onOpenBlocked: () => void
  onExport: () => void
}) {
  const [showAIHint, setShowAIHint] = React.useState(false)
  // Real page count, measured from the editor's content height
  const [pageCount, setPageCount] = React.useState<number>(1)

  const isEmpty = section.wordCount === 0

  // Show AI hint after some writing
  React.useEffect(() => {
    if (section.wordCount > 50 && section.wordCount < 200 && !section.messages.length) {
      setShowAIHint(true)
    } else {
      setShowAIHint(false)
    }
  }, [section.wordCount, section.messages.length])

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
            variant="outline"
            onClick={onOpenBlocked}
            className="rounded-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
          >
            <HelpCircle className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Bloqué ?</span>
          </Button>
          {/* Exporter — remplace "Imprimer" et le bouton "IRIS".
              Stylé comme le bouton gradient précédent, mène à la page Export. */}
          <Button
            size="sm"
            onClick={onExport}
            className="rounded-full iris-gradient text-white"
            title="Exporter le mémoire (PDF, Word, HTML…)"
          >
            <FileDown className="h-3.5 w-3.5 mr-1" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
        </div>
      </div>

      {/* Empty section CTA — IRIS rédige */}
      <AnimatePresence>
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-b border-border bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 px-6 py-6">
              <div className="max-w-2xl mx-auto text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-background/80 text-primary text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Section vide
                </div>
                <h3 className="text-lg sm:text-xl font-bold">
                  IRIS peut rédiger cette section avec vous
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cliquez sur l'icône <Sparkles className="inline h-3 w-3" /> à côté du titre de la section
                  (à gauche) pour lancer la rédaction. Par défaut, vous pouvez aussi écrire librement ci-dessous.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <Button
                    size="lg"
                    onClick={onOpenAI}
                    className="rounded-full iris-gradient text-white"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    IRIS rédige cette section
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={onOpenBlocked}
                    className="rounded-full text-muted-foreground"
                  >
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    Je préfère écrire moi-même
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* A4 Editor — the white page */}
      <A4Editor
        ref={editorRef}
        value={section.content}
        onChange={onUpdateContent}
        onPageCountChange={setPageCount}
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
// Utils
// ============================================================================

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'à l\'instant'
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`
  return `il y a ${Math.floor(diff / 86_400_000)} j`
}
