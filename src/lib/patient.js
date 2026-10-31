import { daysSince, todayISO } from './dates'

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export const emptyPatient = (defaults = {}) => ({
  hn: '', name: '', age: '', sex: '', ward: '', bed: '', attending: '',
  caseType: 'primary', consultFrom: '', diagnosis: '', injuryDate: '', remark: '', seenOn: '',
  operations: [], investigations: [],
  wound: { needsDressing: false, frequencyDays: 1, lastDressed: '', note: '' },
  ...defaults,
})

// Most recent operation that has been done (for POD)
export function lastDoneOp(p) {
  const done = (p.operations || []).filter(o => o.status === 'done' && o.date && o.date <= todayISO())
  return done.sort((a, b) => b.date.localeCompare(a.date))[0] || null
}

export function nextPlannedOp(p) {
  const planned = (p.operations || []).filter(o => o.status === 'planned')
  return planned.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))[0] || null
}

// Dressing state: null (not needed) | { due: bool, overdueDays, nextDate }
export function dressingStatus(p) {
  const w = p.wound
  if (!w?.needsDressing) return null
  if (!w.lastDressed) return { due: true, never: true, overdueDays: 0 }
  const since = daysSince(w.lastDressed)
  const freq = w.frequencyDays || 1
  return { due: since >= freq, overdueDays: since - freq, since, dueIn: freq - since }
}

export function pendingInvestigations(p) {
  return (p.investigations || []).filter(x => x.status === 'pending')
}

export function bedCompare(a, b) {
  return (a.ward || '').localeCompare(b.ward || '') ||
    (a.bed || '').localeCompare(b.bed || '', undefined, { numeric: true }) ||
    (a.name || '').localeCompare(b.name || '')
}
