'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  Edit3,
  Sparkles,
  ListChecks,
  PenLine,
  Bot,
  ChevronDown,
  BookOpen,
  Lightbulb,
  Globe,
  Target,
  HelpCircle,
  Flag,
  Library,
  Layers,
  FlaskConical,
  BarChart3,
  MessagesSquare,
  Compass,
  GraduationCap,
  Quote,
  Calculator,
  SpellCheck,
  FileText,
  Presentation,
  ShieldCheck,
} from 'lucide-react'
import { useIrisStore, type ChatMessage } from '@/store/iris-store'
import { CHAPTERS, getChapter } from '@/lib/iris/chapters'
import { AGENTS, getAgentForChapter, getAgent } from '@/lib/iris/agents'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const ICON_MAP: Record<string, any> = {
  Lightbulb,
  BookOpen,
  Globe,
  Target,
  HelpCircle,
  Flag,
  Sparkles,
  Library,
  Layers,
  FlaskConical,
  BarChart3,
  MessagesSquare,
  CheckCircle2,
  Compass,
  GraduationCap,
  PenLine,
  Quote,
  Calculator,
  SpellCheck,
  FileText,
  Presentation,
  ShieldCheck,
  Bot,
}

export function ChapterWorkspace() {
  const {
    activeChapterId,
    chapters,
    project,
    addMessage,
    updateChapterContent,
    setChapterStatus,
    setActiveChapter,
  } = useIrisStore()

  const chapterDef = activeChapterId ? getChapter(activeChapterId) : null
  const chapter = activeChapterId ? chapters[activeChapterId] : null
  const agent = chapterDef ? getAgentForChapter(chapterDef.id) : null

  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [tab, setTab] = React.useState('chat')
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chapter?.messages.length, loading])

  if (!chapterDef || !chapter || !agent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Aucun chapitre sélectionné.</p>
        <Button onClick={() => setActiveChapter('sujet')} className="mt-4">
          Aller au premier chapitre
        </Button>
      </div>
    )
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading || !chapterDef || !agent) return

    addMessage(chapterDef.id, {
      role: 'user',
      content: text.trim(),
    })
    setInput('')
    setLoading(true)

    try {
      const history = chapter.messages
        .filter((m) => m.role !== 'system')
        .slice(-6)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: chapterDef.id,
          agentId: agent.id,
          project,
          history,
          userMessage: text.trim(),
          chapterContent: chapter.content,
        }),
      })

      const data = await res.json()
      addMessage(chapterDef.id, {
        role: 'assistant',
        content: data.reply || '...',
        agent: agent.id,
      })
    } catch (err) {
      toast.error("Erreur de communication avec l'IA")
      addMessage(chapterDef.id, {
        role: 'assistant',
        content:
          "Je rencontre une difficulté technique. Pouvez-vous reformuler votre demande ?",
        agent: agent.id,
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Suggested starter prompts
  const starters = chapterDef.guidingQuestions.slice(0, 3)

  const AgentIcon = ICON_MAP[agent.icon] || Bot
  const ChapterIcon = ICON_MAP[chapterDef.icon] || BookOpen

  // Chapter navigation
  const currentIdx = CHAPTERS.findIndex((c) => c.id === chapterDef.id)
  const prevChapter = currentIdx > 0 ? CHAPTERS[currentIdx - 1] : null
  const nextChapter = currentIdx < CHAPTERS.length - 1 ? CHAPTERS[currentIdx + 1] : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Chapter header */}
      <div className="mb-6">
        <button
          onClick={() => setActiveChapter(null)}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au tableau de bord
        </button>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl iris-gradient flex items-center justify-center flex-shrink-0">
            <ChapterIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Chapitre {chapterDef.order} / {CHAPTERS.length}
              </span>
              <StatusBadge status={chapter.status} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{chapterDef.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{chapterDef.description}</p>
          </div>
        </div>
      </div>

      {/* Agent banner */}
      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <AgentIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {agent.name} <span className="text-muted-foreground font-normal">· {agent.role}</span>
          </p>
          <p className="text-xs text-muted-foreground truncate">{agent.specialty}</p>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          <Sparkles className="h-3 w-3 mr-1" />
          Actif
        </Badge>
      </div>

      {/* Tabs: chat + draft + checklist */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="chat" className="text-xs sm:text-sm">
            <MessagesSquare className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Dialogue IA</span>
            <span className="sm:hidden">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs sm:text-sm">
            <PenLine className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Brouillon</span>
            <span className="sm:hidden">Texte</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs sm:text-sm">
            <ListChecks className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Checklist</span>
            <span className="sm:hidden">Liste</span>
          </TabsTrigger>
        </TabsList>

        {/* Chat tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[60vh] flex flex-col">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chapter.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <AgentIcon className="h-7 w-7" />
                  </div>
                  <h3 className="font-semibold mb-1">Discutons de votre {chapterDef.shortTitle.toLowerCase()}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-5">
                    {agent.name} vous guidera pas à pas. Choisissez une question pour démarrer,
                    ou posez la vôtre.
                  </p>
                  <div className="space-y-2 w-full max-w-md">
                    {starters.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm"
                      >
                        <span className="text-primary font-medium mr-2">→</span>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chapter.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <AgentIcon className="h-4 w-4" />
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
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Échangez avec ${agent.name}... (Cmd/Ctrl+Entrée pour envoyer)`}
                className="resize-none min-h-24 max-h-40"
                disabled={loading}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  L'IA vous accompagne, elle ne rédige pas à votre place.
                </span>
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  size="sm"
                  className="rounded-full iris-gradient text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Draft tab */}
        <TabsContent value="draft" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Brouillon — {chapterDef.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{chapter.wordCount} mots</Badge>
                  {chapter.wordCount > 100 && chapter.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setChapterStatus(chapterDef.id, 'completed')
                        toast.success("Chapitre marqué comme terminé !")
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Marquer terminé
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={chapter.content}
                onChange={(e) => updateChapterContent(chapterDef.id, e.target.value)}
                placeholder={`Rédigez ici votre ${chapterDef.shortTitle.toLowerCase()}. L'IA analysera ce brouillon pour vous donner des retours pertinents dans l'onglet Dialogue IA.`}
                className="min-h-[50vh] resize-none font-serif text-base leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Sauvegarde automatique · {chapter.lastEdited ? new Date(chapter.lastEdited).toLocaleString('fr-FR') : 'jamais édité'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checklist tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                Éléments à vérifier pour ce chapitre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chapterDef.keyElements.map((el, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{el}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Demandez à {agent.name} de vous aider sur cet aspect spécifique.
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Questions guidantes
                </p>
                {chapterDef.guidingQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTab('chat')
                      setTimeout(() => sendMessage(q), 200)
                    }}
                    className="block w-full text-left text-sm p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-primary mr-2">→</span>
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chapter navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        {prevChapter ? (
          <Button variant="outline" onClick={() => setActiveChapter(prevChapter.id)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {prevChapter.shortTitle}
          </Button>
        ) : (
          <div />
        )}
        {nextChapter ? (
          <Button
            onClick={() => setActiveChapter(nextChapter.id)}
            className="iris-gradient text-white"
          >
            {nextChapter.shortTitle}
            <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const agent = message.agent ? getAgent(message.agent) : null
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 justify-end"
      >
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-3 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0 text-xs font-semibold">
          Vous
        </div>
      </motion.div>
    )
  }

  const AgentIcon = agent ? ICON_MAP[agent.icon] || Bot : Bot

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
        <AgentIcon className="h-4 w-4" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm p-3 max-w-[80%]">
        {agent && (
          <p className="text-xs font-semibold text-primary mb-1">{agent.name}</p>
        )}
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
      </div>
    </motion.div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    not_started: { label: 'Non commencé', class: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'En cours', class: 'bg-amber-500/15 text-amber-600' },
    draft: { label: 'Brouillon', class: 'bg-blue-500/15 text-blue-600' },
    completed: { label: 'Terminé', class: 'bg-emerald-500/15 text-emerald-600' },
    validated: { label: 'Validé', class: 'bg-emerald-600/15 text-emerald-700' },
  }
  const c = config[status] || config.not_started
  return <Badge variant="outline" className={c.class}>{c.label}</Badge>
}
