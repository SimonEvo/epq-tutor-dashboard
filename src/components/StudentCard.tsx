import { Link } from 'react-router-dom'
import type { Student } from '@/types'
import { EPQ_MILESTONES } from '@/config'

interface Props {
  student: Student
}

const SESSION_LABEL: Record<string, string> = {
  SA_MEETING: 'SA',
  TA_MEETING: 'TA',
  THEORY: 'Theory',
}

export default function StudentCard({ student }: Props) {
  const lastSession = [...student.sessions].sort((a, b) => b.date.localeCompare(a.date))[0]
  const daysSinceLast = lastSession
    ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / 86400000)
    : null

  const applicableMilestones = EPQ_MILESTONES.filter(
    m => !m.optional || student.milestones[m.id] !== 'na'
  )
  const completed = applicableMilestones.filter(m => student.milestones[m.id] === 'completed').length
  const progress = applicableMilestones.length > 0
    ? Math.round((completed / applicableMilestones.length) * 100)
    : 0

  const saRemaining = student.saHoursTotal - student.saHoursUsed
  const saLow = saRemaining <= 2

  const urgencyColor = daysSinceLast === null
    ? 'border-l-gray-200'
    : daysSinceLast > 14
    ? 'border-l-red-400'
    : daysSinceLast > 7
    ? 'border-l-amber-400'
    : 'border-l-green-400'

  return (
    <Link
      to={`/students/${student.id}`}
      className={`block bg-white rounded-xl border border-gray-200 border-l-4 ${urgencyColor} p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="font-semibold text-gray-900 text-sm leading-snug">{student.name}</h2>
        {saLow && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
            SA ⚠️ {saRemaining}h
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-1">{student.topic}</p>

      {/* Tags */}
      {student.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {student.tags.map(tag => (
            <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Availability note */}
      {student.availabilityNote && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mb-3">
          📅 {student.availabilityNote}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>EPQ Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span>
          {lastSession
            ? `Last: ${SESSION_LABEL[lastSession.type]} · ${daysSinceLast}d ago`
            : 'No sessions yet'}
        </span>
        {!saLow && (
          <span>SA {saRemaining}h left</span>
        )}
      </div>

      {/* Next sessions */}
      <div className="mt-2 flex flex-col gap-0.5 text-xs text-gray-500">
        {student.nextSaSession && <span>📌 SA: {student.nextSaSession}</span>}
        {student.nextTaSession && <span>📌 TA: {student.nextTaSession}</span>}
        {student.nextTheorySession && <span>📌 Theory: {student.nextTheorySession}</span>}
      </div>

      {/* Brief note */}
      {student.briefNote && (
        <p className="mt-2 text-xs text-gray-500 italic line-clamp-1">{student.briefNote}</p>
      )}
    </Link>
  )
}
