import { Link } from 'react-router-dom'
import type { Student } from '@/types'
import { EPQ_MILESTONES } from '@/config'
import { formatHours, isSessionStarted } from '@/lib/formatters'

interface Props {
  student: Student
}

const SESSION_LABEL: Record<string, string> = {
  SA_MEETING: 'SA',
  TA_MEETING: 'TA',
  THEORY: 'Theory',
}

export default function StudentCard({ student }: Props) {
  // Last SA/TA meeting: past only (started), exclude THEORY
  const lastMeeting = [...student.sessions]
    .filter(s => (s.type === 'SA_MEETING' || s.type === 'TA_MEETING') && isSessionStarted(s))
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  const daysSinceLast = lastMeeting
    ? Math.floor((Date.now() - new Date(lastMeeting.date).getTime()) / 86400000)
    : null

  // Next SA meeting: not yet started, take earliest
  const nextSaMeeting = [...student.sessions]
    .filter(s => s.type === 'SA_MEETING' && !isSessionStarted(s))
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  const applicableMilestones = EPQ_MILESTONES.filter(
    m => !m.optional || student.milestones[m.id] !== 'na'
  )
  const completed = applicableMilestones.filter(m => student.milestones[m.id] === 'completed').length
  const progress = applicableMilestones.length > 0
    ? Math.round((completed / applicableMilestones.length) * 100)
    : 0

  // Dots: count started SA sessions only — SESSION count for dimming (次数)
  const pastSaCount = student.sessions.filter(
    s => s.type === 'SA_MEETING' && isSessionStarted(s)
  ).length

  // Label: remaining HOURS from started sessions only (小时数，与次数独立计算)
  const pastSaHoursUsed = student.sessions
    .filter(s => s.type === 'SA_MEETING' && isSessionStarted(s))
    .reduce((sum, s) => sum + s.durationMinutes / 60, 0)
  const saHoursRemaining = student.saHoursTotal - pastSaHoursUsed
  const saLow = saHoursRemaining <= 2

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
        <h2 className="font-semibold text-gray-900 text-sm leading-snug">
          {student.name}
          {student.nameEn && <span className="text-gray-400 font-normal ml-1.5">{student.nameEn}</span>}
        </h2>
        {student.submissionRound && (
          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
            {student.submissionRound}
          </span>
        )}
      </div>

      {student.overview && (
        <p className="text-xs font-semibold text-indigo-600 mb-0.5">{student.overview}</p>
      )}
      <p className="text-xs text-gray-500 mb-3 line-clamp-1 italic">{student.topic}</p>

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

      {/* SA dots */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: student.saHoursTotal }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < pastSaCount
                  ? 'bg-gray-200'
                  : saLow
                  ? 'bg-amber-400'
                  : 'bg-green-400'
              }`}
            />
          ))}
          <span className={`text-xs ml-1 ${saLow ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
            {formatHours(saHoursRemaining)} left
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-0.5 text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span>
          {lastMeeting
            ? `Last: ${SESSION_LABEL[lastMeeting.type]} · ${lastMeeting.date} (${daysSinceLast}d ago)`
            : 'No SA/TA meetings yet'}
        </span>
        {nextSaMeeting && (
          <span className="text-indigo-500">Next SA: {nextSaMeeting.date}</span>
        )}
      </div>

      {/* Other next sessions */}
      <div className="mt-1 flex flex-col gap-0.5 text-xs text-gray-400">
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
