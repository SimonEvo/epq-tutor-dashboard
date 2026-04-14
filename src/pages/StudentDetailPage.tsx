import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useStudentStore } from '@/stores/studentStore'
import { EPQ_MILESTONES } from '@/config'
import type { Student, MilestoneStatus, SessionType, SessionRecord, PersonalEntry, MindMap } from '@/types'
import MarkmapView, { type MarkmapHandle } from '@/components/MarkmapView'
import MindMapEditor from '@/components/MindMapEditor'
import { formatHours } from '@/lib/formatters'

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
  const { students, saveStudent, supervisors, isLoading, fetchAll, fetchSupervisors } = useStudentStore()

  const [student, setStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingBriefNote, setEditingBriefNote] = useState(false)
  const [briefNoteDraft, setBriefNoteDraft] = useState('')
  const [sessionFilter, setSessionFilter] = useState<'all' | SessionType>('all')
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [entryDrafts, setEntryDrafts] = useState<Record<string, { title: string; content: string }>>({})
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<string | null>(null)
  const entryRef = useRef<HTMLTextAreaElement>(null)

  // Mind Maps
  const [expandedMap, setExpandedMap] = useState<string | null>(null)
  const [editingMap, setEditingMap] = useState<string | null>(null)
  const [mapDrafts, setMapDrafts] = useState<Record<string, { title: string; content: string }>>({})
  const [confirmDeleteMap, setConfirmDeleteMap] = useState<string | null>(null)
  const [fullscreenMap, setFullscreenMap] = useState<MindMap | null>(null)
  const markmapModalRef = useRef<MarkmapHandle>(null)

  // Trigger data load when navigating directly to this page (refresh / new tab)
  useEffect(() => {
    if (students.length === 0 && !isLoading) {
      fetchAll()
      fetchSupervisors()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const found = students.find(s => s.id === id)
    if (found) setStudent(found)
  }, [students, id])

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  if (isLoading && !student) {
    return (
      <div className="p-6 text-gray-400 text-sm animate-pulse">Loading student…</div>
    )
  }

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

  // ── Mind Maps ─────────────────────────────────────────────────────────

  const addMindMap = async () => {
    const newMap: MindMap = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      date: today,
      title: '',
      content: '# 主题\n\n## 分支一\n\n- 要点\n\n## 分支二\n\n- 要点',
      createdAt: new Date().toISOString(),
    }
    const updated: Student = {
      ...student!,
      mindMaps: [newMap, ...(student!.mindMaps ?? [])],
    }
    setStudent(updated)
    setExpandedMap(newMap.id)
    setEditingMap(newMap.id)
    setMapDrafts(d => ({ ...d, [newMap.id]: { title: '', content: newMap.content } }))
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const saveMindMap = async (mapId: string) => {
    const draft = mapDrafts[mapId]
    if (!draft) return
    const updated: Student = {
      ...student!,
      mindMaps: (student!.mindMaps ?? []).map(m =>
        m.id === mapId ? { ...m, title: draft.title, content: draft.content } : m
      ),
    }
    setStudent(updated)
    setEditingMap(null)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const deleteMindMap = async (mapId: string) => {
    const updated: Student = {
      ...student!,
      mindMaps: (student!.mindMaps ?? []).filter(m => m.id !== mapId),
    }
    setStudent(updated)
    setConfirmDeleteMap(null)
    if (expandedMap === mapId) setExpandedMap(null)
    setSaving(true)
    await saveStudent(updated)
    setSaving(false)
  }

  const exportMapAsSVG = (title: string) => {
    const svgEl = markmapModalRef.current?.getSVGElement()
    if (!svgEl) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svgEl)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'mindmap'}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportMapAsPNG = (title: string) => {
    const svgEl = markmapModalRef.current?.getSVGElement()
    if (!svgEl) return
    const rect = svgEl.getBoundingClientRect()
    const w = rect.width || 1200
    const h = rect.height || 800
    const scale = 2 // retina quality

    const clone = svgEl.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(w))
    clone.setAttribute('height', String(h))

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(clone)
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const canvas = document.createElement('canvas')
    canvas.width = w * scale
    canvas.height = h * scale
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `${title || 'mindmap'}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
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
    setExpandedSessions(prev => { const next = new Set(prev); next.delete(sessionId); return next })
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

  // Compute per-type chronological numbers for display
  const sessionNumbers: Record<string, number> = {}
  const byType: Partial<Record<SessionType, typeof student.sessions>> = {}
  for (const s of [...student.sessions].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!byType[s.type]) byType[s.type] = []
    byType[s.type]!.push(s)
  }
  for (const list of Object.values(byType)) {
    list!.forEach((s, i) => { sessionNumbers[s.id] = i + 1 })
  }

  const TYPE_PREFIX: Record<SessionType, string> = {
    SA_MEETING: 'SA',
    TA_MEETING: 'TA',
    THEORY: 'TE',
  }

  function sessionDisplayTitle(s: SessionRecord) {
    if (s.title) return s.title
    return `${TYPE_PREFIX[s.type]} #${sessionNumbers[s.id]}`
  }

  // Last (past) and Next (future) sessions — reuse `today` defined above
  const pastSessions = sortedSessions.filter(s => s.date <= today)
  const futureSessions = sortedSessions.filter(s => s.date > today)
  const lastSession = pastSessions[0] ?? null
  const nextSession = futureSessions.length > 0 ? futureSessions[futureSessions.length - 1] : null

  const filteredSessions = sessionFilter === 'all'
    ? sortedSessions
    : sortedSessions.filter(s => s.type === sessionFilter)

  // SA hours remaining: count only past sessions, no intermediate rounding (let formatHours handle precision)
  const pastSaHoursUsed = student.sessions
    .filter(s => s.type === 'SA_MEETING' && s.date <= today)
    .reduce((sum, s) => sum + s.durationMinutes / 60, 0)
  const saRemaining = student.saHoursTotal - pastSaHoursUsed
  const supervisor = supervisors.find(s => s.id === student.supervisorId)

  return (
    <>
    {/* Fullscreen Mind Map Modal */}
    {fullscreenMap && (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <span className="text-sm font-medium text-gray-800 truncate flex-1">
            {fullscreenMap.title || '思维导图'}
            <span className="ml-2 text-xs text-gray-400 font-normal">{fullscreenMap.date}</span>
          </span>
          <button
            onClick={() => exportMapAsSVG(fullscreenMap.title)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            导出 SVG
          </button>
          <button
            onClick={() => exportMapAsPNG(fullscreenMap.title)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0"
          >
            导出 PNG
          </button>
          <button
            onClick={() => setFullscreenMap(null)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            ✕ 关闭
          </button>
        </div>
        {/* Modal map */}
        <div className="flex-1 overflow-hidden p-2">
          <MarkmapView
            ref={markmapModalRef}
            content={fullscreenMap.content}
            height={window.innerHeight - 64}
          />
        </div>
      </div>
    )}

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
            to={`/students/${student.id}/report`}
            className="text-sm px-4 py-2 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            生成进度报告
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
        <InfoCard label="SA Hours" value={`${formatHours(saRemaining)} / ${student.saHoursTotal}h`} alert={saRemaining <= 2} />
        <InfoCard label="Sessions" value={String(student.sessions.length)} />
        <InfoCard label="EPQ Progress" value={`${progress}%`} />
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex flex-col gap-1.5">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Last Session</p>
              <p className="text-base font-semibold text-gray-900">
                {lastSession
                  ? `${Math.floor((Date.now() - new Date(lastSession.date).getTime()) / 86400000)}d ago`
                  : '—'}
              </p>
            </div>
            <div className="border-t border-gray-100 pt-1.5">
              <p className="text-xs text-gray-400 mb-0.5">Next Session</p>
              <p className="text-base font-semibold text-indigo-600">
                {nextSession
                  ? `in ${Math.ceil((new Date(nextSession.date).getTime() - Date.now()) / 86400000)}d`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900 text-sm">Session Records ({student.sessions.length})</h2>
          <Link to={`/students/${student.id}/session/new`} className="text-xs text-indigo-600 hover:underline">+ Add</Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {([
            ['all', `All (${student.sessions.length})`],
            ['SA_MEETING', `SA (${student.sessions.filter(s => s.type === 'SA_MEETING').length})`],
            ['TA_MEETING', `TA (${student.sessions.filter(s => s.type === 'TA_MEETING').length})`],
            ['THEORY', `Taught Element (${student.sessions.filter(s => s.type === 'THEORY').length})`],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSessionFilter(val)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                sessionFilter === val
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filteredSessions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No sessions recorded yet.</p>
        ) : (
          <>
            {/* Expand / Collapse All */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  const allExpanded = filteredSessions.every(s => expandedSessions.has(s.id))
                  if (allExpanded) {
                    setExpandedSessions(new Set())
                  } else {
                    setExpandedSessions(new Set(filteredSessions.map(s => s.id)))
                  }
                }}
                className="text-xs text-gray-400 hover:text-indigo-600 transition-colors px-2 py-1"
              >
                {filteredSessions.every(s => expandedSessions.has(s.id)) ? '▲ Collapse All' : '▼ Expand All'}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {filteredSessions.map(session => (
                <div key={session.id} className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleSession(session.id)}
                  >
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SESSION_COLOR[session.type]}`}>
                      {SESSION_LABEL[session.type]}
                    </span>
                    {session.date > today && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 bg-sky-50 text-sky-500 border border-sky-200">
                        未开始
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {sessionDisplayTitle(session)}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {session.date}{session.time && ` ${session.time}`}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{session.durationMinutes} min</span>
                    <span className="ml-auto text-gray-300 text-xs shrink-0">{expandedSessions.has(session.id) ? '▲' : '▼'}</span>
                  </div>
                  {!expandedSessions.has(session.id) && session.summary && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-1">{session.summary}</p>
                  )}
                  {expandedSessions.has(session.id) && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                      {session.summary && <Detail label="Summary" content={session.summary} />}
                      {session.homework && <Detail label="Homework / Next steps" content={session.homework} />}
                      {session.transcript && <Detail label="Transcript" content={session.transcript} mono />}
                      {session.privateNotes && <Detail label="🔒 Private notes" content={session.privateNotes} />}
                      <div className="flex gap-2 pt-1 flex-wrap">
                        <Link
                          to={`/students/${student.id}/session/${session.id}/report`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                          生成课后报告
                        </Link>
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
          </>
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
                    <span className="text-gray-700 font-medium text-sm flex items-center gap-1.5">
                      {supervisor.name}
                      {supervisor.gender && <span className="text-gray-400 font-normal text-xs">{supervisor.gender}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${supervisor.saType === '中方SA' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {supervisor.saType ?? '英方SA'}
                      </span>
                    </span>
                    {supervisor.education && <span className="text-xs text-gray-500">{supervisor.education}</span>}
                    {supervisor.direction && <span className="text-xs text-gray-500">🎯 {supervisor.direction}</span>}
                    {supervisor.background && <span className="text-xs text-gray-400">💼 {supervisor.background}</span>}
                    {supervisor.notes && <span className="text-xs text-gray-400 italic">{supervisor.notes}</span>}
                  </div>
                </td>
              </tr>
            )}
            <InfoRow label="Gender" value={student.gender === 'Male' ? '男' : student.gender === 'Female' ? '女' : student.gender === 'Other' ? '其他' : student.gender} />
            <InfoRow label="School" value={student.school} />
            <InfoRow label="Current Grade" value={student.currentGrade} hint="Year 12 = final highschool year" />
            <InfoRow label="University Enrollment" value={student.universityEnrollment} />
            <InfoRow label="Submission Round" value={student.submissionRound} />
            <InfoRow label="理论课班期" value={student.taughtElementType} />
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

      {/* Mind Maps */}
      <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900">思维导图</h2>
          <button
            onClick={addMindMap}
            className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + 新建导图
          </button>
        </div>

        {(student.mindMaps ?? []).length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            暂无思维导图。点击"+ 新建导图"开始创建。
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(student.mindMaps ?? []).map(map => {
              const isExpanded = expandedMap === map.id
              const isEditing = editingMap === map.id
              const draft = mapDrafts[map.id] ?? { title: map.title, content: map.content }

              return (
                <div key={map.id}>
                  {/* Map header */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (isEditing) return
                      setExpandedMap(isExpanded ? null : map.id)
                    }}
                  >
                    <span className="text-xs text-gray-400 shrink-0 font-mono">{map.date}</span>
                    {isEditing ? (
                      <input
                        value={draft.title}
                        onChange={e => setMapDrafts(d => ({ ...d, [map.id]: { ...draft, title: e.target.value } }))}
                        onClick={e => e.stopPropagation()}
                        placeholder="导图标题…"
                        className="flex-1 text-sm font-medium text-gray-900 border-b border-indigo-300 focus:outline-none bg-transparent pb-0.5"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {map.title || <span className="text-gray-400 font-normal italic">未命名</span>}
                      </span>
                    )}
                    <span className="text-gray-300 text-xs ml-auto shrink-0">{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Map body */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {isEditing ? (
                        <>
                          <MindMapEditor
                            value={draft.content}
                            onChange={content => setMapDrafts(d => ({ ...d, [map.id]: { ...draft, content } }))}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => saveMindMap(map.id)}
                              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              保存并渲染
                            </button>
                            <button
                              onClick={() => setEditingMap(null)}
                              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <MarkmapView content={map.content} />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => setFullscreenMap(map)}
                              className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                            >
                              ⛶ 全屏查看 / 导出
                            </button>
                            <button
                              onClick={() => {
                                setEditingMap(map.id)
                                setMapDrafts(d => ({ ...d, [map.id]: { title: map.title, content: map.content } }))
                              }}
                              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              编辑
                            </button>
                            {confirmDeleteMap === map.id ? (
                              <>
                                <button
                                  onClick={() => deleteMindMap(map.id)}
                                  className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  确认删除
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteMap(null)}
                                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  取消
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteMap(map.id)}
                                className="text-xs px-3 py-1.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                删除
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





    </div>
    </>
  )
}

function InfoRow({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  if (!value) return null
  return (
    <tr className="border-t border-gray-50">
      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap w-44">
        {label}
        {hint && <span className="block text-xs text-gray-300 mt-0.5">{hint}</span>}
      </td>
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
