// Store global IRIS Thesis AI — V3
// Workflow obligatoire en 8 phases (0-7).
// Chaque section passe par : interview → validation → rédaction → humanisation.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ============================================================================
// Types de base
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  agent?: string
  timestamp: number
}

export interface InterviewAnswer {
  questionId: string
  question: string
  answer: string
}

export type SectionStatus = 'not_started' | 'interview' | 'validated' | 'draft' | 'humanized' | 'completed'

export interface SectionUnderstanding {
  // Phase 1 output — IRIS's analysis of the section's intent
  concepts: string[]
  keywords: string[]
  domain: string
  disciplines: string[]
  similarResearch: string[]
  applications: string[]
  limits: string[]
  summary: string
  validated: boolean
}

export interface SectionValidation {
  // Phase 4 output — pre-writing validation
  coherence: { ok: boolean; notes: string }
  feasibility: { ok: boolean; notes: string }
  precision: { ok: boolean; notes: string }
  logic: { ok: boolean; notes: string }
  overallOk: boolean
}

export interface HumanizationResult {
  // Phase 5 output — after the multi-engine pipeline
  grammar: string
  fluidity: string
  style: string
  academic: string
  level: string
  finalHtml: string
}

export interface Section {
  id: string
  title: string
  content: string // HTML in the A4 editor
  messages: ChatMessage[]
  wordCount: number
  lastEdited: number | null
  status: SectionStatus
  templateRef?: string

  // Phase 1 — Understanding (filled by IRIS, validated by student)
  understanding?: SectionUnderstanding

  // Phase 3 — Structured interview answers (4-mode system)
  interviewAnswers: InterviewAnswer[]

  // Phase 4 — Validation
  validation?: SectionValidation

  // Phase 5 — Humanization pipeline result
  humanization?: HumanizationResult
}

export interface ProjectInfo {
  // Phase 0 — Permanent project context
  university: string
  faculty: string
  department: string
  filiere: string
  level: 'Licence' | 'Master' | 'Doctorat' | ''
  country: string
  language: string
  norme: 'APA' | 'Vancouver' | 'IEEE' | 'ISO 690' | 'Harvard' | ''
  guideUrl?: string // optional PDF guide URL
  // Phase 0 — Methodological guide uploaded by the student (PDF text extracted)
  guideFileName?: string
  guideText?: string // raw extracted text, injected in every AI prompt as permanent context
  guideUploadedAt?: number
  theme: string
  entreprise: string
  directeur: string
  title: string
}

export type WorkflowPhase =
  | 'phase_0_project' // Create project, collect context
  | 'phase_1_understanding' // IRIS analyzes theme, student validates
  | 'phase_2_problem' // Build research problem via hypotheses
  | 'phase_3_interview' // Per-section structured interview
  | 'phase_4_validation' // Pre-writing validation
  | 'phase_5_humanization' // Multi-engine writing pipeline
  | 'phase_6_scientific' // Cross-section coherence check
  | 'phase_7_audit' // Final report

export type ViewMode =
  | 'welcome'
  | 'onboarding'
  | 'plan_review'
  | 'workspace'
  | 'audit'
  | 'soutenance'
  | 'export'
  | 'agents'

export interface CoherenceIssue {
  id: string
  severity: 'high' | 'medium' | 'low'
  sectionTitle: string
  message: string
  suggestion: string
}

export interface AuditScore {
  dimension: string
  score: number // 0-100
  notes: string
  improvements: string[]
}

export interface AuditReport {
  scores: AuditScore[]
  globalScore: number
  generatedAt: number
}

// ============================================================================
// State
// ============================================================================

interface IrisState {
  // Navigation
  view: ViewMode
  activeSectionId: string | null

  // Projet
  project: ProjectInfo
  projectInitialized: boolean

  // Onboarding interview (Phase 0 collect)
  interviewAnswers: InterviewAnswer[]
  proposedPlan: { title: string; description: string }[]

  // Phase 1 — Understanding (global)
  themeUnderstanding?: SectionUnderstanding

  // Phase 2 — Problem building
  problemContext?: {
    hypotheses: string[]
    selected: string
    rationale: string
  }

  // Sections
  sections: Section[]

  // Audit & coherence
  coherenceIssues: CoherenceIssue[]
  lastCoherenceCheck: number | null
  auditReport?: AuditReport

