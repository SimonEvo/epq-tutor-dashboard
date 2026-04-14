import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import { generateSessionReport } from '@/lib/claudeService'
import { getSettings } from '@/lib/settings'

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '1 天前'
  return `${diff} 天前`
}

export default function SessionReportPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const { students, saveStudent } = useStudentStore()

  const student = students.find(s => s.id === id)
  const session = student?.sessions.find(s => s.id === sessionId)

  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  // Load cached report on mount if available
  useEffect(() => {
    if (!session) return
    if (session.generatedReport) {
      setReport(session.generatedReport)
      setFromCache(true)
    } else {
      generate(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async (force: boolean) => {
    if (!student || !session) return
    setLoading(true)
    setError('')
    setFromCache(false)
    if (force) setReport('')
    try {
      const text = await generateSessionReport(student, session)
      setReport(text)
      // Save report back into the session record
      setSaving(true)
      const updatedSession = {
        ...session,
        generatedReport: text,
        reportGeneratedAt: new Date().toISOString(),
      }
      const updatedSessions = student.sessions.map(s =>
        s.id === session.id ? updatedSession : s
      )
      await saveStudent({ ...student, sessions: updatedSessions })
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setSaving(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!student || !session) {
    return (
      <div className="p-6 text-gray-400 text-sm">
        Session not found. <Link to="/" className="text-indigo-500 underline">Back to dashboard</Link>
      </div>
    )
  }

  const sessionTypeLabel = session.type === 'SA_MEETING' ? 'SA Meeting'
    : session.type === 'TA_MEETING' ? 'TA Meeting'
    : 'Taught Element'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/students/${student.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {student.name}{student.nameEn ? ` · ${student.nameEn}` : ''}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-400 text-sm">{session.title || sessionTypeLabel} · {session.date}</span>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">课后报告</h1>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => generate(true)}
          disabled={loading || saving}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? '生成中…' : report ? '重新生成' : '生成报告'}
        </button>
        {report && (
          <>
            <button
              onClick={copy}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              {copied ? '已复制 ✓' : '复制报告'}
            </button>
            {student.tencentDocUrl && (
              <a
                href={student.tencentDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                打开腾讯文档 →
              </a>
            )}
          </>
        )}
        {/* Cache status */}
        {fromCache && session.reportGeneratedAt && (
          <span className="text-xs text-gray-400 ml-1">
            已缓存 · {daysAgo(session.reportGeneratedAt)}生成
          </span>
        )}
        {saving && (
          <span className="text-xs text-gray-400 ml-1">保存中…</span>
        )}
      </div>

      {/* Content */}
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center gap-3 text-gray-400 text-sm">
          <span className="animate-spin text-indigo-500">⟳</span>
          正在调用 {getSettings().aiModel || 'qwen3.5-flash'} 生成报告，请稍候…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
          <p className="font-medium mb-1">生成失败</p>
          <p>{error}</p>
          {error.includes('API Key') && (
            <Link to="/settings" className="text-indigo-600 underline mt-2 block">前往设置填写 API Key →</Link>
          )}
        </div>
      )}

      {report && !loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">{report}</pre>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          点击「生成报告」开始
        </div>
      )}
    </div>
  )
}
