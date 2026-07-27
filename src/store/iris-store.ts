// Store global IRIS Thesis AI
// Gère : projet, chapitres, messages, progression, cohérence
// Persistance : localStorage (sauvegarde automatique)

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CHAPTERS, type ChapterStatus } from '@/lib/iris/chapters'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: string
  timestamp: number
}

export interface Chapter {
  id: string
  status: ChapterStatus
  content: string // texte rédigé pour ce chapitre
  messages: ChatMessage[]
  wordCount: number
  lastEdited: number | null
}

export interface ProjectInfo {
  university: string
  faculty: string
  department: string
  filiere: string
  level: 'Licence' | 'Master' | 'Doctorat' | ''
  country: string
  language: string
  theme: string
  entreprise: string
  directeur: string
  norme: 'APA' | 'Vancouver' | 'IEEE' | 'ISO 690' | 'Harvard' | ''
  title: string // titre du mémoire
}

export type ViewMode =
  | 'welcome'
  | 'onboarding'
  | 'dashboard'
  | 'chapter'
  | 'coherence'
  | 'soutenance'
  | 'export'
  | 'agents'

export interface CoherenceIssue {
  id: string
  severity: 'high' | 'medium' | 'low'
  chapter: string
  message: string
  suggestion: string
}

interface IrisState {
  // Navigation
  view: ViewMode
  activeChapterId: string | null
  activeAgentId: string | null

  // Projet
  project: ProjectInfo
  projectInitialized: boolean

  // Chapitres
  chapters: Record<string, Chapter>

  // Cohérence
  coherenceIssues: CoherenceIssue[]
  lastCoherenceCheck: number | null

  // Soutenance
  soutenanceData: {
    summary: string
    presentationOutline: { title: string; bullets: string[] }[]
    juryQuestions: { question: string; suggestedAnswer: string; difficulty: 'facile' | 'moyenne' | 'difficile' }[]
    weakPoints: string[]
  } | null

  // UI
  blockedModalOpen: boolean
  sidebarCollapsed: boolean

  // Actions
  setView: (view: ViewMode) => void
  setActiveChapter: (id: string | null) => void
  setActiveAgent: (id: string | null) => void
  updateProject: (data: Partial<ProjectInfo>) => void
  completeOnboarding: () => void
  resetProject: () => void

