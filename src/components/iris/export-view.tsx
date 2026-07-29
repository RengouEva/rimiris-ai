'use client'

import * as React from 'react'
import {
  FileText,
  FileType2,
  FileSpreadsheet,
  Download,
  Eye,
  Loader2,
  CheckCircle2,
  Printer,
  FileCode2,
  FileDown,
  Settings2,
  Layers,
  Hash,
  Calendar,
  User,
  BookOpen,
  ChevronLeft,
  Type,
  Palette,
  FileSignature,
  CircleDot,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PanelLeft,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ============================================================================
// ExportView — page indépendante avec sa propre sidebar
// Organisation :
//   - Sidebar gauche : navigation entre les sections d'export
//     (Vue d'ensemble, Aperçu, PDF, Word, HTML, Markdown, Impression, Paramètres)
//   - Zone principale : panneau correspondant à la section sélectionnée
// ============================================================================

type ExportSection =
  | 'overview'
  | 'preview'
  | 'pdf'
  | 'word'
  | 'html'
  | 'markdown'
  | 'print'
  | 'settings'

const SIDEBAR_ITEMS: {
  id: ExportSection
  label: string
  icon: any
  desc: string
  group: 'formats' | 'tools' | 'config'
}[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Layers,     desc: 'Stats et contenu du mémoire', group: 'tools' },
  { id: 'preview',  label: 'Aperçu',         icon: Eye,         desc: 'Aperçu A4 paginé avec zoom', group: 'tools' },
  { id: 'pdf',      label: 'PDF',            icon: FileType2,   desc: 'Format portable pour impression', group: 'formats' },
  { id: 'word',     label: 'Word',           icon: FileText,    desc: 'Document Microsoft Word éditable', group: 'formats' },
  { id: 'html',     label: 'HTML',           icon: FileCode2,   desc: 'Page web autonome', group: 'formats' },
  { id: 'markdown', label: 'Markdown',       icon: Hash,        desc: 'Texte structuré léger', group: 'formats' },
  { id: 'print',    label: 'Impression',     icon: Printer,     desc: 'Imprimer ou sauvegarder en PDF', group: 'tools' },
  { id: 'settings', label: 'Paramètres',     icon: Settings2,   desc: 'Format, marges, police', group: 'config' },
]

export function ExportView() {
  const { project, sections, setView } = useIrisStore()
  const [activeSection, setActiveSection] = React.useState<ExportSection>('overview')
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const draftedCount = sections.filter((s) => s.wordCount > 100).length
  const completedCount = sections.filter((s) => s.status === 'completed').length

  // Sidebar content — shared between desktop aside and mobile Sheet
  const sidebarContent = (
    <ExportSidebarContent
      sectionsCount={sections.length}
      totalWords={totalWords}
      draftedCount={draftedCount}
      completedCount={completedCount}
      activeSection={activeSection}
      onSelectSection={(id) => {
        setActiveSection(id)
        setMobileSidebarOpen(false)
      }}
      onBackToMemoire={() => {
        setView('workspace')
        setMobileSidebarOpen(false)
      }}
    />
  )

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex w-64 border-r border-border bg-muted/20 flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 max-w-[85vw]">
          <SheetTitle className="sr-only">Menu d'export</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* ====== Zone principale ====== */}
      <main className="flex-1 overflow-y-auto bg-background min-w-0">
        {/* Mobile toolbar — section switcher trigger */}
        <div className="md:hidden sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex-shrink-0"
          >
            <PanelLeft className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Menu</span>
          </Button>
          <span className="text-sm font-medium truncate flex-1">
            {SIDEBAR_ITEMS.find((i) => i.id === activeSection)?.label || 'Exporter'}
          </span>
        </div>

        {/* Aperçu plein écran — pagination A4 avec zoom */}
        {activeSection === 'preview' && (
          <PreviewPanel project={project} sections={sections} />
        )}

        {/* Les autres panneaux dans un conteneur centré max-w-4xl */}
        {activeSection !== 'preview' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {activeSection === 'overview' && (
              <OverviewPanel
                project={project}
                sections={sections}
                totalWords={totalWords}
                draftedCount={draftedCount}
                onSelectSection={setActiveSection}
              />
            )}
            {activeSection === 'pdf' && (
              <FormatPanel
                format="pdf"
                project={project}
                sections={sections}
                draftedCount={draftedCount}
              />
            )}
            {activeSection === 'word' && (
              <FormatPanel
                format="word"
                project={project}
                sections={sections}
                draftedCount={draftedCount}
              />
            )}
            {activeSection === 'html' && (
              <FormatPanel
                format="html"
                project={project}
                sections={sections}
                draftedCount={draftedCount}
              />
            )}
            {activeSection === 'markdown' && (
              <FormatPanel
                format="markdown"
                project={project}
                sections={sections}
                draftedCount={draftedCount}
              />
            )}
            {activeSection === 'print' && <PrintPanel project={project} sections={sections} />}
            {activeSection === 'settings' && <SettingsPanel project={project} />}
          </div>
        )}

        {/* ====== Rendu imprimable masqué ======
            Ce bloc est invisible à l'écran mais devient la seule chose visible
            quand l'utilisateur imprime (Ctrl+P ou bouton Imprimer).
            Il contient le mémoire complet au format A4 avec marges 25mm. */}
        <PrintableMemoire project={project} sections={sections} />
      </main>
    </div>
  )
}

