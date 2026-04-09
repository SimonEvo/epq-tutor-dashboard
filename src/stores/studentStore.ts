import { create } from 'zustand'
import * as dataService from '@/lib/dataService'
import type { Student } from '@/types'

interface StudentState {
  students: Student[]
  tags: string[]
  isLoading: boolean
  error: string | null
  fetchAll: () => Promise<void>
  fetchTags: () => Promise<void>
  saveStudent: (student: Student) => Promise<void>
  deleteStudent: (id: string) => Promise<void>
  saveTags: (tags: string[]) => Promise<void>
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  tags: [],
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
}))
