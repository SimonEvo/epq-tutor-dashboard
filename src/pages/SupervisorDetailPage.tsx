import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'

export default function SupervisorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { supervisors, students, fetchSupervisors, fetchAll } = useStudentStore()

  useEffect(() => {
    fetchSupervisors()
    fetchAll()
  }, [fetchSupervisors, fetchAll])

  const sa = supervisors.find(s => s.id === id)
  const assignedStudents = students.filter(s => s.supervisorId === id)

  if (!sa) {
    return (
      <div className="p-6 text-gray-400 text-sm">
        Supervisor not found. <Link to="/supervisors" className="text-indigo-500 underline">Back</Link>
      </div>
    )
  }

  const totalSaHours = assignedStudents.reduce((sum, s) => sum + s.saHoursTotal, 0)
  const usedSaHours = assignedStudents.reduce((sum, s) => sum + s.saHoursUsed, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/supervisors" className="text-gray-400 hover:text-gray-600 text-sm">← Supervisors</Link>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {sa.name}
            {sa.gender && <span className="text-gray-400 font-normal text-lg ml-2">{sa.gender}</span>}
          </h1>
          {sa.direction && <p className="text-gray-500 text-sm mt-0.5">🎯 {sa.direction}</p>}
        </div>
        <Link
          to="/supervisors"
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <InfoCard label="Students" value={String(assignedStudents.length)} />
        <InfoCard label="Total SA Hours" value={`${usedSaHours.toFixed(1)} / ${totalSaHours}`} />
        <InfoCard label="SA Hours Remaining" value={String(totalSaHours - usedSaHours)} alert={totalSaHours - usedSaHours <= 3} />
      </div>

      {/* SA profile — locked */}
      <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">🔒 Supervisor Profile</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <InfoRow label="Education" value={sa.education} />
            <InfoRow label="Work Background" value={sa.background} />
            <InfoRow label="Tutoring Direction" value={sa.direction} />
            <InfoRow label="Notes" value={sa.notes} />
          </tbody>
        </table>
      </div>

      {/* Assigned students */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">
            Assigned Students <span className="text-gray-400 font-normal">({assignedStudents.length})</span>
          </h2>
        </div>

        {assignedStudents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No students assigned yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {assignedStudents.map(student => {
              const saLeft = student.saHoursTotal - student.saHoursUsed
              const lastSession = [...student.sessions].sort((a, b) => b.date.localeCompare(a.date))[0]
              const daysSince = lastSession
                ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / 86400000)
                : null

              return (
                <Link
                  key={student.id}
                  to={`/students/${student.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {student.name}
                      {student.nameEn && <span className="text-gray-400 font-normal ml-1.5 text-xs">{student.nameEn}</span>}
                      {student.overview && <span className="ml-2 text-xs font-semibold text-indigo-600">{student.overview}</span>}
                    </p>
                    <p className="text-xs text-gray-400 italic truncate">{student.topic}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <span className={saLeft <= 2 ? 'text-amber-600 font-medium' : ''}>
                      SA {saLeft}h left
                    </span>
                    <span>{daysSince !== null ? `${daysSince}d ago` : 'No sessions'}</span>
                    <span className="text-gray-300">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${alert ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <tr className="border-t border-gray-50">
      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">{label}</td>
      <td className="px-4 py-2.5 text-gray-700">{value}</td>
    </tr>
  )
}
