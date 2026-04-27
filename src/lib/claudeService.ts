import { getSettings } from './settings'
import { EPQ_MILESTONES } from '@/config'
import type { Student, SessionRecord } from '@/types'
import { isSessionStarted } from './formatters'

async function callAI(prompt: string): Promise<string> {
  const { aiApiKey, aiModel, aiBaseUrl } = getSettings()
  if (!aiApiKey) throw new Error('请先在设置页面填写 API Key')
  const base = (aiBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${aiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel || 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } })?.error?.message
    throw new Error(msg ?? `API 错误 ${res.status}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0].message.content
}

// ── AI Command Center ─────────────────────────────────────────────────────────

export interface ParsedStudent {
  name?: string; nameEn?: string; gender?: string
  school?: string; currentGrade?: string; universityEnrollment?: string
  submissionRound?: string; taughtElementType?: string; universityAspiration?: string
  contact?: string; topic?: string; overview?: string
  supervisorId?: string | null; saHoursTotal?: number
  availabilityNote?: string; briefNote?: string; privateNotes?: string
  tencentDocUrl?: string; tags?: string[]
}

export type AICommandAction =
  | { type: 'create_student'; data: ParsedStudent }
  | { type: 'create_session'; studentId: string; studentName: string; data: Partial<SessionRecord> }
  | { type: 'error'; message: string }

export async function parseAICommand(
  input: string,
  students: Student[],
  supervisors: { id: string; name: string }[],
  tags: string[],
  rounds: string[],
): Promise<AICommandAction> {
  const today = new Date().toISOString().slice(0, 10)

  const studentList = students.length
    ? students.map(s => `  id=${s.id}  姓名=${s.name}${s.nameEn ? `(${s.nameEn})` : ''}  课题=${s.topic}`).join('\n')
    : '（暂无）'

  const supervisorList = supervisors.length
    ? supervisors.map(sv => `  id=${sv.id}  姓名=${sv.name}`).join('\n')
    : '（暂无）'

  const tagList = tags.length ? tags.join('、') : '（暂无）'
  const roundList = rounds.length ? rounds.join('、') : '（暂无）'

  const prompt = `你是EPQ学生管理系统的AI助手。根据用户的自然语言指令解析出操作，返回纯JSON（不要任何markdown或解释）。

今天日期：${today}

现有学生：
${studentList}

现有SA导师（Supervisor）：
${supervisorList}

现有标签：${tagList}

现有提交轮次：${roundList}

━━━ 操作一：新建学生 ━━━
{
  "type": "create_student",
  "data": {
    "name": "中文姓名（必填）",
    "nameEn": "英文名",
    "gender": "Male | Female | Other（男/男生 → Male；女/女生 → Female；其他 → Other）",
    "school": "学校名称",
    "currentGrade": "年级，如 G11 / Year 12",
    "universityEnrollment": "预计入学时间，如 September 2026",
    "submissionRound": "从现有提交轮次中模糊匹配（如"今年八月提交"→"August 2026"，"26年秋季"→匹配最接近的现有轮次）；匹配不到时根据语义自行推断填写",
    "taughtElementType": "理论课班期，即该学生所在的理论课班级或批次，如"2025年秋季班"",
    "universityAspiration": "目标大学/专业",
    "contact": "联系方式",
    "topic": "EPQ研究课题（必填）",
    "overview": "课题一句话简介，显示在卡片上",
    "supervisorId": "从现有SA导师中匹配id，匹配不到填null",
    "saHoursTotal": 12,
    "availabilityNote": "可用时间备注",
    "briefNote": "导师一句话备注，显示在卡片上",
    "privateNotes": "私人备注，不对外展示",
    "tencentDocUrl": "腾讯文档链接",
    "tags": ["从现有标签中匹配，可多选，匹配不到的忽略"]
  }
}

━━━ 操作二：新建课程记录 ━━━
{
  "type": "create_session",
  "studentId": "从现有学生中匹配id（必填）",
  "studentName": "匹配到的学生中文姓名",
  "data": {
    "type": "SA_MEETING | TA_MEETING | THEORY",
    "date": "YYYY-MM-DD",
    "time": "HH:MM（可选）",
    "durationMinutes": 60,
    "summary": "课程内容摘要",
    "homework": "课后任务",
    "transcript": "会议记录原文（如有，完整保留）"
  }
}

━━━ 匹配规则 ━━━
- session type：SA/学术督导 → SA_MEETING；TA/辅导 → TA_MEETING；课程讲解/Taught Element → THEORY
- 日期："今天" → ${today}；"昨天" → 前一天；具体日期转 YYYY-MM-DD
- 学生/导师姓名模糊匹配，优先中文姓名，其次英文名
- gender：男/男生 → Male；女/女生 → Female；其他 → Other
- submissionRound：优先从现有提交轮次中模糊匹配（"今年八月" → "August ${new Date().getFullYear()}"，"26年秋季" → 匹配含 2026 的轮次）；无现有轮次可匹配时自行推断英文格式（如 "August 2026"）
- 无法理解或无法匹配关键信息时返回：{"type":"error","message":"原因"}

用户指令：
${input}`

  const raw = await callAI(prompt)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw.trim()

  try {
    return JSON.parse(jsonStr) as AICommandAction
  } catch {
    return { type: 'error', message: `AI 返回了无法解析的格式：${raw.slice(0, 200)}` }
  }
}

// ── Session Report ────────────────────────────────────────────────────────────

export async function generateSessionReport(student: Student, session: SessionRecord): Promise<string> {
  const pastSaCount = student.sessions.filter(
    s => s.type === 'SA_MEETING' && s.date <= session.date
  ).length
  const saRemaining = student.saHoursTotal - pastSaCount
  const typeLabel = session.type === 'SA_MEETING' ? 'SA Meeting（学术督导课）'
    : session.type === 'TA_MEETING' ? 'TA Meeting（辅导课）'
    : 'Taught Element（课程讲解）'

  const parts: string[] = [
    `学生姓名：${student.name}${student.nameEn ? `（${student.nameEn}）` : ''}`,
    `EPQ课题：${student.topic}`,
    `本次课程类型：${typeLabel}`,
    `日期：${session.date}${session.time ? ' ' + session.time : ''}`,
    `时长：${session.durationMinutes} 分钟`,
    `剩余：${saRemaining} / ${student.saHoursTotal} SA课时`,
  ]

  if (session.summary) parts.push(`\n课程记录（导师原始记录）：\n${session.summary}`)
  if (session.homework) parts.push(`\n课后任务（导师原始记录）：\n${session.homework}`)
  if (session.transcript) parts.push(`\n会议记录／逐字稿：\n${session.transcript}`)

  const prompt = `你是一个EPQ学术导师的助手，请根据以下信息生成一份发给家长群（成员：学生本人、家长、市场部同事）的课后简报。

要求：
- 用中文撰写，语言专业流畅、易于家长阅读
- 不要出现Markdown结构(比如星号)
- 结构清晰，适合直接粘贴到腾讯文档
- 每个板块标题前使用 emoji，整体排版美观易读
- 如提供了会议记录／逐字稿，请以此为主要依据，优先从中提炼内容
- 严格按照以下结构输出，不要多余的解释：

📋 [课程类型] · [日期]
👤 学生：[姓名] ｜ 📖 课题：[题目简称]
⏱ 本次课时：[时长]分钟 ｜ 📊 剩余：[剩余]/[总量] SA课时

📝 本次课程概要
[3-5句话概括本次课程内容]

✨ 学生表现与进展
[评价学生本次表现，体现进步与努力，语气积极]

📋 课后任务
[列出具体任务，用 • 分点]

📅 下次SA Meeting
[从记录中寻找，如果没有的话就写暂无，请学生尽快预约。当剩余课时小于3次时要给出预警]

💬 导师寄语
[一句鼓励性的话]

---
不要包含任何导师私人备注。

以下是本次课程信息：
${parts.join('\n')}`

  return callAI(prompt)
}

// ── Progress Report ───────────────────────────────────────────────────────────

export async function generateProgressReport(student: Student): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)

  // SA hours — integer count of SA sessions (consistent with session report display)
  const pastSaCount = student.sessions.filter(
    s => s.type === 'SA_MEETING' && isSessionStarted(s)
  ).length
  const saRemaining = student.saHoursTotal - pastSaCount

  // Milestones
  const completed = EPQ_MILESTONES.filter(m => student.milestones[m.id] === 'completed').map(m => m.label)
  const inProgress = EPQ_MILESTONES.filter(m => student.milestones[m.id] === 'in_progress').map(m => m.label)
  const notStarted = EPQ_MILESTONES.filter(m =>
    !student.milestones[m.id] || student.milestones[m.id] === 'not_started'
  ).map(m => m.label)
  const applicable = EPQ_MILESTONES.filter(m => student.milestones[m.id] !== 'na')
  const progress = applicable.length > 0
    ? Math.round((completed.length / applicable.length) * 100)
    : 0

  // All sessions sorted by date
  const sorted = [...student.sessions].sort((a, b) => a.date.localeCompare(b.date))
  const pastSessions   = sorted.filter(s => isSessionStarted(s))
  const futureSessions = sorted.filter(s => !isSessionStarted(s))

  // Full session title list (all past sessions)
  const allTitles = pastSessions.map(s => {
    const t = s.type === 'SA_MEETING' ? 'SA' : s.type === 'TA_MEETING' ? 'TA' : 'TE'
    return `${s.date} [${t}] ${s.title ?? ''}`
  }).join('\n')

  // Most recent SA detail
  const lastSA = [...pastSessions].reverse().find(s => s.type === 'SA_MEETING')
  const lastSAText = lastSA ? [
    `日期：${lastSA.date}　标题：${lastSA.title ?? ''}`,
    lastSA.summary   ? `记录：${lastSA.summary}` : '',
    lastSA.homework  ? `作业：${lastSA.homework}` : '',
    lastSA.generatedReport ? `课后报告摘录：${lastSA.generatedReport.slice(0, 400)}` : '',
  ].filter(Boolean).join('\n') : '暂无'

  // Most recent TA detail
  const lastTA = [...pastSessions].reverse().find(s => s.type === 'TA_MEETING')
  const lastTAText = lastTA ? [
    `日期：${lastTA.date}　标题：${lastTA.title ?? ''}`,
    lastTA.summary   ? `记录：${lastTA.summary}` : '',
    lastTA.homework  ? `作业：${lastTA.homework}` : '',
    lastTA.generatedReport ? `课后报告摘录：${lastTA.generatedReport.slice(0, 400)}` : '',
  ].filter(Boolean).join('\n') : '暂无'

  // Upcoming (未开始) sessions — future records + next session date fields
  const futureLines: string[] = futureSessions.map(s => {
    const t = s.type === 'SA_MEETING' ? 'SA' : s.type === 'TA_MEETING' ? 'TA' : 'TE'
    return `${s.date} [${t}] ${s.title ?? ''}`
  })
  if (student.nextSaSession && !futureSessions.find(s => s.type === 'SA_MEETING'))
    futureLines.push(`${student.nextSaSession} [SA]（计划中）`)
  if (student.nextTaSession && !futureSessions.find(s => s.type === 'TA_MEETING'))
    futureLines.push(`${student.nextTaSession} [TA]（计划中）`)
  if (student.nextTheorySession && !futureSessions.find(s => s.type === 'THEORY'))
    futureLines.push(`${student.nextTheorySession} [TE]（计划中）`)

  const prompt = `你是一个EPQ学术导师的助手，请根据以下学生的整体学习数据，生成一份发给家长群的EPQ整体进度报告。

要求：
- 用中文撰写，专业流畅，适合家长阅读
- 不要出现Markdown结构(比如星号)
- 结构清晰，适合直接粘贴到腾讯文档
- 每个板块标题前使用 emoji，整体排版美观易读
- 严格按照以下结构输出，不要多余的解释：

📊 EPQ 整体进度报告
👤 学生：[姓名]
📖 课题：[题目]
📅 报告日期：${today}

📈 整体进度概览
[2-3句话总结学生整体进展情况，提及完成百分比，语气积极]
进度：[X]% ｜ 剩余：[剩余]/[总量] SA课时 ｜ 累计课程：[次数] 次

🎯 里程碑完成情况
✅ 已完成（[数量]项）：[列表]
🔄 进行中（[数量]项）：[列表]
⭕ 待开始（[数量]项）：[列表]

📚 近期课程回顾
[根据最近一次SA和最近一次TA的详细记录，用3-5句话总结近期学习内容与进展]

📌 待完成任务
[从最近SA/TA的作业记录中提取，用 • 分点]

📅 下次课程安排
下次SA会议时间：[列出未开始的SA session日期和时间。如果没有，就说暂无并且提醒学生约课。当剩余课时小于3次时要给出预警]

🚀 下一阶段重点
[结合里程碑进度和近期作业，列出接下来的主要任务，用 • 分点]

💬 导师寄语
[一句鼓励性的话]

---
不要包含任何导师私人备注。

以下是学生信息：
学生姓名：${student.name}${student.nameEn ? `（${student.nameEn}）` : ''}
EPQ课题：${student.topic}
${student.overview ? `课题与学生背景：\n${student.overview}\n\n` : ''}整体完成进度：${progress}%
已用 SA 课次：${pastSaCount} / ${student.saHoursTotal}，剩余：${saRemaining}
总课程次数：${student.sessions.length} 次（其中已完成 ${pastSessions.length} 次）

里程碑完成情况：
- 已完成（${completed.length} 项）：${completed.join('、') || '暂无'}
- 进行中（${inProgress.length} 项）：${inProgress.join('、') || '暂无'}
- 未开始（${notStarted.length} 项）：${notStarted.join('、') || '暂无'}

所有已完成课程（按时间顺序）：
${allTitles || '暂无'}

最近一次 SA Meeting 详情：
${lastSAText}

最近一次 TA Meeting 详情：
${lastTAText}

未开始课程（下次课程安排来源）：
${futureLines.length > 0 ? futureLines.join('\n') : '暂无已记录的未来课程'}

${student.briefNote ? `导师简评：${student.briefNote}` : ''}`

  return callAI(prompt)
}
