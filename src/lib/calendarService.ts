/**
 * Calendar service — generates ICS content from session data and publishes
 * it to a secret GitHub Gist so iCloud can subscribe to a stable,
 * non-guessable URL. The Gist ID is persisted in the data repo
 * (config/calendar.json) so it survives across devices and sessions.
 */
import { getClient } from './githubClient'
import { GITHUB_CONFIG } from '@/config'
import { getCalendarGistId, saveCalendarGistId } from './dataService'
import type { Student, SessionType } from '@/types'

export function gistUrl(gistId: string): string {
  return `https://gist.githubusercontent.com/${GITHUB_CONFIG.owner}/${gistId}/raw/calendar.ics`
}

// ─── ICS formatting helpers ──────────────────────────────────────────────────

const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  SA_MEETING: 'SA Meeting',
  TA_MEETING: 'TA Meeting',
  THEORY: 'Taught Element',
}

/** RFC 5545 §3.1: fold lines longer than 75 octets */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts = [line.slice(0, 75)]
  let i = 75
  while (i < line.length) {
    parts.push(' ' + line.slice(i, i + 74))
    i += 74
  }
  return parts.join('\r\n')
}

/** Escape special chars in TEXT values */
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/** Format DTSTART / DTEND property value */
function dtProp(name: 'DTSTART' | 'DTEND', date: string, time?: string): string {
  const d = date.replace(/-/g, '')
  if (time) {
    const t = time.replace(':', '') + '00'
    return fold(`${name};TZID=Asia/Shanghai:${d}T${t}`)
  }
  return `${name};VALUE=DATE:${d}`
}

/** Add minutes to a HH:MM time on a given YYYY-MM-DD date, returns TZID prop value */
function dtEndTimed(date: string, time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMins = h * 60 + m + minutes
  const extraDays = Math.floor(totalMins / (24 * 60))
  const endH = Math.floor((totalMins % (24 * 60)) / 60)
  const endM = totalMins % 60
  let endDate = date
  if (extraDays > 0) {
    const obj = new Date(date + 'T00:00:00')
    obj.setDate(obj.getDate() + extraDays)
    endDate = obj.toISOString().slice(0, 10)
  }
  const d = endDate.replace(/-/g, '')
  const t = String(endH).padStart(2, '0') + String(endM).padStart(2, '0') + '00'
  return fold(`DTEND;TZID=Asia/Shanghai:${d}T${t}`)
}

/** Advance a YYYY-MM-DD date by N days, return as YYYYMMDD */
function advanceDate(date: string, days = 1): string {
  const obj = new Date(date + 'T00:00:00')
  obj.setDate(obj.getDate() + days)
  return obj.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Convert ISO timestamp to ICS DTSTAMP format */
function toStamp(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// ─── ICS generation ──────────────────────────────────────────────────────────

export function generateICS(students: Student[]): string {
  const now = toStamp(new Date().toISOString())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EPQ Tutor Dashboard//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:EPQ 辅导课程',
    'X-WR-TIMEZONE:Asia/Shanghai',
  ]

  for (const student of students) {
    const nameLabel = student.nameEn
      ? `${student.name} (${student.nameEn})`
      : student.name

    // ── Recorded sessions ──
    for (const session of student.sessions) {
      const typeLabel = SESSION_TYPE_LABEL[session.type]
      const summary = `${nameLabel} · ${session.title ?? typeLabel}`

      const description = `${SESSION_TYPE_LABEL[session.type]} · ${session.durationMinutes} min`

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:epq-session-${session.id}@epq-tutor-dashboard`)
      lines.push(`DTSTAMP:${now}Z`)
      lines.push(`CREATED:${toStamp(session.createdAt)}Z`)
      lines.push(dtProp('DTSTART', session.date, session.time))
      if (session.time) {
        lines.push(dtEndTimed(session.date, session.time, session.durationMinutes))
      } else {
        lines.push(`DTEND;VALUE=DATE:${advanceDate(session.date)}`)
      }
      lines.push(fold(`SUMMARY:${esc(summary)}`))
      lines.push(fold(`DESCRIPTION:${esc(description)}`))
      lines.push('END:VEVENT')
    }

    // ── Upcoming planned sessions (tentative all-day events) ──
    const existingSaDates = new Set(
      student.sessions.filter(s => s.type === 'SA_MEETING').map(s => s.date)
    )
    const existingTaDates = new Set(
      student.sessions.filter(s => s.type === 'TA_MEETING').map(s => s.date)
    )
    const existingTEDates = new Set(
      student.sessions.filter(s => s.type === 'THEORY').map(s => s.date)
    )

    const planned: [string | undefined, string, Set<string>][] = [
      [student.nextSaSession, `${nameLabel} · 下次SA（计划中）`, existingSaDates],
      [student.nextTaSession, `${nameLabel} · 下次TA（计划中）`, existingTaDates],
      [student.nextTheorySession, `${nameLabel} · 下次Theory（计划中）`, existingTEDates],
    ]
    const plannedKeys = ['sa', 'ta', 'theory']
    planned.forEach(([dateStr, summary, existingDates], i) => {
      if (!dateStr || existingDates.has(dateStr)) return
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:epq-next-${plannedKeys[i]}-${student.id}@epq-tutor-dashboard`)
      lines.push(`DTSTAMP:${now}Z`)
      lines.push(`DTSTART;VALUE=DATE:${dateStr.replace(/-/g, '')}`)
      lines.push(`DTEND;VALUE=DATE:${advanceDate(dateStr)}`)
      lines.push(fold(`SUMMARY:${esc(summary)}`))
      lines.push('STATUS:TENTATIVE')
      lines.push('END:VEVENT')
    })
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

// ─── Gist publish ────────────────────────────────────────────────────────────
// Gist API has no SHA conflict problem — PATCH always wins.
// Writes are still serialised so concurrent saves don't create duplicate gists.

let _queue: Promise<void> = Promise.resolve()
let _pending: Student[] | null = null  // latest snapshot waiting to be written
let _cachedGistId: string | null | undefined = undefined  // undefined = not fetched yet

/**
 * Publish calendar.ics to a secret GitHub Gist.
 * Multiple rapid calls are coalesced — only the latest snapshot is written.
 * Returns the Gist subscribe URL (resolves after write completes).
 */
export function publishCalendar(students: Student[]): Promise<string> {
  _pending = students

  const result = new Promise<string>((resolve, reject) => {
    _queue = _queue.then(async () => {
      if (!_pending) { resolve(''); return }
      const snapshot = _pending
      _pending = null
      const url = await _writeGist(snapshot)
      resolve(url)
    }).catch(reject)
  })

  return result
}

async function _writeGist(students: Student[]): Promise<string> {
  const client = getClient()
  const icsContent = generateICS(students)

  // Fetch Gist ID from data repo on first call (shared across all devices).
  if (_cachedGistId === undefined) {
    _cachedGistId = await getCalendarGistId()
  }

  if (_cachedGistId) {
    // Update existing Gist.
    await client.request('PATCH /gists/{gist_id}', {
      gist_id: _cachedGistId,
      files: { 'calendar.ics': { content: icsContent } },
    })
    return gistUrl(_cachedGistId)
  } else {
    // First time: create a secret Gist and persist its ID to the data repo.
    const res = await client.request('POST /gists', {
      description: 'EPQ Tutor Calendar — do not delete',
      public: false,
      files: { 'calendar.ics': { content: icsContent } },
    })
    const gistId = (res.data as { id: string }).id
    _cachedGistId = gistId
    await saveCalendarGistId(gistId)
    return gistUrl(gistId)
  }
}
