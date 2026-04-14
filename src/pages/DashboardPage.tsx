import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import StudentCard from '@/components/StudentCard'
import AICommandCenter from '@/components/AICommandCenter'
import type { Student, WeeklyReportData } from '@/types'
import { formatHours } from '@/lib/formatters'
import { generateWeeklyReport, getWeeklyReportData } from '@/lib/weeklyReportService'

export default function DashboardPage() {
  const { students, tags, rounds, supervisors, isLoading, error, fetchAll, fetchTags, fetchRounds, fetchSupervisors } = useStudentStore()
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [selectedRound, setSelectedRound] = useState<string>('')
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'lastSession'>('lastSession')

  // Stats modal
  const [showStats, setShowStats] = useState(false)
  const [statsCutoff, setStatsCutoff] = useState(new Date().toISOString().slice(0, 10))

  // Weekly report modal
  const [showReport, setShowReport] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportData | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    fetchAll()
    fetchTags()
    fetchRounds()
    fetchSupervisors()
    // Load cached weekly report silently
    getWeeklyReportData().then(d => { if (d) setWeeklyReport(d) }).catch(() => {})
  }, [fetchAll, fetchTags, fetchRounds, fetchSupervisors])

  const filtered = students
    .filter(s => !selectedTag || s.tags.includes(selectedTag))
    .filter(s => !selectedRound || s.submissionRound === selectedRound)
    .filter(s => !selectedSupervisor || s.supervisorId === selectedSupervisor)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      const lastA = getLastSession(a)
      const lastB = getLastSession(b)
      if (!lastA) return -1
      if (!lastB) return 1
      return lastA < lastB ? -1 : 1
    })

  if (isLoading) return <div className="p-8 text-gray-500 text-sm">Loading students…</div>
  if (error) return <div className="p-8 text-red-500 text-sm">Error: {error}</div>

  // Compute stats: only 英方SA students (determined by supervisor's saType, default 英方SA)
  const statsRows = students
    .filter(s => {
      const supervisor = supervisors.find(sv => sv.id === s.supervisorId)
      return !supervisor || supervisor.saType !== '中方SA'
    })
    .map(s => {
      const supervisor = supervisors.find(sv => sv.id === s.supervisorId)
      const doneSessions = s.sessions.filter(
        sess => sess.type === 'SA_MEETING' && sess.date <= statsCutoff
      )
      const sessionCount = doneSessions.length
      const totalMins = doneSessions.reduce((sum, sess) => sum + sess.durationMinutes, 0)
      const pastSaHours = totalMins / 60
      const saRemaining = s.saHoursTotal - pastSaHours
      return { s, supervisor, sessionCount, totalMins, pastSaHours, saRemaining }
    })
    .sort((a, b) => a.s.name.localeCompare(b.s.name))

  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    setReportError('')
    try {
      const result = await generateWeeklyReport(students)
      setWeeklyReport(result)
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e))
    } finally {
      setGeneratingReport(false)
    }
  }

  const copyStatsText = () => {
    const header = `课时统计（截止 ${statsCutoff}）\n${'─'.repeat(60)}`
    const rows = statsRows.map(({ s, supervisor, sessionCount, totalMins, pastSaHours, saRemaining }) =>
      [
        s.name + (s.nameEn ? ` (${s.nameEn})` : ''),
        `${supervisor?.saType ?? '英方SA'}  SA已用 ${formatHours(pastSaHours)} / 共 ${s.saHoursTotal}h  剩余 ${formatHours(saRemaining)}`,
        `共 ${sessionCount} 节课  总时长 ${formatHours(totalMins / 60)}`,
      ].join('\n')
    ).join('\n\n')
    navigator.clipboard.writeText(header + '\n\n' + rows)
  }

  return (
    <>
    {/* Stats modal */}
    {showStats && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-16 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h2 className="text-base font-semibold text-gray-900">统计课时</h2>
            <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          {/* Cutoff date picker */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
            <label className="text-sm text-gray-600 shrink-0">截止日期</label>
            <input
              type="date"
              value={statsCutoff}
              onChange={e => setStatsCutoff(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-400">仅统计英方SA学生（共 {statsRows.length} 人）</span>
            <button
              onClick={copyStatsText}
              className="ml-auto text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              复制文本
            </button>
          </div>

          {/* Table */}
          <div className="overflow-y-auto flex-1">
            {statsRows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">暂无英方SA学生数据</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium">学生</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium">SA信息</th>
                    <th className="px-4 py-2.5 text-right text-xs text-gray-400 font-medium">课时数</th>
                    <th className="px-4 py-2.5 text-right text-xs text-gray-400 font-medium">总时长</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {statsRows.map(({ s, supervisor, sessionCount, totalMins, pastSaHours, saRemaining }) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        {s.nameEn && <p className="text-xs text-gray-400">{s.nameEn}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {supervisor && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 mr-1.5">{supervisor.saType ?? '英方SA'}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          已用 {formatHours(pastSaHours)} / 共 {s.saHoursTotal}h
                        </span>
                        <span className={`text-xs ml-2 ${saRemaining <= 2 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          剩 {formatHours(saRemaining)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">{sessionCount} 节</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-medium">{formatHours(totalMins / 60)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-4 py-2.5 text-xs text-gray-400" colSpan={2}>合计</td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-800">
                      {statsRows.reduce((s, r) => s + r.sessionCount, 0)} 节
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-800">
                      {formatHours(statsRows.reduce((s, r) => s + r.totalMins, 0) / 60)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Weekly Report modal */}
    {showReport && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-10 px-4 pb-10">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">导师周报</h2>
              {weeklyReport && (
                <p className="text-xs text-gray-400 mt-0.5">
                  上次生成：{new Date(weeklyReport.generatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {weeklyReport.cache.students && ` · 共 ${Object.keys(weeklyReport.cache.students).length} 名学生`}
                </p>
              )}
            </div>
            <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>

          {/* Actions */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport || students.length === 0}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {generatingReport ? '生成中…' : weeklyReport ? '重新生成' : '生成周报'}
            </button>
            {weeklyReport && (
              <button
                onClick={() => navigator.clipboard.writeText(weeklyReport.content)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                复制
              </button>
            )}
            {reportError && <span className="text-xs text-red-500">{reportError}</span>}
            {students.length === 0 && <span className="text-xs text-gray-400">请先从 Dashboard 加载学生数据</span>}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-5 py-4">
            {generatingReport && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="text-2xl animate-pulse">🔍</div>
                <p className="text-sm text-gray-400">正在分析 {students.length} 名学生的进度…</p>
              </div>
            )}
            {!generatingReport && weeklyReport && (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                {weeklyReport.content}
              </pre>
            )}
            {!generatingReport && !weeklyReport && (
              <p className="text-sm text-gray-400 text-center py-16">点击「生成周报」开始分析</p>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="p-6">
      <AICommandCenter />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Students <span className="text-gray-400 font-normal text-lg">({filtered.length}{filtered.length !== students.length ? ` / ${students.length}` : ''})</span>
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowReport(true) }}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors relative"
          >
            进度提醒
            {weeklyReport && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            统计课时
          </button>
          <Link
            to="/students/new"
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Student
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: sort + round filter */}
        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'name' | 'lastSession')}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="lastSession">Sort: Needs attention first</option>
            <option value="name">Sort: Name A–Z</option>
          </select>

          {rounds.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-gray-400">Round:</span>
              <button
                onClick={() => setSelectedRound('')}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !selectedRound
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                All
              </button>
              {rounds.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r === selectedRound ? '' : r)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedRound === r
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: supervisor filter */}
        {supervisors.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-400">SA:</span>
            <select
              value={selectedSupervisor}
              onChange={e => setSelectedSupervisor(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
            >
              <option value="">All</option>
              {supervisors.map(sa => (
                <option key={sa.id} value={sa.id}>{sa.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Row 3: tag filter */}
        {tags.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-gray-400">Tag:</span>
            <button
              onClick={() => setSelectedTag('')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                !selectedTag
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              All
            </button>
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-400 text-sm py-16 text-center">
          {students.length === 0 ? 'No students yet. Add your first student!' : 'No students match this filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(student => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
    </>
  )
}

function getLastSession(student: Student): string | undefined {
  if (!student.sessions.length) return undefined
  return [...student.sessions].sort((a, b) => b.date.localeCompare(a.date))[0].date
}
