// Inject a test state to bypass onboarding and reach the workspace
const state = {
  state: {
    view: 'workspace',
    sidebarCollapsed: false,
    projectInitialized: true,
    project: {
      title: 'Test mémoire',
      university: 'UQAC',
      faculty: 'Sciences',
      level: 'Master',
      filiere: 'Informatique',
      norme: 'APA',
      language: 'fr',
      theme: 'Test',
      guideFileName: '',
      guideText: '',
    },
    themeUnderstanding: { validated: true, summary: 'ok' },
    problemContext: { selected: 1, hypotheses: [{ id: 1, text: 'test' }] },
    sections: [
      {
        id: 's1',
        title: 'Introduction',
        content: '',
        wordCount: 0,
        status: 'not_started',
        messages: [],
        lastEdited: Date.now(),
      },
    ],
    activeSectionId: 's1',
    aiPanelOpen: false,
    blockedMode: false,
    simulationMessages: [],
    simulationDebrief: null,
    simulationActive: false,
    simulationStartedAt: null,
    plagiarismReport: null,
    soutenanceData: null,
    auditData: null,
    coherenceData: null,
  },
  version: 5,
}
localStorage.clear()
localStorage.setItem('iris-thesis-ai-v3', JSON.stringify(state))
'ok'
