import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'

function BeijingClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  return <span className="text-xs text-gray-400 font-mono tabular-nums">{time} CST</span>
}

export default function AppLayout() {
  const logout = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link to="/" className="font-semibold text-gray-900 text-sm">📚 EPQ Tutor Dashboard</Link>
          <Link to="/supervisors" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Supervisors</Link>
          <Link to="/settings" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Settings</Link>
        </div>
        <div className="flex items-center gap-4">
          <BeijingClock />
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
