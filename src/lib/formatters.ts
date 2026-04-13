/** Format decimal hours as xhxxmin. e.g. 1.5 → "1h30min", 0.75 → "45min", 2 → "2h" */
export function formatHours(decimalHours: number): string {
  const totalMins = Math.round(decimalHours * 60)
  const h = Math.floor(totalMins / 60)
  const min = totalMins % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h${min}min`
}
