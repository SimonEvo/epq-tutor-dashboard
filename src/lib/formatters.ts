/**
 * Returns true if the session has already started, considering both date and time.
 * For today's sessions with a time field, compares current CST time to session start time.
 * Sessions without a time field on today are treated as started.
 */
export function isSessionStarted(s: { date: string; time?: string }): boolean {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  if (s.date < todayStr) return true
  if (s.date > todayStr) return false
  if (!s.time) return true
  const nowHHMM = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai',
  })
  return nowHHMM >= s.time
}

/** Format decimal hours as xhxxmin. e.g. 1.5 → "1h30min", 0.75 → "45min", 2 → "2h" */
export function formatHours(decimalHours: number): string {
  const totalMins = Math.round(decimalHours * 60)
  const h = Math.floor(totalMins / 60)
  const min = totalMins % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h${min}min`
}
