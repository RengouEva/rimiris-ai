// Store global IRIS Thesis AI — V2
// L'étudiant crée SA propre structure de mémoire.
// Le template académique (15 chapitres) est une suggestion optionnelle.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CHAPTERS } from '@/lib/iris/chapters'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: string
  timestamp: number
}

export type SectionStatus = 'not_started' | 'in_progress' | 'draft' | 'completed'

export interface Section {
  id: string
  title: string
  content: string
  messages: ChatMessage[]
  wordCount: number
  lastEdited: number | null
  status: SectionStatus
  // If imported from a chapter template, keep the reference (for AI context)
  templateRef?: string
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
  title: string
}

export type ViewMode = 'welcome' | 'workspace' | 'coherence' | 'soutenance' | 'export' | 'agents'

export interface CoherenceIssue {
  id: string
  severity: 'high' | 'medium' | 'low'
  sectionTitle: string
  message: string
  suggestion: string
}

interface IrisState {
  // Navigation
  view: ViewMode
  activeSectionId: string | null

  // Projet
  project: ProjectInfo
  projectInitialized: boolean

  // Sections libres (créées par l'étudiant)
  sections: Section[]

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
  aiPanelOpen: boolean
  blockedMode: boolean
  sidebarCollapsed: boolean

  // Actions — Navigation
  setView: (view: ViewMode) => void
  setActiveSection: (id: string | null) => void
  setAIPanel: (open: boolean) => void
  setBlockedMode: (on: boolean) => void
  toggleSidebar: () => void

  // Actions — Project
  updateProject: (data: Partial<ProjectInfo>) => void
  completeQuickStart: (title: string, level?: ProjectInfo['level']) => void
  resetProject: () => void

