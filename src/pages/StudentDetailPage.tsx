import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useStudentStore } from '@/stores/studentStore'
import { EPQ_MILESTONES } from '@/config'
import type { Student, MilestoneStatus, SessionType, PersonalEntry } from '@/types'

const SESSION_LABEL: Record<SessionType, string> = {
  SA_MEETING: 'SA',
  TA_MEETING: 'TA',
  THEORY: 'Taught Element',
}

const SESSION_COLOR: Record<SessionType, string> = {
  SA_MEETING: 'bg-purple-100 text-purple-700',
  TA_MEETING: 'bg-blue-100 text-blue-700',
  THEORY: 'bg-green-100 text-green-700',
}

const MILESTONE_STYLE: Record<MilestoneStatus, string> = {
  not_started: 'bg-gray-100 text-gray-400 border-gray-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
  na: 'bg-gray-50 text-gray-300 border-gray-100 line-through',
}

const MILESTONE_ICON: Record<MilestoneStatus, string> = {
  not_started: '○',
  in_progress: '◑',
  completed: '●',
  na: '—',
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { students, saveStudent, supervisors } = useStudentStore()

  const [student, setStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingBriefNote, setEditingBriefNote] = useState(false)
  const [briefNoteDraft, setBriefNoteDraft] = useState('')
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [entryDrafts, setEntryDrafts] = useState<Record<string, { title: string; content: string }>>({})
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<string | null>(null)
  const entryRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const found = students.find(s => s.id === id)
    if (found) setStudent(found)
  }, [students, id])

  if (!student) {
    return (
      <div className="p-6 text-gray-400 text-sm">
        Student not found. <Link to="/" className="text-indigo-500 underline">Back to dashboard</Link>
      </div>
    )
  }

  // ── Milestones ───────────────────────────────────────────────────────

  const applicableMilestones = EPQ_MILESTONES.filter(
    m => !m.optional || student.milestones[m.id] !== 'na'
  )
  const completedCount = applicableMilestones.filter(m => student.milestones[m.id] === 'completed').length
  const progress = applicableMilestones.length > 0
    ? Math.round((completedCount / applicableMilestones.length) * 100)
    : 0

  const cycleMilestone = async (milestoneId: string, isOptional: boolean) => {
    const current: MilestoneStatus = student.milestones[milestoneId] ?? 'not_started'
    const cycle: Record<MilestoneStatus, MilestoneStatus> = isOptional
      ? { not_started: 'in_progress', in_progress: 'completed', completed: 'na', na: 'not_started' }
      : { not_started: 'in_progress', in_progress: 'completed', completed: 'not_started', na: 'not_started' }
    const updated: Student = {
      ...student,
      milestones: { ...student.milestones, [milestoneId]: cycle[current] },
    }
    setStudent(updated)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  // ── Sessions ─────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10)

  const addEntry = async () => {
    const newEntry: PersonalEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      date: today,
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
    }
    const updated: Student = {
      ...student!,
      personalEntries: [newEntry, ...(student!.personalEntries ?? [])],
    }
    setStudent(updated)
    setExpandedEntry(newEntry.id)
    setEditingEntry(newEntry.id)
    setEntryDrafts(d => ({ ...d, [newEntry.id]: { title: '', content: '' } }))
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
    setTimeout(() => entryRef.current?.focus(), 50)
  }

  const saveEntry = async (entryId: string) => {
    const draft = entryDrafts[entryId]
    if (!draft) return
    const updated: Student = {
      ...student!,
      personalEntries: (student!.personalEntries ?? []).map(e =>
        e.id === entryId ? { ...e, title: draft.title, content: draft.content } : e
      ),
    }
    setStudent(updated)
    setEditingEntry(null)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const deleteEntry = async (entryId: string) => {
    const updated: Student = {
      ...student!,
      personalEntries: (student!.personalEntries ?? []).filter(e => e.id !== entryId),
    }
    setStudent(updated)
    setConfirmDeleteEntry(null)
    setExpandedEntry(null)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const deleteSession = async (sessionId: string) => {
    const updatedSessions = student.sessions.filter(s => s.id !== sessionId)
    const saHoursUsed = updatedSessions
      .filter(s => s.type === 'SA_MEETING')
      .reduce((sum, s) => sum + s.durationMinutes / 60, 0)
    const updated: Student = {
      ...student,
      sessions: updatedSessions,
      saHoursUsed: Math.round(saHoursUsed * 10) / 10,
    }
    setStudent(updated)
    setConfirmDelete(null)
    setExpandedSession(null)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const saveBriefNote = async () => {
    const updated: Student = { ...student!, briefNote: briefNoteDraft }
    setStudent(updated)
    setEditingBriefNote(false)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const sortedSessions = [...student.sessions].sort((a, b) => b.date.localeCompare(a.date))
  const saRemaining = student.saHoursTotal - student.saHoursUsed
  const supervisor = supervisors.find(s => s.id === student.supervisorId)

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
            {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {student.name}
            {student.nameEn && <span className="text-gray-400 font-normal text-lg ml-2">{student.nameEn}</span>}
            {student.overview && <span className="ml-3 text-sm font-semibold text-indigo-600">{student.overview}</span>}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 max-w-xl italic">{student.topic}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            to={`/students/${student.id}/session/new`}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Session
          </Link>
          <Link
            to={`/students/${student.id}/edit`}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Brief Note — inline editable */}
      <div className="mb-5">
        {editingBriefNote ? (
          <div className="flex gap-2 items-start">
            <textarea
              autoFocus
              value={briefNoteDraft}
              onChange={e => setBriefNoteDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveBriefNote() } if (e.key === 'Escape') setEditingBriefNote(false) }}
              rows={2}
              placeholder="Brief note shown on dashboard card…"
              className="flex-1 text-sm border border-indigo-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex flex-col gap-1.5">
              <button onClick={saveBriefNote} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
              <button onClick={() => setEditingBriefNote(false)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setBriefNoteDraft(student.briefNote); setEditingBriefNote(true) }}
            className="w-full text-left group"
          >
            {student.briefNote ? (
              <p className="text-sm text-gray-600 italic border border-transparent rounded-lg px-3 py-2 group-hover:border-gray-200 group-hover:bg-gray-50 transition-colors">
                {student.briefNote}
              </p>
            ) : (
              <p className="text-sm text-gray-300 italic border border-dashed border-gray-200 rounded-lg px-3 py-2 group-hover:border-gray-300 transition-colors">
                Add a brief note…
              </p>
            )}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <InfoCard label="SA Hours" value={`${saRemaining} / ${student.saHoursTotal}`} alert={saRemaining <= 2} />
        <InfoCard label="Sessions" value={String(student.sessions.length)} />
        <InfoCard label="EPQ Progress" value={`${progress}%`} />
        <InfoCard
          label="Last Session"
          value={sortedSessions[0]
            ? `${Math.floor((Date.now() - new Date(sortedSessions[0].date).getTime()) / 86400000)}d ago`
            : '—'}
        />
      </div>

      {/* Student info table */}
      <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">🔒 Student Info</h2>
          <Link to={`/students/${student.id}/edit`} className="text-xs text-indigo-500 hover:underline">Edit</Link>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <InfoRow label="Overview" value={student.overview} />
            {supervisor && (
              <tr className="border-t border-gray-50">
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">Supervisor (SA)</td>
                <td className="px-4 py-2.5">
                  <div className="inline-flex flex-col gap-0.5">
                    <span className="text-gray-700 font-medium text-sm">{supervisor.name}
                      {supervisor.gender && <span className="text-gray-400 font-normal text-xs ml-1.5">{supervisor.gender}</span>}
                    </span>
                    {supervisor.education && <span className="text-xs text-gray-500">{supervisor.education}</span>}
                    {supervisor.direction && <span className="text-xs text-gray-500">🎯 {supervisor.direction}</span>}
                    {supervisor.background && <span className="text-xs text-gray-400">💼 {supervisor.background}</span>}
                    {supervisor.notes && <span className="text-xs text-gray-400 italic">{supervisor.notes}</span>}
                  </div>
                </td>
              </tr>
            )}
            <InfoRow label="Gender" value={student.gender} />
            <InfoRow label="School" value={student.school} />
            <InfoRow label="Current Grade" value={student.currentGrade} />
            <InfoRow label="University Enrollment" value={student.universityEnrollment} />
            <InfoRow label="Submission Round" value={student.submissionRound} />
            <InfoRow label="Taught Element Type" value={student.taughtElementType} />
            <InfoRow label="University Aspiration" value={student.universityAspiration} />
            <InfoRow label="Contact" value={student.contact} />
            {student.tags.length > 0 && (
              <tr className="border-t border-gray-50">
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">Tags</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5 flex-wrap">
                    {student.tags.map(tag => (
                      <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {student.availabilityNote && (
              <tr className="border-t border-gray-50">
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">Availability</td>
                <td className="px-4 py-2.5 text-amber-700">📅 {student.availabilityNote}</td>
              </tr>
            )}
            {(student.nextSaSession || student.nextTaSession || student.nextTheorySession) && (
              <tr className="border-t border-gray-50">
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">Next Sessions</td>
                <td className="px-4 py-2.5 text-gray-700 flex flex-col gap-0.5">
                  {student.nextSaSession && <span>SA: {student.nextSaSession}</span>}
                  {student.nextTaSession && <span>TA: {student.nextTaSession}</span>}
                  {student.nextTheorySession && <span>Taught Element: {student.nextTheorySession}</span>}
                </td>
              </tr>
            )}
            {student.privateNotes && (
              <tr className="border-t border-gray-50 bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">🔒 Private</td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-pre-wrap">{student.privateNotes}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Personal Entries */}
      <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">🔒 Personal Entries</h2>
          <button
            onClick={addEntry}
            className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Entry
          </button>
        </div>

        {(student.personalEntries ?? []).length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            No entries yet. Click "+ New Entry" to start.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(student.personalEntries ?? []).map(entry => {
              const isExpanded = expandedEntry === entry.id
              const isEditing = editingEntry === entry.id
              const draft = entryDrafts[entry.id] ?? { title: entry.title, content: entry.content }

              return (
                <div key={entry.id}>
                  {/* Entry header */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (isEditing) return
                      setExpandedEntry(isExpanded ? null : entry.id)
                    }}
                  >
                    <span className="text-xs text-gray-400 shrink-0 font-mono">{entry.date}</span>
                    {isEditing ? (
                      <input
                        value={draft.title}
                        onChange={e => setEntryDrafts(d => ({ ...d, [entry.id]: { ...draft, title: e.target.value } }))}
                        onClick={e => e.stopPropagation()}
                        placeholder="Entry title / topic…"
                        className="flex-1 text-sm font-medium text-gray-900 border-b border-indigo-300 focus:outline-none bg-transparent pb-0.5"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {entry.title || <span className="text-gray-400 font-normal italic">Untitled</span>}
                      </span>
                    )}
                    <span className="text-gray-300 text-xs ml-auto shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Entry body */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {isEditing ? (
                        <>
                          <textarea
                            ref={entryRef}
                            value={draft.content}
                            onChange={e => setEntryDrafts(d => ({ ...d, [entry.id]: { ...draft, content: e.target.value } }))}
                            rows={8}
                            placeholder="Write in Markdown…&#10;&#10;**Bold**, *italic*, `code`&#10;- list item"
                            className="w-full text-sm font-mono text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => saveEntry(entry.id)}
                              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingEntry(null); setEntryDrafts(d => ({ ...d, [entry.id]: { title: entry.title, content: entry.content } })) }}
                              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {entry.content ? (
                            <div className="prose prose-sm max-w-none text-gray-700 mb-3">
                              <ReactMarkdown>{entry.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-gray-400 text-sm italic mb-3">No content yet.</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingEntry(entry.id)
                                setEntryDrafts(d => ({ ...d, [entry.id]: { title: entry.title, content: entry.content } }))
                                setTimeout(() => entryRef.current?.focus(), 50)
                              }}
                              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Edit
                            </button>
                            {confirmDeleteEntry === entry.id ? (
                              <>
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  Confirm delete
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteEntry(null)}
                                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteEntry(entry.id)}
                                className="text-xs px-3 py-1.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* EPQ Milestones */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900 text-sm">EPQ Milestones</h2>
          <span className="text-xs text-gray-400">{completedCount} / {applicableMilestones.length} completed</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {EPQ_MILESTONES.map(m => {
            const status: MilestoneStatus = student.milestones[m.id] ?? 'not_started'
            return (
              <button
                key={m.id}
                onClick={() => cycleMilestone(m.id, m.optional)}
                title={m.optional ? 'Optional — click to cycle (includes N/A)' : 'Click to cycle status'}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${MILESTONE_STYLE[status]}`}
              >
                {MILESTONE_ICON[status]} {m.label}
                {m.optional && <span className="ml-1 opacity-50">(opt)</span>}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Click to cycle: ○ Not started → ◑ In progress → ● Completed
          <span className="text-gray-300"> · Optional nodes also have — N/A</span>
        </p>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-900 text-sm">Session Records ({student.sessions.length})</h2>
          <Link to={`/students/${student.id}/session/new`} className="text-xs text-indigo-600 hover:underline">+ Add</Link>
        </div>

        {sortedSessions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No sessions recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedSessions.map(session => (
              <div key={session.id} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                >
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SESSION_COLOR[session.type]}`}>
                    {SESSION_LABEL[session.type]}
                  </span>
                  <span className="text-sm text-gray-700">
                    {session.date}{session.time && ` ${session.time}`}
                  </span>
                  <span className="text-xs text-gray-400">{session.durationMinutes} min</span>
                  <span className="ml-auto text-gray-300 text-xs">{expandedSession === session.id ? '▲' : '▼'}</span>
                </div>
                {session.summary && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-1">{session.summary}</p>
                )}
                {expandedSession === session.id && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                    {session.summary && <Detail label="Summary" content={session.summary} />}
                    {session.homework && <Detail label="Homework / Next steps" content={session.homework} />}
                    {session.transcript && <Detail label="Transcript" content={session.transcript} mono />}
                    {session.privateNotes && <Detail label="🔒 Private notes" content={session.privateNotes} />}
                    <div className="flex gap-2 pt-1">
                      <Link
                        to={`/students/${student.id}/session/${session.id}/edit`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </Link>
                      {confirmDelete === session.id ? (
                        <>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                          >
                            Confirm delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(session.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => navigate(`/students/${student.id}/export`)}
          className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export summary →
        </button>
      </div>
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

function InfoCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${alert ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function Detail({ label, content, mono }: { label: string; content: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm text-gray-700 whitespace-pre-wrap ${mono ? 'font-mono text-xs bg-gray-50 p-2 rounded-lg' : ''}`}>
        {content}
      </p>
    </div>
  )
}
