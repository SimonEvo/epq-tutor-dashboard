import { create } from 'zustand'
import { PAT_STORAGE_KEY } from '@/config'
import { resetClient } from '@/lib/githubClient'
import { verifyAuth } from '@/lib/dataService'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  login: (pat: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,

  login: async (pat: string) => {
    localStorage.setItem(PAT_STORAGE_KEY, pat)
    resetClient()
    const ok = await verifyAuth()
    if (ok) {
      set({ isAuthenticated: true })
    } else {
      localStorage.removeItem(PAT_STORAGE_KEY)
      resetClient()
    }
    return ok
  },

  logout: () => {
    localStorage.removeItem(PAT_STORAGE_KEY)
    resetClient()
    set({ isAuthenticated: false })
  },

  checkAuth: async () => {
    const pat = localStorage.getItem(PAT_STORAGE_KEY)
    if (!pat) {
      set({ isAuthenticated: false, isLoading: false })
      return
    }
    resetClient()
    const ok = await verifyAuth()
    set({ isAuthenticated: ok, isLoading: false })
  },
}))
