import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import type { SessionRecord, SessionType, Student } from '@/types'

export default function EditSessionPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const navigate = useNavigate()
  const { students, saveStudent } = useStudentStore()

  const student = students.find(s => s.id === id)
  const session = student?.sessions.find(s => s.id === sessionId)

  const [type, setType] = useState<SessionType>(session?.type ?? 'TA_MEETING')
  const [date, setDate] = useState(session?.date ?? '')
  const [time, setTime] = useState(session?.time ?? '')
  const [duration, setDuration] = useState(session?.durationMinutes ?? 60)
  const [title, setTitle] = useState(session?.title ?? '')
  const [summary, setSummary] = useState(session?.summary ?? '')
  const [homework, setHomework] = useState(session?.homework ?? '')
  const [transcript, setTranscript] = useState(session?.transcript ?? '')
  const [privateNotes, setPrivateNotes] = useState(session?.privateNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!student || !session) {
    return (
      <div className="p-6 text-gray-400 text-sm">
        Session not found. <Link to="/" className="text-indigo-500 underline">Back to dashboard</Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updatedSession: SessionRecord = {
        ...session,
        type,
        date,
        time: time || undefined,
        durationMinutes: duration,
        title: title.trim(),
        summary: summary.trim(),
        homework: homework.trim(),
        transcript: transcript.trim(),
        privateNotes: privateNotes.trim(),
      }
      const updatedSessions = student.sessions.map(s =>
        s.id === sessionId ? updatedSession : s
      )
      const saHoursUsed = updatedSessions
        .filter(s => s.type === 'SA_MEETING')
        .reduce((sum, s) => sum + s.durationMinutes / 60, 0)

      const updated: Student = {
        ...student,
        sessions: updatedSessions,
        saHoursUsed: Math.round(saHoursUsed * 10) / 10,
      }
      await saveStudent(updated)
      navigate(`/students/${student.id}`)
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const saRemaining = student.saHoursTotal - student.saHoursUsed

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/students/${student.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {student.name}{student.nameEn ? ` · ${student.nameEn}` : ''}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Edit Session</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-5">

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Session Type</label>
          <div className="flex gap-2">
            {(['SA_MEETING', 'TA_MEETING', 'THEORY'] as SessionType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  type === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {t === 'SA_MEETING' ? 'SA Meeting' : t === 'TA_MEETING' ? 'TA Meeting' : 'Taught Element'}
              </button>
            ))}
          </div>
          {type === 'SA_MEETING' && (
            <p className={`text-xs mt-2 ${saRemaining <= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
              SA hours remaining: <strong>{saRemaining}</strong> / {student.saHoursTotal}
              {saRemaining <= 2 && ' ⚠️ Running low'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={inputCls} required />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className={inputCls} />
          </Field>
          <Field label="Duration (minutes)">
            <input type="number" min={1} value={duration}
              onChange={e => setDuration(Number(e.target.value))} className={inputCls} required />
          </Field>
        </div>

        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. SA #3"
            className={inputCls}
          />
        </Field>

        <Field label="Summary" hint="What did you cover in this session?">
          <textarea value={summary} onChange={e => setSummary(e.target.value)}
            rows={3} className={inputCls} />
        </Field>

        <Field label="Homework / Next steps" hint="What should the student do before next session?">
          <textarea value={homework} onChange={e => setHomework(e.target.value)}
            rows={2} className={inputCls} />
        </Field>

        <Field label="Meeting Transcript" hint="Paste Zoom transcript or notes here">
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            rows={6} className={`${inputCls} font-mono text-xs`} />
        </Field>

        <Field label="Private Notes" hint="Never exported or shared">
          <textarea value={privateNotes} onChange={e => setPrivateNotes(e.target.value)}
            rows={2} className={inputCls} />
        </Field>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link to={`/students/${student.id}`}
            className="text-sm px-5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}
