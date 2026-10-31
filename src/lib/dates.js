// All dates are local calendar dates as 'YYYY-MM-DD' (avoids the UTC off-by-one before 7am in Thailand).

export function todayISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Whole days from `iso` to today (positive = in the past)
export function daysSince(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.round((now - then) / 86400000)
}

export function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function fmtDateLong(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function relDay(iso) {
  const n = daysSince(iso)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === -1) return 'tomorrow'
  if (n === 1) return 'yesterday'
  return n > 0 ? `${n}d ago` : `in ${-n}d`
}
