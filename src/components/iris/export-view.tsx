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
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ExportView() {
  const { project, sections } = useIrisStore()
  const [exporting, setExporting] = React.useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const draftedCount = sections.filter((s) => s.wordCount > 100).length

  function exportFormat(format: 'docx' | 'pdf' | 'odt') {
    setExporting(format)
    setTimeout(() => {
      let content = `${project.title || 'Mémoire sans titre'}\n`
      content += `${project.university || ''} - ${project.faculty || ''}\n`
      content += `${project.level || ''} · ${project.filiere || ''}\n`
      content += `Norme : ${project.norme || 'APA'}\n`
      content += `\n${'='.repeat(60)}\n\n`

      sections.forEach((s, idx) => {
        if (s.content.trim()) {
          content += `\n${idx + 1}. ${s.title.toUpperCase()}\n\n`
          content += `${s.content}\n\n`
        }
      })

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `memoire-iris.${format === 'pdf' ? 'txt' : format === 'odt' ? 'txt' : 'txt'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExporting(null)
      toast.success(`Export ${format.toUpperCase()} généré (aperçu texte)`)
    }, 1200)
  }

  function printPreview() {
    window.print()
  }

  const formats = [
    { id: 'docx' as const, name: 'Word', desc: 'Document Microsoft Word éditable', icon: FileText, color: 'blue' },
    { id: 'pdf' as const, name: 'PDF', desc: 'Format portable pour impression', icon: FileType2, color: 'red' },
    { id: 'odt' as const, name: 'ODT', desc: 'OpenDocument pour LibreOffice', icon: FileSpreadsheet, color: 'emerald' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Download className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Export</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">Exporter votre mémoire</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Téléchargez votre mémoire dans le format exigé par votre établissement.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Mots rédigés" value={totalWords} />
          <Stat label="Sections rédigées" value={`${draftedCount}/${sections.length}`} />
          <Stat label="Niveau" value={project.level || '—'} />
          <Stat label="Norme" value={project.norme || 'APA'} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {formats.map((f) => {
          const Icon = f.icon
          return (
            <Card key={f.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      f.color === 'blue'
                        ? 'bg-blue-500/10 text-blue-600'
                        : f.color === 'red'
                        ? 'bg-red-500/10 text-red-600'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{f.name}</Badge>
                </div>
                <h3 className="font-semibold mb-1">{f.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{f.desc}</p>
                <Button
                  onClick={() => exportFormat(f.id)}
                  disabled={exporting === f.id || draftedCount === 0}
                  className="w-full"
                  size="sm"
                >
                  {exporting === f.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      Export...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Exporter
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Aperçu du mémoire
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={printPreview}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                Imprimer
              </Button>
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="iris-gradient text-white">
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Aperçu complet
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                  <DialogHeader className="px-6 pt-6 pb-3 border-b">
                    <DialogTitle>{project.title || 'Mémoire sans titre'}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[75vh] px-6 py-4">
                    <PreviewContent project={project} sections={sections} />
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                          hasContent
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
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

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
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
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{s.content}</div>
          </div>
        )
      })}
    </div>
  )
}
