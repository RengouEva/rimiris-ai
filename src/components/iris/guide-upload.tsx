'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertCircle,
  BookOpen,
  X,
} from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ============================================================================
// GuideUpload — Phase 0 enhancement.
// Lets the student upload their university's methodological guide (PDF).
// The text is extracted server-side (/api/extract-pdf), stored in
// `project.guideText`, and injected in every AI prompt as permanent context.
// ============================================================================

interface GuideUploadProps {
  variant?: 'compact' | 'full'
  onClose?: () => void
}

export function GuideUpload({ variant = 'full', onClose }: GuideUploadProps) {
  const { project, updateProject } = useIrisStore()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [dragOver, setDragOver] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const hasGuide = Boolean(project.guideText && project.guideText.trim())

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Le fichier doit être au format PDF.')
      }
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('PDF trop volumineux (max 25 Mo).')
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Échec de l\'extraction du PDF.')
      }

      updateProject({
        guideFileName: data.fileName,
        guideText: data.text,
        guideUploadedAt: Date.now(),
      })

      toast.success(
        `Guide méthodologique importé (${data.numPages} pages, ${data.charCount} caractères${data.truncated ? ', tronqué à 30k' : ''}). IRIS l'utilisera comme contexte permanent.`
      )
    } catch (err: any) {
      console.error('[GuideUpload] Error:', err)
      setError(err?.message || 'Erreur lors de l\'upload.')
      toast.error(err?.message || 'Erreur lors de l\'upload du guide.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    updateProject({
      guideFileName: '',
      guideText: '',
      guideUploadedAt: undefined,
    })
    toast.info('Guide méthodologique supprimé.')
  }

  // Compact variant — just a button + status badge
  if (variant === 'compact') {
    return (
      <div className="space-y-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />
        {hasGuide ? (
          <div className="flex items-center gap-2 p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{project.guideFileName}</p>
              <p className="text-[10px] text-muted-foreground">Guide actif</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
              title="Supprimer le guide"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
            size="sm"
            className="w-full justify-start rounded-lg"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4 mr-1.5" />
            )}
            {uploading ? 'Extraction…' : 'Guide méthodologique (PDF)'}
          </Button>
        )}
      </div>
    )
  }

  // Full variant — drag-and-drop area + preview
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            Guide méthodologique de votre université
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Importez le PDF — IRIS l'utilisera comme contexte permanent pour adapter
            structure, normes et formulation aux exigences de votre établissement.
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {hasGuide ? (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{project.guideFileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {project.guideText?.length || 0} caractères extraits ·{' '}
                {project.guideUploadedAt
                  ? new Date(project.guideUploadedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : ''}
              </p>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Actif
            </Badge>
          </div>

          {/* Preview of extracted text */}
          <div className="max-h-32 overflow-y-auto rounded-lg bg-background/60 border border-border p-2.5">
            <p className="text-[11px] text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap">
              {project.guideText?.slice(0, 600)}
              {(project.guideText?.length || 0) > 600 ? '…' : ''}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Remplacer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              className="rounded-full text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Supprimer
            </Button>
          </div>
        </motion.div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            'rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/40',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {uploading ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <p className="text-sm font-medium">
              {uploading ? 'Extraction du texte en cours…' : 'Glissez votre PDF ici'}
            </p>
            <p className="text-xs text-muted-foreground">
              ou cliquez pour parcourir — max 25 Mo
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Format PDF uniquement. Le texte est extrait et tronqué à 30 000 caractères.
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-red-500/40 bg-red-500/5 p-2.5 text-xs text-red-700 dark:text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
