import { getSettings } from './settings'
import { EPQ_MILESTONES } from '@/config'
import type { Student, SessionRecord } from '@/types'

const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

async function callClaude(prompt: string): Promise<string> {
  const { aiApiKey, aiModel } = getSettings()
  if (!aiApiKey) throw new Error('请先在设置页面填写 API Key')
  const MODEL = aiModel || 'qwen3.5-flash'

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${aiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
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

// ── Session Report ────────────────────────────────────────────────────────────

export async function generateSessionReport(student: Student, session: SessionRecord): Promise<string> {
  const saRemaining = student.saHoursTotal - student.saHoursUsed
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

  const prompt = `你是一个EPQ学术导师的助手，请根据以下信息生成一份发给家长群（成员：学生本人、家长、市场部同事）的课后简报。

要求：
- 用中文撰写，语言专业流畅、易于家长阅读
- 结构清晰，适合直接粘贴到腾讯文档
- 每个板块标题前使用 emoji，整体排版美观易读
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

💬 导师寄语
[一句鼓励性的话]

---
不要包含任何导师私人备注。

以下是本次课程信息：
${parts.join('\n')}`

  return callClaude(prompt)
}

// ── Progress Report ───────────────────────────────────────────────────────────

export async function generateProgressReport(student: Student): Promise<string> {
  const saRemaining = student.saHoursTotal - student.saHoursUsed

  // Milestones summary
  const completed = EPQ_MILESTONES.filter(m => student.milestones[m.id] === 'completed').map(m => m.label)
  const inProgress = EPQ_MILESTONES.filter(m => student.milestones[m.id] === 'in_progress').map(m => m.label)
  const notStarted = EPQ_MILESTONES.filter(m =>
    !student.milestones[m.id] || student.milestones[m.id] === 'not_started'
  ).map(m => m.label)
  const applicable = EPQ_MILESTONES.filter(m => student.milestones[m.id] !== 'na')
  const progress = applicable.length > 0
    ? Math.round((completed.length / applicable.length) * 100)
    : 0

  // Recent sessions (last 5, no private notes)
  const recentSessions = [...student.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(s => {
      const typeLabel = s.type === 'SA_MEETING' ? 'SA' : s.type === 'TA_MEETING' ? 'TA' : 'TE'
      const titlePart = s.title ? `「${s.title}」` : ''
      return `- ${s.date} [${typeLabel}]${titlePart}${s.summary ? '：' + s.summary.slice(0, 100) : ''}`
    })
    .join('\n')

  const prompt = `你是一个EPQ学术导师的助手，请根据以下学生的整体学习数据，生成一份发给家长群的EPQ整体进度报告。

要求：
- 用中文撰写，专业流畅，适合家长阅读
- 结构清晰，适合直接粘贴到腾讯文档
- 每个板块标题前使用 emoji，整体排版美观易读
- 严格按照以下结构输出，不要多余的解释：

📊 EPQ 整体进度报告
👤 学生：[姓名] ｜ 📖 课题：[题目]
📅 报告日期：[今天日期]

📈 整体进度概览
[2-3句话总结学生整体进展情况，提及完成百分比，语气积极]
进度：[X]% ｜ 剩余：[剩余]/[总量] SA课时 ｜ 累计课程：[次数] 次

🎯 里程碑完成情况
✅ 已完成（[数量]项）：[列表]
🔄 进行中（[数量]项）：[列表]
⭕ 待开始（[数量]项）：[列表]

📚 近期课程回顾
[根据近期课程记录，用2-4句话总结近期学习内容与进展]

🚀 下一阶段重点
[列出接下来的主要任务和目标，用 • 分点]

💬 导师寄语
[一句鼓励性的话]

---
不要包含任何导师私人备注。

以下是学生信息：
学生姓名：${student.name}${student.nameEn ? `（${student.nameEn}）` : ''}
EPQ课题：${student.topic}
整体完成进度：${progress}%
剩余：${saRemaining} / ${student.saHoursTotal} SA课时
总课程次数：${student.sessions.length} 次

里程碑完成情况：
- 已完成（${completed.length} 项）：${completed.join('、') || '暂无'}
- 进行中（${inProgress.length} 项）：${inProgress.join('、') || '暂无'}
- 未开始（${notStarted.length} 项）：${notStarted.join('、') || '暂无'}

近期课程记录（最近5次）：
${recentSessions || '暂无课程记录'}

${student.briefNote ? `导师简评：${student.briefNote}` : ''}`

  return callClaude(prompt)
}
