export type SessionType = 'SA_MEETING' | 'TA_MEETING' | 'THEORY'

export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'na'

export interface SessionRecord {
  id: string
  type: SessionType
  date: string // ISO date string YYYY-MM-DD
  durationMinutes: number
  summary: string
  homework: string
  transcript: string
  privateNotes: string
  createdAt: string
}

export interface MilestoneProgress {
  [key: string]: MilestoneStatus // MilestoneId -> status
}

export interface Student {
  id: string
  name: string
  topic: string
  tags: string[]
  saHoursTotal: number      // SA hour quota
  saHoursUsed: number       // auto-computed from SA session records
  nextSaSession?: string    // ISO date string
  nextTaSession?: string    // ISO date string
  nextTheorySession?: string // ISO date string
  availabilityNote: string  // e.g. "Exam prep until June"
  briefNote: string         // one-liner shown on card
  privateNotes: string      // never exported
  milestones: MilestoneProgress
  sessions: SessionRecord[]
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
