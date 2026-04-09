import { create } from 'zustand'
import * as dataService from '@/lib/dataService'
import type { Student, Supervisor } from '@/types'

interface StudentState {
  students: Student[]
  tags: string[]
  rounds: string[]
  supervisors: Supervisor[]
  isLoading: boolean
  error: string | null
  fetchAll: () => Promise<void>
  fetchTags: () => Promise<void>
  fetchRounds: () => Promise<void>
  fetchSupervisors: () => Promise<void>
  saveStudent: (student: Student) => Promise<void>
  deleteStudent: (id: string) => Promise<void>
  saveTags: (tags: string[]) => Promise<void>
  saveRounds: (rounds: string[]) => Promise<void>
  saveSupervisor: (supervisor: Supervisor) => Promise<void>
  deleteSupervisor: (id: string) => Promise<void>
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  tags: [],
  rounds: [],
  supervisors: [],
  isLoading: false,
  error: null,

  fetchAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const students = await dataService.listStudents()
      set({ students, isLoading: false })
    } catch (e) {
      set({ error: String(e), isLoading: false })
    }
  },

  fetchTags: async () => {
    const tags = await dataService.getTags()
    set({ tags })
  },

  fetchRounds: async () => {
    const rounds = await dataService.getRounds()
    set({ rounds })
  },

  fetchSupervisors: async () => {
    const supervisors = await dataService.listSupervisors()
    set({ supervisors })
  },

  saveStudent: async (student: Student) => {
    await dataService.saveStudent(student)
    const students = get().students
    const idx = students.findIndex(s => s.id === student.id)
    if (idx >= 0) {
      set({ students: students.map(s => s.id === student.id ? student : s) })
    } else {
      set({ students: [...students, student] })
    }
  },

  deleteStudent: async (id: string) => {
    await dataService.deleteStudent(id)
    set({ students: get().students.filter(s => s.id !== id) })
  },

  saveTags: async (tags: string[]) => {
    await dataService.saveTags(tags)
    set({ tags })
  },

  saveRounds: async (rounds: string[]) => {
    await dataService.saveRounds(rounds)
    set({ rounds })
  },

  saveSupervisor: async (supervisor: Supervisor) => {
    await dataService.saveSupervisor(supervisor)
    const existing = get().supervisors
    const idx = existing.findIndex(s => s.id === supervisor.id)
    set({ supervisors: idx >= 0 ? existing.map(s => s.id === supervisor.id ? supervisor : s) : [...existing, supervisor] })
  },

  deleteSupervisor: async (id: string) => {
    await dataService.deleteSupervisor(id)
    set({ supervisors: get().supervisors.filter(s => s.id !== id) })
  },
}))
