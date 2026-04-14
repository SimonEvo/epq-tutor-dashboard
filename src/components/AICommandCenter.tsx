import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import { parseAICommand, type AICommandAction, type ParsedStudent } from '@/lib/claudeService'
import type { Student, SessionRecord, SessionType } from '@/types'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const TYPE_PREFIX: Record<SessionType, string> = { SA_MEETING: 'SA', TA_MEETING: 'TA', THEORY: 'TE' }
const SESSION_LABEL: Record<SessionType, string> = {
  SA_MEETING: 'SA Meeting', TA_MEETING: 'TA Meeting', THEORY: 'Taught Element',
}

// ── Student preview rows config ───────────────────────────────────────────────
const STUDENT_FIELDS: { key: keyof ParsedStudent; label: string }[] = [
  { key: 'name',                 label: '姓名' },
  { key: 'nameEn',               label: '英文名' },
  { key: 'gender',               label: '性别' },
  { key: 'school',               label: '学校' },
  { key: 'currentGrade',         label: '年级' },
  { key: 'universityEnrollment', label: '预计入学' },
  { key: 'submissionRound',      label: '提交轮次' },
  { key: 'taughtElementType',    label: '理论课班期' },
  { key: 'universityAspiration', label: '目标院校' },
  { key: 'contact',              label: '联系方式' },
  { key: 'topic',                label: '课题' },
  { key: 'overview',             label: '课题简介' },
  { key: 'saHoursTotal',         label: 'SA 课时' },
  { key: 'availabilityNote',     label: '可用时间备注' },
  { key: 'briefNote',            label: '导师备注' },
  { key: 'tencentDocUrl',        label: '腾讯文档' },
]