  addMessage: (chapterId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateChapterContent: (chapterId: string, content: string) => void
  setChapterStatus: (chapterId: string, status: ChapterStatus) => void

  setBlockedModal: (open: boolean) => void
  toggleSidebar: () => void

  setCoherenceIssues: (issues: CoherenceIssue[]) => void
  setSoutenanceData: (data: IrisState['soutenanceData']) => void
}

function buildInitialChapters(): Record<string, Chapter> {
  const map: Record<string, Chapter> = {}
  for (const c of CHAPTERS) {
    map[c.id] = {
      id: c.id,
      status: 'not_started',
      content: '',
      messages: [],
      wordCount: 0,
      lastEdited: null,
    }
  }
  return map
}

const defaultProject: ProjectInfo = {
  university: '',
  faculty: '',
  department: '',
  filiere: '',
  level: '',
  country: '',
  language: 'Français',
  theme: '',
  entreprise: '',
  directeur: '',
  norme: 'APA',
  title: '',
}

export const useIrisStore = create<IrisState>()(
  persist(
    (set) => ({
      view: 'welcome',
      activeChapterId: null,
      activeAgentId: null,

      project: defaultProject,
      projectInitialized: false,

      chapters: buildInitialChapters(),

      coherenceIssues: [],
      lastCoherenceCheck: null,

      soutenanceData: null,

      blockedModalOpen: false,
      sidebarCollapsed: false,

      setView: (view) => set({ view }),
      setActiveChapter: (id) => set({ activeChapterId: id, view: id ? 'chapter' : 'dashboard' }),
      setActiveAgent: (id) => set({ activeAgentId: id }),

      updateProject: (data) =>
        set((state) => ({ project: { ...state.project, ...data } })),

      completeOnboarding: () => set({ projectInitialized: true, view: 'dashboard' }),

      resetProject: () =>
        set({
          view: 'welcome',
          project: defaultProject,
          projectInitialized: false,
          chapters: buildInitialChapters(),
          coherenceIssues: [],
          lastCoherenceCheck: null,
          soutenanceData: null,
          activeChapterId: null,
          activeAgentId: null,
        }),

      addMessage: (chapterId, message) =>
        set((state) => {
          const chapter = state.chapters[chapterId]
          if (!chapter) return state
          const newMessage: ChatMessage = {
            ...message,
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
          }
          const updatedChapter: Chapter = {
            ...chapter,
            messages: [...chapter.messages, newMessage],
            lastEdited: Date.now(),
            status: chapter.status === 'not_started' ? 'in_progress' : chapter.status,
          }
          return {
            chapters: { ...state.chapters, [chapterId]: updatedChapter },
          }
        }),

      updateChapterContent: (chapterId, content) =>
        set((state) => {
          const chapter = state.chapters[chapterId]
          if (!chapter) return state
          const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
          const newStatus: ChapterStatus =
            content.trim().length > 100
              ? chapter.status === 'not_started' || chapter.status === 'in_progress'
                ? 'draft'
                : chapter.status
              : chapter.status
          return {
            chapters: {
              ...state.chapters,
              [chapterId]: {
                ...chapter,
                content,
                wordCount,
                lastEdited: Date.now(),
                status: newStatus,
              },
            },
          }
        }),

      setChapterStatus: (chapterId, status) =>
        set((state) => {
          const chapter = state.chapters[chapterId]
          if (!chapter) return state
          return {
            chapters: { ...state.chapters, [chapterId]: { ...chapter, status } },
          }
        }),

      setBlockedModal: (open) => set({ blockedModalOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCoherenceIssues: (issues) =>
        set({ coherenceIssues: issues, lastCoherenceCheck: Date.now() }),

      setSoutenanceData: (data) => set({ soutenanceData: data }),
    }),
    {
      name: 'iris-thesis-ai',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        project: state.project,
        projectInitialized: state.projectInitialized,
        chapters: state.chapters,
        coherenceIssues: state.coherenceIssues,
        lastCoherenceCheck: state.lastCoherenceCheck,
        soutenanceData: state.soutenanceData,
      }),
    }
  )
)

// Selecteurs utilitaires
export function selectProgress(state: IrisState) {
  const chapters = Object.values(state.chapters)
  const total = chapters.length
  const completed = chapters.filter((c) => c.status === 'completed' || c.status === 'validated').length
  const inProgress = chapters.filter((c) => c.status === 'in_progress' || c.status === 'draft').length
  return {
    total,
    completed,
    inProgress,
    notStarted: total - completed - inProgress,
    percent: Math.round((completed / total) * 100),
  }
}

export function selectQualityScores(state: IrisState) {
  const chapters = Object.values(state.chapters)
  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0)
  const draftedCount = chapters.filter((c) => c.wordCount > 100).length
  const validatedCount = chapters.filter((c) => c.status === 'validated').length
  const highSeverityIssues = state.coherenceIssues.filter((i) => i.severity === 'high').length

  // Scores (0-100)
  const progression = Math.round((draftedCount / chapters.length) * 100)
  const redaction = Math.min(100, Math.round(totalWords / 50)) // 5000 mots = 100
  const methodologique = Math.min(
    100,
    Math.round(
      ((state.chapters['methodologie']?.wordCount || 0) / 30) +
        ((state.chapters['cadre']?.wordCount || 0) / 30) +
        ((state.chapters['hypotheses']?.wordCount || 0) / 30)
    )
  )
  const coherence = Math.max(0, 100 - highSeverityIssues * 20)
  const global = Math.round(
    (progression + redaction + methodologique + coherence) / 4
  )

  return {
    progression,
    redaction,
    methodologique,
    coherence,
    global,
    totalWords,
    validatedCount,
  }
}
