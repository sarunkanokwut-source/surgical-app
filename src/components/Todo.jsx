import { useMemo, useState } from 'react'
import { Bandage, FlaskConical, Scissors, Check } from 'lucide-react'
import { todayISO, fmtDateLong, fmtDate } from '../lib/dates'

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Flatten every patient's pending work into dated items and bucket them
export function buildTodo(patients) {
  const today = todayISO()
  const tomorrow = todayISO(1)
  const items = []
  for (const p of patients) {
    for (const x of p.investigations || []) {
      if (x.status === 'pending') items.push({ key: `ix-${p.id}-${x.id}`, type: 'ix', date: x.date, label: x.name || 'Investigation', sub: x.result, patient: p, itemId: x.id })
    }
    for (const o of p.operations || []) {
      if (o.status === 'planned') items.push({ key: `sx-${p.id}-${o.id}`, type: 'sx', date: o.date, label: o.procedure || 'Operation', patient: p, itemId: o.id })
    }
    const w = p.wound
    if (w?.needsDressing) {
      const due = w.lastDressed ? addDays(w.lastDressed, w.frequencyDays || 1) : today
      items.push({ key: `dr-${p.id}`, type: 'dressing', date: due, label: 'Wound dressing', sub: w.note, patient: p })
    }
  }
  items.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.patient.bed || '').localeCompare(b.patient.bed || '', undefined, { numeric: true }))
  return {
    overdue: items.filter(i => i.date && i.date < today),
    today: items.filter(i => i.date === today),
    tomorrow: items.filter(i => i.date === tomorrow),
    upcoming: items.filter(i => i.date && i.date > tomorrow),
    undated: items.filter(i => !i.date),
  }
}

const TYPE = {
  ix: { Icon: FlaskConical, cls: 'bg-purple-100 text-purple-700', name: 'Investigation' },
  sx: { Icon: Scissors, cls: 'bg-blue-100 text-blue-700', name: 'Surgery' },
  dressing: { Icon: Bandage, cls: 'bg-rose-100 text-rose-700', name: 'Dressing' },
}

function TodoItem({ item, onOpen, onDone, showDate }) {
  const { Icon, cls } = TYPE[item.type]
  const p = item.patient
  return (
    <div onClick={() => onOpen(p)} className="bg-white rounded-xl shadow-sm px-3 py-2.5 mb-2 flex items-center gap-3 active:bg-gray-50 cursor-pointer">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cls}`}><Icon size={17} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{item.label}{showDate && item.date ? <span className="font-normal text-gray-500"> · {fmtDate(item.date)}</span> : null}</p>
        <p className="text-xs text-gray-500 truncate">
          {p.bed && <span className="font-bold text-blue-700">{p.bed} </span>}{p.name} · HN {p.hn}{p.ward ? ` · ${p.ward}` : ''}
        </p>
        {item.sub && <p className="text-xs text-gray-400 truncate">{item.sub}</p>}
      </div>
      <button onClick={e => { e.stopPropagation(); onDone(item) }} aria-label="Mark done"
        className="w-9 h-9 rounded-full border-2 border-gray-200 text-gray-300 flex items-center justify-center flex-shrink-0 active:bg-green-50">
        <Check size={16} strokeWidth={3} />
      </button>
    </div>
  )
}

export default function Todo({ data, onOpen }) {
  const { patients, savePatient } = data
  const [type, setType] = useState('')
  const [ward, setWard] = useState('')
  const wards = useMemo(() => [...new Set(patients.map(p => p.ward).filter(Boolean))].sort(), [patients])

  const scoped = useMemo(() => patients.filter(p => !ward || p.ward === ward), [patients, ward])
  const buckets = useMemo(() => {
    const b = buildTodo(scoped)
    if (!type) return b
    return Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.filter(i => i.type === type)]))
  }, [scoped, type])

  const markDone = async (item) => {
    const p = item.patient
    const verb = { ix: 'done', sx: 'done', dressing: 'dressed today' }[item.type]
    if (!window.confirm(`Mark "${item.label}" ${verb} for ${p.name}?`)) return
    const today = todayISO()
    const change =
      item.type === 'ix' ? { investigations: p.investigations.map(x => x.id === item.itemId ? { ...x, status: 'done' } : x) }
      : item.type === 'sx' ? { operations: p.operations.map(o => o.id === item.itemId ? { ...o, status: 'done', date: o.date || today } : o) }
      : { wound: { ...p.wound, lastDressed: today } }
    try { await savePatient({ ...p, ...change }) } catch (e) { alert(e.message) }
  }

  const SECTIONS = [
    { key: 'overdue', title: 'Overdue', tone: 'text-red-600', showDate: true },
    { key: 'today', title: `Today · ${fmtDateLong(todayISO())}`, tone: 'text-blue-700' },
    { key: 'tomorrow', title: 'Tomorrow', tone: 'text-gray-600' },
    { key: 'upcoming', title: 'Upcoming', tone: 'text-gray-600', showDate: true },
    { key: 'undated', title: 'No date set', tone: 'text-gray-400' },
  ]
  const total = Object.values(buckets).reduce((n, v) => n + v.length, 0)

  return (
    <>
      <div className="bg-blue-700 text-white px-4 pt-4 pb-3 safe-top">
        <h1 className="text-xl font-bold leading-tight">To-do</h1>
        <p className="text-blue-100 text-xs mb-2.5">
          {buckets.overdue.length} overdue · {buckets.today.length} today · {total} total pending
        </p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[['', 'All'], ['ix', 'Investigations'], ['sx', 'Surgery'], ['dressing', 'Dressing']].map(([v, l]) => (
            <button key={v} onClick={() => setType(v)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${type === v ? 'bg-white text-blue-700' : 'bg-white/15 text-white'}`}>{l}</button>
          ))}
          <select value={ward} onChange={e => setWard(e.target.value)} aria-label="Ward"
            className="flex-shrink-0 bg-white/15 text-white rounded-full px-3 py-1 text-sm outline-none [&>option]:text-gray-900">
            <option value="">All wards</option>
            {wards.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6">
        {total === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-medium">Nothing pending</p>
          </div>
        ) : SECTIONS.map(s => buckets[s.key].length > 0 && (
          <div key={s.key} className="mb-4">
            <p className={`text-xs font-semibold uppercase tracking-wide px-1 mb-1.5 ${s.tone}`}>{s.title} · {buckets[s.key].length}</p>
            {buckets[s.key].map(i => <TodoItem key={i.key} item={i} onOpen={onOpen} onDone={markDone} showDate={s.showDate} />)}
          </div>
        ))}
      </div>
    </>
  )
}