  // Actions — Sections
  addSection: (title?: string, templateRef?: string) => string
  renameSection: (id: string, title: string) => void
  deleteSection: (id: string) => void
  duplicateSection: (id: string) => void
  moveSection: (id: string, direction: 'up' | 'down') => void
  updateSectionContent: (id: string, content: string) => void
  setSectionStatus: (id: string, status: SectionStatus) => void
  addMessage: (sectionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  importTemplate: () => void

  // Actions — Coherence & Soutenance
  setCoherenceIssues: (issues: CoherenceIssue[]) => void
  setSoutenanceData: (data: IrisState['soutenanceData']) => void
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

function makeId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useIrisStore = create<IrisState>()(
  persist(
    (set, get) => ({
      view: 'welcome',
      activeSectionId: null,

      project: defaultProject,
      projectInitialized: false,

      sections: [],

      coherenceIssues: [],
      lastCoherenceCheck: null,

      soutenanceData: null,

      aiPanelOpen: false,
      blockedMode: false,
      sidebarCollapsed: false,

      setView: (view) => set({ view }),
      setActiveSection: (id) => set({ activeSectionId: id }),
      setAIPanel: (open) => set({ aiPanelOpen: open }),
      setBlockedMode: (on) => set({ blockedMode: on, aiPanelOpen: on ? true : get().aiPanelOpen }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      updateProject: (data) =>
        set((state) => ({ project: { ...state.project, ...data } })),

      completeQuickStart: (title, level) =>
        set((state) => ({
          project: {
            ...state.project,
            title: title.trim(),
            level: level || state.project.level || 'Master',
            theme: state.project.theme || title.trim(),
          },
          projectInitialized: true,
          view: 'workspace',
          // Create a first empty section so the student can start writing immediately
          sections:
            state.sections.length === 0
              ? [
                  {
                    id: makeId(),
                    title: 'Introduction',
                    content: '',
                    messages: [],
                    wordCount: 0,
                    lastEdited: null,
                    status: 'not_started',
                  },
                ]
              : state.sections,
          activeSectionId:
            state.activeSectionId || (state.sections.length === 0 ? null : state.sections[0]?.id),
        })),

      resetProject: () =>
        set({
          view: 'welcome',
          project: defaultProject,
          projectInitialized: false,
          sections: [],
          coherenceIssues: [],
          lastCoherenceCheck: null,
          soutenanceData: null,
          activeSectionId: null,
          aiPanelOpen: false,
          blockedMode: false,
        }),

      addSection: (title, templateRef) => {
        const id = makeId()
        set((state) => ({
          sections: [
            ...state.sections,
            {
              id,
              title: title?.trim() || 'Nouvelle section',
              content: '',
              messages: [],
              wordCount: 0,
              lastEdited: null,
              status: 'not_started',
              templateRef,
            },
          ],
          activeSectionId: id,
        }))
        return id
      },

      renameSection: (id, title) =>
        set((state) => ({
          sections: state.sections.map((s) => (s.id === id ? { ...s, title } : s)),
        })),

      deleteSection: (id) =>
        set((state) => {
          const newSections = state.sections.filter((s) => s.id !== id)
          return {
            sections: newSections,
            activeSectionId:
              state.activeSectionId === id ? newSections[0]?.id || null : state.activeSectionId,
          }
        }),

      duplicateSection: (id) =>
        set((state) => {
          const src = state.sections.find((s) => s.id === id)
          if (!src) return state
          const newId = makeId()
          const copy: Section = {
            ...src,
            id: newId,
            title: `${src.title} (copie)`,
            messages: [],
            lastEdited: null,
          }
          const idx = state.sections.findIndex((s) => s.id === id)
          const newSections = [...state.sections]
          newSections.splice(idx + 1, 0, copy)
          return { sections: newSections, activeSectionId: newId }
        }),

      moveSection: (id, direction) =>
        set((state) => {
          const idx = state.sections.findIndex((s) => s.id === id)
          if (idx === -1) return state
          const newIdx = direction === 'up' ? idx - 1 : idx + 1
          if (newIdx < 0 || newIdx >= state.sections.length) return state
          const newSections = [...state.sections]
          const [moved] = newSections.splice(idx, 1)
          newSections.splice(newIdx, 0, moved)
          return { sections: newSections }
        }),

      updateSectionContent: (id, content) =>
        set((state) => ({
          sections: state.sections.map((s) => {
            if (s.id !== id) return s
            // Content may be HTML (from the A4 editor) or plain text — strip tags for word count
            const plainText = content
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            const wordCount = plainText ? plainText.split(/\s+/).length : 0
            const newStatus: SectionStatus =
              plainText.length > 100
                ? s.status === 'not_started' || s.status === 'in_progress'
                  ? 'draft'
                  : s.status
                : s.status
            return {
              ...s,
              content,
              wordCount,
              lastEdited: Date.now(),
              status: newStatus,
            }
          }),
        })),

      setSectionStatus: (id, status) =>
        set((state) => ({
          sections: state.sections.map((s) => (s.id === id ? { ...s, status } : s)),
        })),

      addMessage: (sectionId, message) =>
        set((state) => ({
          sections: state.sections.map((s) => {
            if (s.id !== sectionId) return s
            const newMessage: ChatMessage = {
              ...message,
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: Date.now(),
            }
            return {
              ...s,
              messages: [...s.messages, newMessage],
              lastEdited: Date.now(),
              status: s.status === 'not_started' ? 'in_progress' : s.status,
            }
          }),
        })),

      importTemplate: () =>
        set((state) => {
          // Merge template chapters into existing sections (skip duplicates by templateRef)
          const existingRefs = new Set(
            state.sections.map((s) => s.templateRef).filter(Boolean) as string[]
          )
          const newSections: Section[] = CHAPTERS.filter((c) => !existingRefs.has(c.id)).map(
            (c) => ({
              id: makeId(),
              title: c.title,
              content: '',
              messages: [],
              wordCount: 0,
              lastEdited: null,
              status: 'not_started' as SectionStatus,
              templateRef: c.id,
            })
          )
          const allSections = [...state.sections, ...newSections]
          return {
            sections: allSections,
            activeSectionId: state.activeSectionId || allSections[0]?.id || null,
          }
        }),

      setCoherenceIssues: (issues) =>
        set({ coherenceIssues: issues, lastCoherenceCheck: Date.now() }),

      setSoutenanceData: (data) => set({ soutenanceData: data }),
    }),
    {
      name: 'iris-thesis-ai-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        project: state.project,
        projectInitialized: state.projectInitialized,
        sections: state.sections,
        coherenceIssues: state.coherenceIssues,
        lastCoherenceCheck: state.lastCoherenceCheck,
        soutenanceData: state.soutenanceData,
      }),
      // Migrate from v1 if present
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted
        if (version < 2 && persisted.chapters) {
          // Convert old chapters to sections
          const sections: Section[] = Object.values(persisted.chapters).map((c: any) => ({
            id: makeId(),
            title:
              CHAPTERS.find((ch) => ch.id === c.id)?.title || 'Section importée',
            content: c.content || '',
            messages: c.messages || [],
            wordCount: c.wordCount || 0,
            lastEdited: c.lastEdited || null,
            status: c.status || 'not_started',
            templateRef: c.id,
          }))
          return { ...persisted, sections, chapters: undefined }
        }
        return persisted
      },
    }
  )
)

// Helpers
export function selectTotalWords(state: IrisState) {
  return state.sections.reduce((sum, s) => sum + s.wordCount, 0)
}

export function selectCompletedCount(state: IrisState) {
  return state.sections.filter((s) => s.status === 'completed').length
}

// Convert plain text to a basic HTML paragraph structure (used when seeding or importing)
export function plainTextToHtml(text: string): string {
  if (!text || !text.trim()) return ''
  // Already HTML? leave alone
  if (/<(p|h[1-6]|ul|ol|div|blockquote)/i.test(text)) return text
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

// Strip HTML tags for plain text display (preview, export, AI context)
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