// ============================================================================
// PrintableMemoire — rendu A4 caché, visible uniquement à l'impression
// ============================================================================

function PrintableMemoire({ project, sections }: { project: any; sections: any[] }) {
  return (
    <div className="printable-memoire hidden print:block">
      {/* Page de titre */}
      <div className="printable-title-page">
        <h1>{project.title || 'Mémoire sans titre'}</h1>
        <p className="subtitle">{project.university || ''}</p>
        <p>{project.faculty || ''}</p>
        <p>
          {project.level || ''}
          {project.filiere ? ` · ${project.filiere}` : ''}
        </p>
        <p className="norm">Norme : {project.norme || 'APA'}</p>
      </div>

      {/* Sections */}
      {sections.map((s, idx) => {
        if (!s.content || !s.content.trim()) return null
        return (
          <div key={s.id} className="printable-section">
            <h2>
              {idx + 1}. {s.title}
            </h2>
            <div dangerouslySetInnerHTML={{ __html: s.content }} />
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// PreviewPanel — Aperçu A4 paginé avec contrôle de zoom (défaut 100%)
// Affiche le mémoire tel qu'il sera exporté : page de titre + sections
// dans des "pages A4" visuelles, avec barre de zoom collée en haut.
// ============================================================================

function PreviewPanel({ project, sections }: { project: any; sections: any[] }) {
  // Zoom par défaut : 100%. L'utilisateur peut ajuster entre 50% et 200%.
  const [zoom, setZoom] = React.useState<number>(100)
  const drafted = sections.filter((s) => s.content && s.content.trim())

  function changeZoom(delta: number) {
    setZoom((z) => Math.min(200, Math.max(50, z + delta)))
  }

  function resetZoom() {
    setZoom(100)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barre de zoom — collée en haut, ne défile pas */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none truncate">
              Aperçu — {project.title || 'Mémoire sans titre'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
              {drafted.length} section{drafted.length > 1 ? 's' : ''} · {sections.reduce((sum, s) => sum + s.wordCount, 0)} mots
            </p>
          </div>
        </div>

        {/* Contrôles de zoom */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeZoom(-10)}
            disabled={zoom <= 50}
            className="h-8 w-8 p-0"
            title="Dézoomer"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={resetZoom}
            className="h-8 min-w-[60px] px-2 rounded-md border border-border bg-background text-xs font-medium tabular-nums hover:bg-muted transition-colors"
            title="Réinitialiser le zoom à 100%"
          >
            {zoom}%
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => changeZoom(10)}
            disabled={zoom >= 200}
            className="h-8 w-8 p-0"
            title="Zoomer"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          {/* Slider de zoom */}
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-24 accent-primary hidden sm:block"
            title={`Zoom : ${zoom}%`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(100)}
            className="h-8 px-2 hidden sm:flex"
            title="Réinitialiser"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Zone défilante contenant les pages A4 */}
      <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-8">
        {drafted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Eye className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-semibold text-base mb-1">Rien à afficher</p>
            <p className="text-sm text-muted-foreground">
              Aucune section n'a encore été rédigée. Retournez au mémoire pour
              commencer l'écriture, puis revenez ici pour voir l'aperçu.
            </p>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-6 mx-auto"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
            }}
          >
            {/* Page de titre */}
            <PreviewPage>
              <div className="flex flex-col items-center justify-center text-center py-16">
                <h1 className="font-bold text-3xl mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {project.title || 'Mémoire sans titre'}
                </h1>
                <p className="text-lg text-muted-foreground mb-1">
                  {project.university || ''}
                </p>
                <p className="text-base text-muted-foreground mb-1">
                  {project.faculty || ''}
                </p>
                <p className="text-base text-muted-foreground mb-6">
                  {project.level || ''}
                  {project.filiere ? ` · ${project.filiere}` : ''}
                </p>
                <p className="text-sm text-muted-foreground italic">
                  Norme : {project.norme || 'APA'}
                </p>
              </div>
            </PreviewPage>

            {/* Pages de contenu */}
            {drafted.map((s, idx) => (
              <PreviewPage key={s.id}>
                <h2
                  className="font-bold text-xl mb-3"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {idx + 1}. {s.title}
                </h2>
                <div
                  className="prose-iris text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: s.content }}
                />
              </PreviewPage>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Une "page A4" visuelle pour l'aperçu — 210×297mm, marges 25mm, fond blanc.
function PreviewPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white text-black shadow-xl flex-shrink-0"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '25mm 25mm 30mm 25mm',
        fontFamily: "'Times New Roman', Georgia, serif",
        fontSize: '12pt',
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Sidebar components
// ============================================================================

// Reusable sidebar content — used both in desktop aside and mobile Sheet
function ExportSidebarContent({
  sectionsCount,
  totalWords,
  draftedCount,
  completedCount,
  activeSection,
  onSelectSection,
  onBackToMemoire,
}: {
  sectionsCount: number
  totalWords: number
  draftedCount: number
  completedCount: number
  activeSection: ExportSection
  onSelectSection: (id: ExportSection) => void
  onBackToMemoire: () => void
}) {
  return (
    <>
      {/* Header de la sidebar */}
      <div className="p-4 border-b border-border">
        <button
          onClick={onBackToMemoire}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Retour au mémoire
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg iris-gradient flex items-center justify-center">
            <FileDown className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Exporter</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-none">
              {sectionsCount} sections · {totalWords} mots
            </p>
          </div>
        </div>
      </div>

      {/* Navigation par groupe */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        <SidebarGroup title="Formats">
          {SIDEBAR_ITEMS.filter((i) => i.group === 'formats').map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => onSelectSection(item.id)}
            />
          ))}
        </SidebarGroup>
        <SidebarGroup title="Outils">
          {SIDEBAR_ITEMS.filter((i) => i.group === 'tools').map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => onSelectSection(item.id)}
            />
          ))}
        </SidebarGroup>
        <SidebarGroup title="Configuration">
          {SIDEBAR_ITEMS.filter((i) => i.group === 'config').map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => onSelectSection(item.id)}
            />
          ))}
        </SidebarGroup>
      </nav>

      {/* Stats en bas */}
      <div className="p-3 border-t border-border space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Rédigées</span>
          <span className="font-semibold">{draftedCount}/{sectionsCount}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Terminées</span>
          <span className="font-semibold text-emerald-500">{completedCount}/{sectionsCount}</span>
        </div>
      </div>
    </>
  )
}

function SidebarGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function SidebarItem({
  item,
  active,
  onClick,
}: {
  item: { id: ExportSection; label: string; icon: any; desc: string }
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'hover:bg-card text-foreground/80'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-none">{item.label}</p>
        <p
          className={cn(
            'text-[10px] mt-0.5 leading-none truncate',
            active ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {item.desc}
        </p>
      </div>
    </button>
  )
}

// ============================================================================
// Overview panel — vue d'ensemble + sélection rapide
// ============================================================================

function OverviewPanel({
  project,
  sections,
  totalWords,
  draftedCount,
  onSelectSection,
}: {
  project: any
  sections: any[]
  totalWords: number
  draftedCount: number
  onSelectSection: (s: ExportSection) => void
}) {
  const formats = [
    { id: 'pdf' as const, name: 'PDF', icon: FileType2, color: 'red' },
    { id: 'word' as const, name: 'Word', icon: FileText, color: 'blue' },
    { id: 'html' as const, name: 'HTML', icon: FileCode2, color: 'orange' },
    { id: 'markdown' as const, name: 'Markdown', icon: Hash, color: 'gray' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Exporter votre mémoire</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Téléchargez votre mémoire dans le format exigé par votre établissement.
          Choisissez un format dans la sidebar à gauche, ou cliquez sur une carte ci-dessous
          pour un export rapide.
        </p>
      </div>

      {/* Project info card */}
      <Card>
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Mots rédigés" value={totalWords} icon={Type} />
          <Stat label="Sections rédigées" value={`${draftedCount}/${sections.length}`} icon={Layers} />
          <Stat label="Niveau" value={project.level || '—'} icon={BookOpen} />
          <Stat label="Norme" value={project.norme || 'APA'} icon={FileSignature} />
        </CardContent>
      </Card>

      {/* Quick format selection */}
      <div>
        <h2 className="text-base font-semibold mb-3">Formats disponibles</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {formats.map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.id}
                onClick={() => onSelectSection(f.id)}
                disabled={draftedCount === 0}
                className={cn(
                  'group rounded-xl border p-4 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed',
                  'border-border hover:border-primary/40 bg-card'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110',
                    f.color === 'red' && 'bg-red-500/10 text-red-600',
                    f.color === 'blue' && 'bg-blue-500/10 text-blue-600',
                    f.color === 'orange' && 'bg-orange-500/10 text-orange-600',
                    f.color === 'gray' && 'bg-gray-500/10 text-gray-600'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm">{f.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cliquer pour configurer</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sections list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Contenu du mémoire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune section pour le moment.
              </p>
            ) : (
              sections.map((s, idx) => {
                const hasContent = s.content.trim().length > 0
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold',
                          hasContent
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {hasContent ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.wordCount > 0 ? `${s.wordCount} mots` : 'Vide'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={hasContent ? 'default' : 'outline'} className="ml-2">
                      {hasContent ? 'Prêt' : 'Vide'}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Format panel — générique pour PDF / Word / HTML / Markdown
// ============================================================================

function FormatPanel({
  format,
  project,
  sections,
  draftedCount,
}: {
  format: 'pdf' | 'word' | 'html' | 'markdown'
  project: any
  sections: any[]
  draftedCount: number
}) {
  const [exporting, setExporting] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  // Zoom par défaut du dialog d'aperçu = 100%.
  const [previewZoom, setPreviewZoom] = React.useState<number>(100)
  const [options, setOptions] = React.useState({
    includeTitlePage: true,
    includeTableOfContents: false,
    includePageNumbers: true,
    embedCss: true,
  })

  const config = {
    pdf: {
      name: 'PDF',
      icon: FileType2,
      color: 'red',
      desc: 'Format portable pour impression et partage. Généré via le moteur d\'impression du navigateur.',
      ext: 'pdf',
      tips: [
        'Le PDF est généré via la fonction d\'impression de votre navigateur.',
        'Dans la boîte d\'impression, choisissez "Enregistrer en PDF" comme destination.',
        'Les marges A4 (25mm) et la pagination sont automatiquement appliquées.',
      ],
    },
    word: {
      name: 'Word',
      icon: FileText,
      color: 'blue',
      desc: 'Document Microsoft Word éditable (.doc). Compatible avec Word, LibreOffice et Google Docs.',
      ext: 'doc',
      tips: [
        'Le fichier .doc est un HTML que Word ouvre nativement comme un document éditable.',
        'Toutes les mises en forme (titres, gras, listes) sont conservées.',
        'Idéal pour remettre un brouillon à votre directeur de mémoire.',
      ],
    },
    html: {
      name: 'HTML',
      icon: FileCode2,
      color: 'orange',
      desc: 'Page web autonome avec CSS inclus. Ouvrable dans tout navigateur.',
      ext: 'html',
      tips: [
        'Le HTML inclut le CSS en ligne (aucun fichier externe nécessaire).',
        'Idéal pour publier en ligne ou partager par email.',
        'Le rendu visuel est identique à l\'aperçu dans Rimiris.',
      ],
    },
    markdown: {
      name: 'Markdown',
      icon: Hash,
      color: 'gray',
      desc: 'Texte structuré léger (.md). Compatible avec GitHub, Notion, Obsidian, etc.',
      ext: 'md',
      tips: [
        'Le Markdown préserve la structure (titres, listes, citations) sans formatage visuel.',
        'Idéal pour importer dans un autre outil d\'écriture.',
        'Le HTML des sections est converti en Markdown basique.',
      ],
    },
  }[format]

  async function handleExport() {
    if (draftedCount === 0) {
      toast.error('Aucune section rédigée à exporter.')
      return
    }
    setExporting(true)
    try {
      // Small delay for UX feedback
      await new Promise((r) => setTimeout(r, 600))

      let blob: Blob
      let filename: string

      if (format === 'pdf') {
        // PDF = ouvre la boîte d'impression du navigateur (l'utilisateur choisit "Enregistrer en PDF")
        toast.info('La boîte d\'impression va s\'ouvrir. Choisissez "Enregistrer en PDF".')
        setTimeout(() => window.print(), 500)
        setExporting(false)
        return
      } else if (format === 'word') {
        const html = buildWordHtml(project, sections, options)
        blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
        filename = `${slugify(project.title || 'memoire-iris')}.doc`
      } else if (format === 'html') {
        const html = buildStandaloneHtml(project, sections, options)
        blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        filename = `${slugify(project.title || 'memoire-iris')}.html`
      } else {
        // markdown
        const md = buildMarkdown(project, sections, options)
        blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
        filename = `${slugify(project.title || 'memoire-iris')}.md`
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Export ${config.name} généré`)
    } catch (e: any) {
      toast.error(`Erreur : ${e?.message || 'inconnue'}`)
    } finally {
      setExporting(false)
    }
  }

  const Icon = config.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            config.color === 'red' && 'bg-red-500/10 text-red-600',
            config.color === 'blue' && 'bg-blue-500/10 text-blue-600',
            config.color === 'orange' && 'bg-orange-500/10 text-orange-600',
            config.color === 'gray' && 'bg-gray-500/10 text-gray-600'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Export {config.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{config.desc}</p>
        </div>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CircleDot className="h-3.5 w-3.5 text-primary" />
            Bon à savoir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {config.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            Options d'export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <OptionRow
            label="Page de titre"
            desc="Inclure une page de garde avec le titre, l'université et le niveau"
            checked={options.includeTitlePage}
            onChange={(v) => setOptions((o) => ({ ...o, includeTitlePage: v }))}
          />
          <OptionRow
            label="Table des matières"
            desc="Générer une table des matières à partir des titres de sections"
            checked={options.includeTableOfContents}
            onChange={(v) => setOptions((o) => ({ ...o, includeTableOfContents: v }))}
          />
          <OptionRow
            label="Numérotation"
            desc="Afficher les numéros de page en bas de chaque page"
            checked={options.includePageNumbers}
            onChange={(v) => setOptions((o) => ({ ...o, includePageNumbers: v }))}
          />
          {format === 'html' && (
            <OptionRow
              label="CSS inclus"
              desc='Embarquer le CSS dans le HTML (sinon lien vers /globals.css)'
              checked={options.embedCss}
              onChange={(v) => setOptions((o) => ({ ...o, embedCss: v }))}
            />
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleExport}
          disabled={exporting || draftedCount === 0}
          className="iris-gradient text-white rounded-full flex-1 sm:flex-initial"
          size="lg"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Génération…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exporter en .{config.ext}
            </>
          )}
        </Button>

        <Dialog
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open)
            if (open) setPreviewZoom(100) // réinitialise le zoom à 100% à chaque ouverture
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="lg" className="rounded-full">
              <Eye className="h-4 w-4 mr-2" />
              Aperçu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 w-[95vw] sm:w-auto">
            <DialogHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
              <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-2 text-sm sm:text-base min-w-0">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Aperçu — {project.title || 'Mémoire sans titre'}</span>
                </span>
                {/* Mini-barre de zoom dans le dialog — défaut 100% */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom((z) => Math.max(50, z - 10))}
                    disabled={previewZoom <= 50}
                    className="h-7 w-7 p-0"
                    title="Dézoomer"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <button
                    onClick={() => setPreviewZoom(100)}
                    className="h-7 min-w-[52px] px-2 rounded-md border border-border bg-background text-[11px] font-medium tabular-nums hover:bg-muted"
                    title="Réinitialiser le zoom à 100%"
                  >
                    {previewZoom}%
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom((z) => Math.min(200, z + 10))}
                    disabled={previewZoom >= 200}
                    className="h-7 w-7 p-0"
                    title="Zoomer"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[75vh] px-6 py-4">
              <div
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease',
                }}
              >
                <PreviewContent project={project} sections={sections} />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {draftedCount === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Vous n'avez pas encore rédigé de section. Retournez au mémoire pour commencer.
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Print panel
// ============================================================================

function PrintPanel({ project, sections }: { project: any; sections: any[] }) {
  const [printing, setPrinting] = React.useState(false)
  const draftedCount = sections.filter((s) => s.wordCount > 100).length

  function handlePrint() {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 300)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Impression</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Imprimez directement votre mémoire ou enregistrez-le en PDF via la boîte d'impression
          de votre navigateur. Le format A4, les marges (25mm) et la pagination sont automatiquement
          appliqués grâce aux règles CSS d'impression.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Printer className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Impression native du navigateur</p>
              <p className="text-xs text-muted-foreground">
                Ctrl/Cmd + P — choisissez « Enregistrer en PDF » pour un fichier PDF.
              </p>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            disabled={printing || draftedCount === 0}
            className="w-full iris-gradient text-white rounded-full"
            size="lg"
          >
            {printing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ouverture de la boîte d'impression…
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer / Enregistrer en PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conseils d'impression</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Vérifiez que le format est bien A4 (210 × 297 mm) dans les paramètres d'impression.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Les marges par défaut (25mm) sont déjà incluses — ne les ajoutez pas une seconde fois.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Activez « Arrière-plans et graphiques » si vous voulez les couleurs des titres.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Désactivez les en-têtes/pieds de page du navigateur pour un rendu propre.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Settings panel
// ============================================================================

function SettingsPanel({ project }: { project: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Paramètres d'export</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Ces informations sont utilisées pour la page de titre et les métadonnées du fichier exporté.
          Modifiez-les dans l'onboarding si nécessaire.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <InfoRow icon={User} label="Titre" value={project.title || '—'} />
          <InfoRow icon={Calendar} label="Université" value={project.university || '—'} />
          <InfoRow icon={BookOpen} label="Faculté" value={project.faculty || '—'} />
          <InfoRow icon={Type} label="Niveau" value={project.level || '—'} />
          <InfoRow icon={Layers} label="Filière" value={project.filiere || '—'} />
          <InfoRow icon={FileSignature} label="Norme bibliographique" value={project.norme || 'APA'} />
          <InfoRow icon={Palette} label="Langue" value={project.language || 'Français'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            Format d'export par défaut
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Le format d'export par défaut est <strong>PDF</strong> (via impression navigateur).
            Les autres formats (Word, HTML, Markdown) sont disponibles dans la sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Shared components
// ============================================================================

function Stat({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="text-center">
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function OptionRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 relative',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function PreviewContent({ project, sections }: { project: any; sections: any[] }) {
  return (
    <div className="prose prose-sm max-w-none">
      <div className="text-center mb-8 pb-6 border-b">
        <h1 className="text-2xl font-bold mb-2">{project.title || 'Mémoire sans titre'}</h1>
        <p className="text-sm text-muted-foreground">
          {project.university} - {project.faculty}
        </p>
        <p className="text-sm text-muted-foreground">
          {project.level} · {project.filiere}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Norme : {project.norme || 'APA'}
        </p>
      </div>

      {sections.map((s, idx) => {
        if (!s.content.trim()) return null
        return (
          <div key={s.id} className="mb-6">
            <h2 className="text-lg font-bold mb-2">
              {idx + 1}. {s.title}
            </h2>
            <div
              className="text-sm leading-relaxed prose-iris"
              dangerouslySetInnerHTML={{ __html: s.content }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Builders — generate the actual file content
// ============================================================================

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'memoire-iris'
}

function buildSectionsHtml(sections: any[]): string {
  return sections
    .map((s, idx) => {
      if (!s.content || !s.content.trim()) return ''
      return `<h2>${idx + 1}. ${escapeHtml(s.title)}</h2>\n${s.content}\n`
    })
    .filter(Boolean)
    .join('\n')
}

function buildStandaloneHtml(
  project: any,
  sections: any[],
  options: { includeTitlePage: boolean; includeTableOfContents: boolean; includePageNumbers: boolean; embedCss: boolean }
): string {
  const css = `
body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; color: #111; max-width: 800px; margin: 2em auto; padding: 0 1em; }
h1 { font-family: 'Inter', Arial, sans-serif; font-size: 22pt; text-align: center; text-transform: uppercase; margin: 0 0 18pt 0; }
h2 { font-family: 'Inter', Arial, sans-serif; font-size: 16pt; margin: 24pt 0 12pt 0; page-break-after: avoid; }
h3 { font-family: 'Inter', Arial, sans-serif; font-size: 13pt; margin: 18pt 0 8pt 0; page-break-after: avoid; }
p { margin: 0 0 10pt 0; text-align: justify; }
ul, ol { margin: 0 0 10pt 0; padding-left: 20mm; }
blockquote { margin: 12pt 0; padding: 8pt 16pt; border-left: 3px solid #7c3aed; background: #faf8ff; font-style: italic; }
strong { color: #1a1a2e; }
.title-page { text-align: center; padding: 4cm 0; page-break-after: always; }
.title-page h1 { font-size: 28pt; margin-bottom: 1cm; }
.title-page p { font-size: 14pt; color: #444; }
.toc { page-break-after: always; }
.toc h2 { text-align: center; }
.toc ol { list-style: none; padding-left: 0; }
.toc li { margin-bottom: 6pt; }
@media print { @page { size: A4; margin: 25mm; } body { max-width: none; } }
`
  const titlePage = options.includeTitlePage
    ? `<div class="title-page">
         <h1>${escapeHtml(project.title || 'Mémoire sans titre')}</h1>
         <p>${escapeHtml(project.university || '')}</p>
         <p>${escapeHtml(project.faculty || '')}</p>
         <p>${escapeHtml(project.level || '')} · ${escapeHtml(project.filiere || '')}</p>
         <p>Norme : ${escapeHtml(project.norme || 'APA')}</p>
       </div>`
    : ''

  const toc = options.includeTableOfContents
    ? `<div class="toc">
         <h2>Table des matières</h2>
         <ol>
           ${sections
             .map((s, idx) => `<li>${idx + 1}. ${escapeHtml(s.title)}</li>`)
             .join('\n')}
         </ol>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(project.title || 'Mémoire')}</title>
  ${options.embedCss ? `<style>${css}</style>` : '<link rel="stylesheet" href="/globals.css">'}
</head>
<body>
  ${titlePage}
  ${toc}
  ${buildSectionsHtml(sections)}
</body>
</html>`
}

function buildWordHtml(
  project: any,
  sections: any[],
  options: { includeTitlePage: boolean; includeTableOfContents: boolean }
): string {
  // Word ouvre le HTML avec un Content-Type application/msword comme un document éditable.
  // On inclut le CSS en inline pour que les mises en forme soient conservées.
  const css = `
body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.6; }
h1 { font-family: 'Calibri', Arial, sans-serif; font-size: 22pt; text-align: center; text-transform: uppercase; }
h2 { font-family: 'Calibri', Arial, sans-serif; font-size: 16pt; color: #1a1a2e; }
h3 { font-family: 'Calibri', Arial, sans-serif; font-size: 13pt; color: #2a2a3e; }
p { text-align: justify; margin: 0 0 10pt 0; }
ul, ol { padding-left: 20mm; }
blockquote { border-left: 3px solid #7c3aed; padding-left: 16pt; font-style: italic; }
`
  const titlePage = options.includeTitlePage
    ? `<div style="text-align: center; padding: 4cm 0; page-break-after: always;">
         <h1>${escapeHtml(project.title || 'Mémoire sans titre')}</h1>
         <p style="font-size: 14pt; color: #444;">${escapeHtml(project.university || '')}</p>
         <p style="font-size: 14pt; color: #444;">${escapeHtml(project.faculty || '')}</p>
         <p style="font-size: 14pt; color: #444;">${escapeHtml(project.level || '')} · ${escapeHtml(project.filiere || '')}</p>
         <p style="font-size: 12pt; color: #666;">Norme : ${escapeHtml(project.norme || 'APA')}</p>
       </div>`
    : ''

  const toc = options.includeTableOfContents
    ? `<div style="page-break-after: always;">
         <h2 style="text-align: center;">Table des matières</h2>
         <ol>
           ${sections
             .map((s, idx) => `<li>${idx + 1}. ${escapeHtml(s.title)}</li>`)
             .join('\n')}
         </ol>
       </div>`
    : ''

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(project.title || 'Mémoire')}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>${css}</style>
</head>
<body>
  ${titlePage}
  ${toc}
  ${buildSectionsHtml(sections)}
</body>
</html>`
}

function buildMarkdown(
  project: any,
  sections: any[],
  options: { includeTitlePage: boolean; includeTableOfContents: boolean }
): string {
  const parts: string[] = []
  if (options.includeTitlePage) {
    parts.push(`# ${project.title || 'Mémoire sans titre'}`)
    parts.push('')
    parts.push(`**${project.university || ''}**  `)
    parts.push(`**${project.faculty || ''}**  `)
    parts.push(`**${project.level || ''} · ${project.filiere || ''}**  `)
    parts.push('')
    parts.push(`*Norme : ${project.norme || 'APA'}*`)
    parts.push('')
    parts.push('---')
    parts.push('')
  }
  if (options.includeTableOfContents) {
    parts.push('## Table des matières')
    parts.push('')
    sections.forEach((s, idx) => {
      parts.push(`${idx + 1}. ${s.title}`)
    })
    parts.push('')
    parts.push('---')
    parts.push('')
  }
  sections.forEach((s, idx) => {
    if (!s.content || !s.content.trim()) return
    parts.push(`## ${idx + 1}. ${s.title}`)
    parts.push('')
    // Convert HTML → Markdown (basic)
    let md = s.content
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, '$1')
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    md = md.replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    md = md.replace(/<br\s*\/?>/gi, '\n')
    md = md.replace(/<[^>]+>/g, '') // strip remaining tags
    md = md.replace(/\n{3,}/g, '\n\n')
    parts.push(md.trim())
    parts.push('')
  })
  return parts.join('\n')
}

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
