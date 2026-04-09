import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import NewStudentPage from '@/pages/NewStudentPage'
import StudentDetailPage from '@/pages/StudentDetailPage'
import EditStudentPage from '@/pages/EditStudentPage'
import NewSessionPage from '@/pages/NewSessionPage'
import EditSessionPage from '@/pages/EditSessionPage'
import SessionReportPage from '@/pages/SessionReportPage'
import ProgressReportPage from '@/pages/ProgressReportPage'
import SupervisorsPage from '@/pages/SupervisorsPage'
import SupervisorDetailPage from '@/pages/SupervisorDetailPage'
import SettingsPage from '@/pages/SettingsPage'
import AppLayout from '@/components/layout/AppLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const checkAuth = useAuthStore(s => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/students/new" element={<NewStudentPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
          <Route path="/students/:id/edit" element={<EditStudentPage />} />
          <Route path="/students/:id/session/new" element={<NewSessionPage />} />
          <Route path="/students/:id/session/:sessionId/edit" element={<EditSessionPage />} />
          <Route path="/students/:id/session/:sessionId/report" element={<SessionReportPage />} />
          <Route path="/students/:id/report" element={<ProgressReportPage />} />
          <Route path="/supervisors" element={<SupervisorsPage />} />
          <Route path="/supervisors/:id" element={<SupervisorDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
