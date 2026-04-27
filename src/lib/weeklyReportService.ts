import { getSettings } from './settings'
import { EPQ_MILESTONES } from '@/config'
import { getWeeklyReportData, saveWeeklyReportData } from './dataService'
import type { Student, StudentReportCacheEntry, WeeklyReportData } from '@/types'
import { isSessionStarted } from './formatters'

// ── Alias helpers ─────────────────────────────────────────────────────────────

const ALIAS_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function buildAliasMaps(
  students: Student[],
  existingCache: Record<string, StudentReportCacheEntry>,
): { aliasMap: Record<string, string>; reverseMap: Record<string, string> } {
  const aliasMap: Record<string, string> = {}   // student id → alias
  const reverseMap: Record<string, string> = {} // alias → real name
  const usedAliases = new Set(Object.values(existingCache).map(e => e.alias))

  // First pass: carry over stable aliases for known students
  for (const s of students) {
    if (existingCache[s.id]) {
      aliasMap[s.id] = existingCache[s.id].alias
      reverseMap[existingCache[s.id].alias] = s.name
    }
  }

  // Second pass: assign new aliases to new/unknown students
  let nextIdx = 0
  for (const s of students) {
    if (aliasMap[s.id]) continue
    while (nextIdx < ALIAS_LETTERS.length && usedAliases.has(`学生${ALIAS_LETTERS[nextIdx]}`)) nextIdx++
    const alias = `学生${ALIAS_LETTERS[nextIdx] ?? nextIdx}`
    aliasMap[s.id] = alias
    reverseMap[alias] = s.name
    usedAliases.add(alias)
    nextIdx++
  }

  return { aliasMap, reverseMap }
}

function decodeAliases(text: string, reverseMap: Record<string, string>): string {
  let result = text

  // Pass 1: replace full aliases like "学生A"
  for (const [alias, name] of Object.entries(reverseMap)) {
    result = result.replaceAll(alias, name)
  }

  // Pass 2: catch bare letters (e.g. "A、B、C") that the AI output despite instructions.
  // Only replace a single capital letter when surrounded by Chinese list punctuation or brackets,
  // and only when that letter maps to a known alias.
  const letterMap: Record<string, string> = {}
  for (const [alias, name] of Object.entries(reverseMap)) {
    const letter = alias.replace('学生', '')
    if (letter.length === 1) letterMap[letter] = name
  }
  // Matches a capital letter flanked by （）、，, or whitespace
  result = result.replace(/(?<=[（(、，,\s])([A-Z])(?=[）)、，,\s])/g, (_, letter) =>
    letterMap[letter] ?? letter,
  )

  return result
}

// ── Student data summariser ───────────────────────────────────────────────────

function summariseStudent(s: Student, _today: string, changed: boolean): string {
  const pastSA = s.sessions
    .filter(x => x.type === 'SA_MEETING' && isSessionStarted(x))
    .sort((a, b) => b.date.localeCompare(a.date))

  const saUsed = pastSA.length
  const saRemaining = s.saHoursTotal - saUsed
  const lastSA = pastSA[0]
  const daysSinceLastSA = lastSA
    ? Math.floor((Date.now() - new Date(lastSA.date).getTime()) / 86_400_000)
    : null

  const nextSA = s.sessions
    .filter(x => x.type === 'SA_MEETING' && !isSessionStarted(x))
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  // Milestones
  const applicable = EPQ_MILESTONES.filter(m => s.milestones[m.id] !== 'na')
  const completedCount = applicable.filter(m => s.milestones[m.id] === 'completed').length
  const inProgress = applicable.filter(m => s.milestones[m.id] === 'in_progress')
  const milestoneStr = applicable.length
    ? `${completedCount}/${applicable.length} 已完成${inProgress.length ? `，进行中：${inProgress.map(m => m.label).join('、')}` : ''}`
    : '暂无里程碑数据'

  const lines = [
    `年级：${s.currentGrade ?? '未填'} | 提交轮次：${s.submissionRound ?? '未填'}`,
    `SA课时：已用 ${saUsed}/${s.saHoursTotal}，剩余 ${saRemaining} 次`,
    `上次SA：${lastSA ? `${lastSA.date}（${daysSinceLastSA} 天前）` : '暂无'}`,
    `下次预约SA：${nextSA ? nextSA.date : '无'}`,
    `可用时间备注：${s.availabilityNote || '无'}`,
    `里程碑：${milestoneStr}`,
  ]

  if (changed && lastSA?.summary) lines.push(`最近SA摘要：${lastSA.summary.slice(0, 100)}`)
  if (changed && lastSA?.homework) lines.push(`最近作业：${lastSA.homework.slice(0, 80)}`)
  if (!changed) lines.push('（自上次周报以来无变化）')

  return lines.join('\n')
}

