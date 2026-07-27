'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Brain, Loader2, Send, X, Sparkles, ArrowRight } from 'lucide-react'
import { useIrisStore } from '@/store/iris-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

export function BlockedModal() {
  const { blockedModalOpen, setBlockedModal, project, activeChapterId, chapters } = useIrisStore()
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [reply, setReply] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (blockedModalOpen) {
      setInput('')
      setReply(null)
      setLoading(false)
    }
  }, [blockedModalOpen])

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setReply(null)
    try {
      const chaptersContent: Record<string, string> = {}
      Object.entries(chapters).forEach(([id, c]) => {
        chaptersContent[id] = c.content
      })

      const res = await fetch('/api/ai/blocked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: activeChapterId,
          project,
          chaptersContent,
          userMessage: input,
        }),
      })
      const data = await res.json()
      setReply(data.reply || '...')
    } catch {
      setReply("Une erreur est survenue. Pouvez-vous reformuler votre blocage ?")
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    "Je ne sais pas par où commencer ce chapitre",
    "Je n'arrive pas à formuler ma problématique",
    "Je bloque sur ma méthodologie",
    "Je ne trouve pas de sources pour ma revue de littérature",
    "Je ne sais pas comment analyser mes résultats",
  ]

  return (
    <Dialog open={blockedModalOpen} onOpenChange={setBlockedModal}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-amber-500/5">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold">Mode Je suis bloqué</p>
              <p className="text-xs font-normal text-muted-foreground">
                IRIS analyse votre contexte et vous propose des pistes concrètes
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
          {!reply && !loading ? (
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Décrivez en une phrase ce qui vous bloque, ou choisissez une suggestion ci-dessous.
              </p>

              <div className="space-y-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(s)}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-amber-500/40 hover:bg-amber-500/5 transition-colors text-sm flex items-center justify-between group"
                  >
                    <span>{s}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>

              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ou décrivez votre blocage avec vos propres mots..."
                className="resize-none min-h-20"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {activeChapterId
                    ? `Contexte : ${activeChapterId}`
                    : "IRIS prendra en compte l'ensemble de votre mémoire"}
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !input.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Aidez-moi
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
              {input && (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3 max-w-[80%]">
                    <p className="text-sm">{input}</p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm p-4">
                    <div className="flex items-center gap-1">
                      <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}

              {reply && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm p-4 flex-1">
                    <p className="text-xs font-semibold text-amber-600 mb-1">IRIS · Mode débloqué</p>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{reply}</div>
                  </div>
                </motion.div>
              )}

              {reply && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReply(null)
                      setInput('')
                    }}
                  >
                    Poser une autre question
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBlockedModal(false)}
                    className="ml-auto"
                  >
                    Reprendre la rédaction
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