export default function AICommandCenter() {
  const navigate = useNavigate()
  const { students, supervisors, tags, rounds, saveStudent } = useStudentStore()

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<AICommandAction | null>(null)
  const [executing, setExecuting] = useState(false)
  const [done, setDone] = useState('')

  const reset = () => { setPreview(null); setError(''); setDone('') }

  const handleParse = async () => {
    if (!input.trim()) return
    setLoading(true)
    reset()
    try {
      const result = await parseAICommand(
        input,
        students,
        supervisors.map(sv => ({ id: sv.id, name: sv.name })),
        tags,
        rounds,
      )
      if (result.type === 'error') setError(result.message)
      else setPreview(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview) return
    setExecuting(true)
    try {
      if (preview.type === 'create_student') {
        const d = preview.data
        const newStudent: Student = {
          id: generateId(),
          name: d.name ?? '未命名',
          nameEn: d.nameEn || undefined,
          gender: d.gender || undefined,
          school: d.school || undefined,
          currentGrade: d.currentGrade || undefined,
          universityEnrollment: d.universityEnrollment || undefined,
          submissionRound: d.submissionRound || undefined,
          taughtElementType: d.taughtElementType || undefined,
          universityAspiration: d.universityAspiration || undefined,
          contact: d.contact || undefined,
          topic: d.topic ?? '',
          overview: d.overview || undefined,
          supervisorId: d.supervisorId || undefined,
          saHoursTotal: d.saHoursTotal ?? 12,
          saHoursUsed: 0,
          tags: d.tags ?? [],
          availabilityNote: d.availabilityNote ?? '',
          briefNote: d.briefNote ?? '',
          privateNotes: d.privateNotes ?? '',
          tencentDocUrl: d.tencentDocUrl || undefined,
          sessions: [],
          personalEntries: [],
          mindMaps: [],
          milestones: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await saveStudent(newStudent)
        setDone(`已创建学生「${newStudent.name}」`)
        setInput('')
        setPreview(null)
        setTimeout(() => navigate(`/students/${newStudent.id}/edit`), 800)

      } else if (preview.type === 'create_session') {
        const student = students.find(s => s.id === preview.studentId)
        if (!student) { setError('找不到对应学生'); return }
        const d = preview.data
        const type: SessionType = (d.type as SessionType) ?? 'SA_MEETING'
        const date = d.date ?? new Date().toISOString().slice(0, 10)
        const sameType = student.sessions.filter(s => s.type === type).sort((a, b) => a.date.localeCompare(b.date))
        const pos = sameType.filter(s => s.date <= date).length + 1
        const session: SessionRecord = {
          id: generateId(),
          type,
          date,
          time: d.time,
          durationMinutes: d.durationMinutes ?? 60,
          title: `${TYPE_PREFIX[type]} #${pos}`,
          summary: d.summary ?? '',
          homework: d.homework ?? '',
          transcript: d.transcript ?? '',
          privateNotes: '',
          createdAt: new Date().toISOString(),
        }
        const saHoursUsed = [...student.sessions, session]
          .filter(s => s.type === 'SA_MEETING')
          .reduce((sum, s) => sum + s.durationMinutes / 60, 0)
        await saveStudent({
          ...student,
          sessions: [...student.sessions, session],
          saHoursUsed: Math.round(saHoursUsed * 10) / 10,
        })
        setDone(`已为「${student.name}」创建 ${session.title}`)
        setInput('')
        setPreview(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => { setOpen(o => !o); reset() }}
        className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
          open ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        ✦ AI 操作台
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">

          {/* Input */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-400">
              描述操作即可，AI 会解析并填写所有字段。例如：<br />
              「新建学生张晓雪，G11，学校北京四中，课题是气候变化对北极熊的影响，SA导师王老师，12课时，目标牛津」<br />
              「给李明新建一个SA会议，昨天下午3点，90分钟，讨论了文献综述框架，作业写500字草稿」
            </p>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse() }}
              rows={4}
              placeholder="输入指令…（⌘↵ 发送）"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleParse}
                disabled={loading || !input.trim()}
                className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {loading ? '解析中…' : '解析指令'}
              </button>
              {(preview || error) && (
                <button onClick={reset} className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  重置
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
          )}
          {done && (
            <div className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{done} ✓</div>
          )}

          {/* Preview */}
          {preview && !done && (
            <div className="border border-indigo-100 bg-indigo-50 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-indigo-700">
                {preview.type === 'create_student' ? '📋 新建学生 — 字段预览' : '📅 新建课程记录 — 字段预览'}
              </p>

              {preview.type === 'create_student' && (
                <div className="flex flex-col gap-1">
                  {STUDENT_FIELDS.map(({ key, label }) => {
                    const val = preview.data[key]
                    if (val == null || val === '') return null
                    return (
                      <div key={key} className="flex gap-2 text-xs">
                        <span className="text-gray-400 shrink-0 w-24">{label}</span>
                        <span className="text-gray-800">{String(val)}</span>
                      </div>
                    )
                  })}
                  {preview.data.supervisorId && (
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 w-24">SA 导师</span>
                      <span className="text-gray-800">
                        {supervisors.find(sv => sv.id === preview.data.supervisorId)?.name ?? preview.data.supervisorId}
                      </span>
                    </div>
                  )}
                  {preview.data.tags && preview.data.tags.length > 0 && (
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 w-24">标签</span>
                      <span className="text-gray-800">{preview.data.tags.join('、')}</span>
                    </div>
                  )}
                  {preview.data.privateNotes && (
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 w-24">私人备注</span>
                      <span className="text-gray-800">{preview.data.privateNotes}</span>
                    </div>
                  )}
                </div>
              )}

              {preview.type === 'create_session' && (
                <div className="flex flex-col gap-1">
                  {([
                    ['学生',   preview.studentName],
                    ['类型',   SESSION_LABEL[(preview.data.type as SessionType) ?? 'SA_MEETING']],
                    ['日期',   preview.data.date],
                    ['时间',   preview.data.time],
                    ['时长',   preview.data.durationMinutes ? `${preview.data.durationMinutes} 分钟` : undefined],
                    ['摘要',   preview.data.summary],
                    ['作业',   preview.data.homework],
                  ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 w-16">{label}</span>
                      <span className="text-gray-800">{val}</span>
                    </div>
                  ))}
                  {preview.data.transcript && (
                    <div className="flex gap-2 text-xs">
                      <span className="text-gray-400 shrink-0 w-16">会议记录</span>
                      <span className="text-gray-800 font-mono">
                        {preview.data.transcript.slice(0, 120)}{preview.data.transcript.length > 120 ? '…' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1 border-t border-indigo-100">
                <button
                  onClick={handleConfirm}
                  disabled={executing}
                  className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {executing ? '执行中…' : '确认创建'}
                </button>
                <button
                  onClick={reset}
                  className="text-sm px-4 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
