import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import { generateProgressReport } from '@/lib/claudeService'
import { getSettings } from '@/lib/settings'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function ProgressReportPage() {
  const { id } = useParams<{ id: string }>()
  const { students, saveStudent } = useStudentStore()

  const student = students.find(s => s.id === id)

  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [fromCache, setFromCache] = useState(false)

  useEffect(() => {
    if (!student) return
    if (student.generatedProgressReport) {
      setReport(student.generatedProgressReport)
      setFromCache(true)
    } else {
      generate(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async (force: boolean) => {
    if (!student) return
    setLoading(true)
    setError('')
    setFromCache(false)
    if (force) setReport('')
    try {
      const text = await generateProgressReport(student)
      setReport(text)
      setSaving(true)
      await saveStudent({
        ...student,
        generatedProgressReport: text,
        progressReportGeneratedAt: new Date().toISOString(),
      })
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

  if (!student) {
    return (
      <div className="p-6 text-gray-400 text-sm">
        Student not found. <Link to="/" className="text-indigo-500 underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/students/${student.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {student.name}{student.nameEn ? ` · ${student.nameEn}` : ''}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">整体进度报告</h1>
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
        {fromCache && student.progressReportGeneratedAt && (
          <span className="text-xs text-gray-400 ml-1">
            已缓存 · 生成于 {formatTimestamp(student.progressReportGeneratedAt)}
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