// ── AI call ───────────────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<string> {
  const { aiApiKey, aiModel, aiBaseUrl } = getSettings()
  if (!aiApiKey) throw new Error('请先在设置页面填写 API Key')
  const base = (aiBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${aiApiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: aiModel || 'qwen-plus',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
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

// ── Main export ───────────────────────────────────────────────────────────────

export { getWeeklyReportData }

export async function generateWeeklyReport(students: Student[]): Promise<WeeklyReportData> {
  const today = new Date().toISOString().slice(0, 10)

  // 1. Load existing cache (aliases + updatedAt snapshots)
  const existing = await getWeeklyReportData()
  const existingCache = existing?.cache.students ?? {}

  // 2. Build stable alias maps
  const { aliasMap, reverseMap } = buildAliasMaps(students, existingCache)

  // 3. Determine which students changed since last scan
  const changedIds = new Set(
    students
      .filter(s => !existingCache[s.id] || existingCache[s.id].updatedAt !== s.updatedAt)
      .map(s => s.id),
  )

  // 4. Build anonymised prompt sections
  const studentSections = students
    .map(s => {
      const alias = aliasMap[s.id]
      const changed = changedIds.has(s.id)
      return `【${alias}】${changed ? '' : ' (无变化)'}\n${summariseStudent(s, today, changed)}`
    })
    .join('\n\n')

  const prompt = `你是EPQ学术导师的周报助手。请根据以下所有学生的进度数据，生成一份供导师自己阅读的中文周报。

今天日期：${today}
学生总数：${students.length}人，本次有变化：${changedIds.size}人

━━━ 学生数据 ━━━
${studentSections}

━━━ 输出要求 ━━━
请严格按以下格式输出，不要任何多余的解释或前言：

📊 导师周报 · ${today}

[总结段：2-4句话，概括整体进展，指出最需要关注的重点]

━━━ 行动建议 ━━━
📅 尚未预约SA会议（建议本周联系）：[学生别名，逗号分隔；无则写"暂无"]
⚠️ SA课时剩余≤3次：[学生别名；无则写"暂无"]
🎓 考试/考季结束，可约课：[根据"可用时间备注"和${today}对比判断；无则写"暂无"]
📚 理论课刚结束，可跟进：[根据"可用时间备注"和${today}对比判断；无则写"暂无"]
🆕 新学生，尚未开始任何会议：[无则写"暂无"]
🔄 里程碑长期停滞（进行中超过预期）：[无则写"暂无"]
✅ 进展顺利，无需特别跟进：[其余学生]

注意：
- 全程必须使用完整别名格式"学生A"、"学生B"，绝对不能只写单独字母如"A"、"B"
- 不要出现任何真实姓名`

  // 5. Call AI (guard against excessively long prompts)
  const MAX_PROMPT_CHARS = 12000
  const trimmedPrompt = prompt.length > MAX_PROMPT_CHARS
    ? prompt.slice(0, MAX_PROMPT_CHARS) + '\n\n[部分学生数据因长度限制被截断，请根据已有数据生成报告]'
    : prompt
  const raw = await callAI(trimmedPrompt)

  // 6. Decode aliases → real names
  const decoded = decodeAliases(raw, reverseMap)

  // 7. Build updated cache
  const newStudentCache: Record<string, StudentReportCacheEntry> = {}
  for (const s of students) {
    newStudentCache[s.id] = { updatedAt: s.updatedAt, alias: aliasMap[s.id] }
  }

  const result: WeeklyReportData = {
    generatedAt: new Date().toISOString(),
    content: decoded,
    cache: { lastScanAt: new Date().toISOString(), students: newStudentCache },
  }

  // 8. Persist to repo (config/weekly_report.json + reports/ archive)
  await saveWeeklyReportData(result)

  return result
}
