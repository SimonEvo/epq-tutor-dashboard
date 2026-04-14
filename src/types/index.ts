export type SessionType = 'SA_MEETING' | 'TA_MEETING' | 'THEORY'

export interface Supervisor {
  id: string
  name: string
  gender?: string
  education?: string
  background?: string
  direction?: string
  notes?: string
  saType?: '英方SA' | '中方SA'  // defaults to 英方SA when unset
}

export interface PersonalEntry {
  id: string
  date: string   // YYYY-MM-DD
  title: string  // topic/theme
  content: string // markdown
  createdAt: string
}

export interface MindMap {
  id: string
  date: string      // YYYY-MM-DD
  title: string
  content: string   // markdown — rendered by markmap
  createdAt: string
}

export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'na'

export interface SessionRecord {
  id: string
  type: SessionType
  date: string // ISO date string YYYY-MM-DD
  time?: string // HH:MM
  durationMinutes: number
  title?: string  // e.g. "SA #3" — auto-generated at creation, editable
  summary: string
  homework: string
  transcript: string
  privateNotes: string
  createdAt: string
  generatedReport?: string   // cached AI-generated parent report
  reportGeneratedAt?: string // ISO timestamp of when it was generated
}

export interface MilestoneProgress {
  [key: string]: MilestoneStatus // MilestoneId -> status
}

export interface Student {
  id: string
  name: string
  nameEn?: string
  gender?: string
  school?: string
  submissionRound?: string
  taughtElementType?: string
  universityAspiration?: string
  currentGrade?: string
  universityEnrollment?: string
  contact?: string
  supervisorId?: string
  topic: string
  overview?: string
  personalEntries: PersonalEntry[]
  mindMaps: MindMap[]
  tags: string[]
  saHoursTotal: number      // SA hour quota
  saHoursUsed: number       // auto-computed from SA session records
  nextSaSession?: string    // ISO date string
  nextTaSession?: string    // ISO date string
  nextTheorySession?: string // ISO date string
  availabilityNote: string  // e.g. "Exam prep until June"
  briefNote: string         // one-liner shown on card
  privateNotes: string      // never exported
  tencentDocUrl?: string    // shared Tencent Doc URL for this student's WeChat group
  milestones: MilestoneProgress
  sessions: SessionRecord[]
  generatedProgressReport?: string    // cached AI-generated progress report
  progressReportGeneratedAt?: string  // ISO timestamp of when it was generated
  createdAt: string
  updatedAt: string
}

export interface StudentSummary {
  id: string
  name: string
  topic: string
  tags: string[]
  saHoursTotal: number
  saHoursUsed: number
  nextSaSession?: string
  nextTaSession?: string
  nextTheorySession?: string
  availabilityNote: string
  briefNote: string
  lastSessionDate?: string
  lastSessionType?: SessionType
  milestones: MilestoneProgress
}

// Global tag library stored in config/tags.json
export interface TagsConfig {
  tags: string[]
}

// ─── Weekly Report ────────────────────────────────────────────────────────────

export interface StudentReportCacheEntry {
  updatedAt: string  // snapshot of student.updatedAt at last scan
  alias: string      // e.g. "学生A" — stable across scans
}

export interface WeeklyReportData {
  generatedAt: string   // ISO timestamp
  content: string       // decoded report text (real names restored)
  cache: {
    lastScanAt: string
    students: Record<string, StudentReportCacheEntry>  // keyed by student id
  }
}
