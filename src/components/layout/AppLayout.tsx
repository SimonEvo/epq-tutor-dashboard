import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AppLayout() {
  const logout = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-gray-900 text-sm">
          📚 EPQ Tutor Dashboard
        </Link>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