  // Soutenance
  soutenanceData: {
    summary: string
    presentationOutline: { title: string; bullets: string[] }[]
    juryQuestions: {
      question: string
      suggestedAnswer: string
      difficulty: 'facile' | 'moyenne' | 'difficile'
      juryRole?: 'Président' | 'Rapporteur' | 'Directeur' | 'Examinateur'
    }[]
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
  resetProject: () => void

  // Actions — Interview (onboarding)
  addInterviewAnswer: (answer: InterviewAnswer) => void
  setProposedPlan: (plan: { title: string; description: string }[]) => void
  acceptPlanAndCreateSections: () => void

  // Actions — Theme understanding (Phase 1)
  setThemeUnderstanding: (u: SectionUnderstanding) => void

  // Actions — Problem building (Phase 2)
  setProblemContext: (p: { hypotheses: string[]; selected: string; rationale: string }) => void

  // Actions — Sections
  addSection: (title?: string, templateRef?: string) => string
  renameSection: (id: string, title: string) => void
  deleteSection: (id: string) => void
  duplicateSection: (id: string) => void
  moveSection: (id: string, direction: 'up' | 'down') => void
  updateSectionContent: (id: string, content: string) => void
  setSectionStatus: (id: string, status: SectionStatus) => void
  setSectionUnderstanding: (id: string, u: SectionUnderstanding) => void
  setSectionInterviewAnswers: (id: string, answers: InterviewAnswer[]) => void
  addSectionInterviewAnswer: (id: string, answer: InterviewAnswer) => void
  setSectionValidation: (id: string, v: SectionValidation) => void
  setSectionHumanization: (id: string, h: HumanizationResult) => void
  addMessage: (sectionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void

  // Actions — Audit
  setAuditReport: (r: AuditReport) => void

  // Actions — Coherence & Soutenance
  setCoherenceIssues: (issues: CoherenceIssue[]) => void
  setSoutenanceData: (data: IrisState['soutenanceData']) => void
}

// ============================================================================
// Defaults
// ============================================================================

const defaultProject: ProjectInfo = {
  university: '',
  faculty: '',
  department: '',
  filiere: '',
  level: '',
  country: '',
  language: 'Français',
  norme: 'APA',
  guideUrl: '',
  guideFileName: '',
  guideText: '',
  guideUploadedAt: undefined,
  theme: '',
  entreprise: '',
  directeur: '',
  title: '',
}

function makeId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================================
// Store
// ============================================================================

export const useIrisStore = create<IrisState>()(
  persist(
    (set, get) => ({
      view: 'welcome',
      activeSectionId: null,

      project: defaultProject,
      projectInitialized: false,

      interviewAnswers: [],
      proposedPlan: [],

      sections: [],

      coherenceIssues: [],
      lastCoherenceCheck: null,

      soutenanceData: null,

      aiPanelOpen: false,
      blockedMode: false,
      sidebarCollapsed: false,

      // ---- Navigation ----
      setView: (view) => set({ view }),
      setActiveSection: (id) => set({ activeSectionId: id }),
      setAIPanel: (open) => set({ aiPanelOpen: open }),
      setBlockedMode: (on) =>
        set({ blockedMode: on, aiPanelOpen: on ? true : get().aiPanelOpen }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // ---- Project ----
      updateProject: (data) =>
        set((state) => ({ project: { ...state.project, ...data } })),

      resetProject: () =>
        set({
          view: 'welcome',
          project: defaultProject,
          projectInitialized: false,
          interviewAnswers: [],
          proposedPlan: [],
          themeUnderstanding: undefined,
          problemContext: undefined,
          sections: [],
          coherenceIssues: [],
          lastCoherenceCheck: null,
          auditReport: undefined,
          soutenanceData: null,
          activeSectionId: null,
          aiPanelOpen: false,
          blockedMode: false,
        }),

      // ---- Onboarding interview ----
      addInterviewAnswer: (answer) =>
        set((state) => ({ interviewAnswers: [...state.interviewAnswers, answer] })),

      setProposedPlan: (plan) => set({ proposedPlan: plan }),

      acceptPlanAndCreateSections: () =>
        set((state) => {
          const plan = state.proposedPlan.length
            ? state.proposedPlan
            : [
                { title: 'Introduction générale', description: 'Présentation du sujet.' },
                { title: 'Conclusion générale', description: 'Synthèse.' },
              ]
          const answers = state.interviewAnswers
          const answerMap: Record<string, string> = {}
          for (const a of answers) answerMap[a.questionId] = a.answer
          const level = (answerMap['level'] || state.project.level || 'Master') as ProjectInfo['level']
          const updatedProject: ProjectInfo = {
            ...state.project,
            title: answerMap['topic'] || state.project.title,
            level,
            filiere: answerMap['field'] || state.project.filiere,
            theme: answerMap['topic'] || state.project.theme,
            entreprise: answerMap['terrain'] || state.project.entreprise,
          }
          const newSections: Section[] = plan.map((p) => ({
            id: makeId(),
            title: p.title,
            content: '',
            messages: [],
            wordCount: 0,
            lastEdited: null,
            status: 'not_started',
            interviewAnswers: [],
          }))
          return {
            project: updatedProject,
            projectInitialized: true,
            sections: state.sections.length > 0 ? state.sections : newSections,
            activeSectionId:
              state.sections.length > 0 ? state.activeSectionId : newSections[0]?.id || null,
            view: 'workspace',
          }
        }),

      // ---- Phase 1 — Theme understanding ----
      setThemeUnderstanding: (u) => set({ themeUnderstanding: u }),

      // ---- Phase 2 — Problem building ----
      setProblemContext: (p) => set({ problemContext: p }),

      // ---- Sections ----
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
              interviewAnswers: [],
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
            interviewAnswers: [...src.interviewAnswers],
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
            const plainText = content
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            const wordCount = plainText ? plainText.split(/\s+/).length : 0
            const newStatus: SectionStatus =
              plainText.length > 100
                ? s.status === 'not_started' || s.status === 'interview' || s.status === 'validated'
                  ? 'draft'
                  : s.status
                : s.status
            return { ...s, content, wordCount, lastEdited: Date.now(), status: newStatus }
          }),
        })),

      setSectionStatus: (id, status) =>
        set((state) => ({
          sections: state.sections.map((s) => (s.id === id ? { ...s, status } : s)),
        })),

      setSectionUnderstanding: (id, u) =>
        set((state) => ({
          sections: state.sections.map((s) => (s.id === id ? { ...s, understanding: u } : s)),
        })),

      setSectionInterviewAnswers: (id, answers) =>
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, interviewAnswers: answers } : s
          ),
        })),

      addSectionInterviewAnswer: (id, answer) =>
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id
              ? { ...s, interviewAnswers: [...s.interviewAnswers, answer] }
              : s
          ),
        })),

      setSectionValidation: (id, v) =>
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, validation: v, status: v.overallOk ? 'validated' : s.status } : s
          ),
        })),

      setSectionHumanization: (id, h) =>
        set((state) => ({
          sections: state.sections.map((s) =>
            s.id === id ? { ...s, humanization: h, status: 'humanized' } : s
          ),
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
              status: s.status === 'not_started' ? 'interview' : s.status,
            }
          }),
        })),

      // ---- Audit ----
      setAuditReport: (r) => set({ auditReport: r }),

      // ---- Coherence & Soutenance ----
      setCoherenceIssues: (issues) =>
        set({ coherenceIssues: issues, lastCoherenceCheck: Date.now() }),

      setSoutenanceData: (data) => set({ soutenanceData: data }),
    }),
    {
      name: 'iris-thesis-ai-v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        project: state.project,
        projectInitialized: state.projectInitialized,
        interviewAnswers: state.interviewAnswers,
        proposedPlan: state.proposedPlan,
        themeUnderstanding: state.themeUnderstanding,
        problemContext: state.problemContext,
        sections: state.sections,
        coherenceIssues: state.coherenceIssues,
        lastCoherenceCheck: state.lastCoherenceCheck,
        auditReport: state.auditReport,
        soutenanceData: state.soutenanceData,
      }),
      version: 4,
      migrate: (persisted: any, version: number) => {
        if (!persisted) return persisted
        // v2 → v3 : re-init interviewAnswers on sections
        if (version < 3 && persisted.sections) {
          persisted.sections = persisted.sections.map((s: any) => ({
            ...s,
            interviewAnswers: s.interviewAnswers || [],
          }))
        }
        // v3 → v4 : ensure project has guideFileName/guideText fields
        if (version < 4 && persisted.project) {
          persisted.project = {
            ...persisted.project,
            guideFileName: persisted.project.guideFileName || '',
            guideText: persisted.project.guideText || '',
            guideUploadedAt: persisted.project.guideUploadedAt || undefined,
          }
        }
        return persisted
      },
    }
  )
)

// ============================================================================
// Helpers
// ============================================================================

export function selectTotalWords(state: IrisState) {
  return state.sections.reduce((sum, s) => sum + s.wordCount, 0)
}

export function selectCompletedCount(state: IrisState) {
  return state.sections.filter((s) => s.status === 'completed').length
}

export function plainTextToHtml(text: string): string {
  if (!text || !text.trim()) return ''
  if (/<(p|h[1-6]|ul|ol|div|blockquote)/i.test(text)) return text
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

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

// Compute the current global workflow phase based on state
export function selectCurrentPhase(state: IrisState): WorkflowPhase {
  if (!state.projectInitialized) return 'phase_0_project'
  if (!state.themeUnderstanding?.validated) return 'phase_1_understanding'
  if (!state.problemContext?.selected) return 'phase_2_problem'
  // Per-section phases are managed inside the workspace
  if (state.auditReport) return 'phase_7_audit'
  return 'phase_3_interview'
}
