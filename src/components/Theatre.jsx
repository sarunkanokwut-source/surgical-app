import { useState } from 'react'
import { useLocalStorage, generateId } from '../hooks/useLocalStorage'
import { Plus, Trash2, ChevronDown, ChevronUp, Check, ChevronLeft, ChevronRight, X } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS = {
  scheduled:     { label: 'Scheduled',    color: 'bg-blue-100 text-blue-700' },
  'in-progress': { label: 'In Progress',  color: 'bg-yellow-100 text-yellow-700' },
  done:          { label: 'Done',         color: 'bg-green-100 text-green-700' },
  postponed:     { label: 'Postponed',    color: 'bg-orange-100 text-orange-700' },
  cancelled:     { label: 'Cancelled',    color: 'bg-red-100 text-red-700' },
}
const STATUS_CYCLE = ['scheduled', 'in-progress', 'done', 'postponed', 'cancelled']
const DAY_LABELS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const ADDON_PRESETS = ['Consult', 'Book ICU', 'Book HDU', 'Blood products', 'Cell saver', 'Neuro monitoring', 'Angio suite', 'Fluoroscopy', 'Pathology', 'Frozen section']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDates(offset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function getMonthDates(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push(iso)
  }
  return cells
}

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Case Card ────────────────────────────────────────────────────────────────

function CaseCard({ c, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS[c.status] || STATUS.scheduled

  const cycleStatus = () => {
    const idx = STATUS_CYCLE.indexOf(c.status)
    onUpdate({ ...c, status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] })
  }
  const toggle = (field) => onUpdate({ ...c, [field]: !c[field] })
  const toggleAddon = (label) => {
    const addons = c.addons || []
    onUpdate({ ...c, addons: addons.includes(label) ? addons.filter(a => a !== label) : [...addons, label] })
  }
  const [customAddon, setCustomAddon] = useState('')
  const addCustomAddon = () => {
    if (!customAddon.trim()) return
    const addons = c.addons || []
    if (!addons.includes(customAddon.trim()))
      onUpdate({ ...c, addons: [...addons, customAddon.trim()] })
    setCustomAddon('')
  }

  const borderColor = c.status === 'done' ? 'border-green-400' : c.status === 'cancelled' ? 'border-red-300' : c.status === 'postponed' ? 'border-orange-400' : 'border-blue-500'
  const opacity = (c.status === 'done' || c.status === 'cancelled') ? 'opacity-70' : ''

  return (
    <div className={`bg-white rounded-xl shadow-sm mb-3 border-l-4 overflow-hidden ${borderColor} ${opacity}`}>
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{c.patientName}</span>
            {c.mrn && <span className="text-xs text-gray-400">#{c.mrn}</span>}
          </div>
          <p className="text-xs text-gray-700 font-medium truncate">{c.operation || c.procedure}{c.side ? ` — ${c.side}` : ''}</p>
          {c.diagnosis && <p className="text-xs text-gray-500 truncate">{c.diagnosis}</p>}
          {c.surgeon && <p className="text-xs text-gray-400">{c.surgeon}</p>}
          {(c.addons || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(c.addons || []).map(a => (
                <span key={a} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cycleStatus} className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${s.color}`}>{s.label}</button>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">

          {/* Pre-op checklist */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Pre-op Checklist</p>
            <div className="flex gap-2 flex-wrap">
              {[['consent', 'Consent'], ['fasting', 'Fasting'], ['marking', 'Marking']].map(([field, label]) => (
                <button key={field} onClick={() => toggle(field)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${c[field] ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <Check size={13} strokeWidth={3} className={c[field] ? 'text-green-600' : 'text-gray-300'} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Implant */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Implant / Equipment</p>
            <input value={c.implant || ''} onChange={e => onUpdate({ ...c, implant: e.target.value })}
              placeholder="e.g. DHS 135° size 3, total hip size L, none"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400" />
          </div>

          {/* Addons */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Add-ons / Arrange</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {ADDON_PRESETS.map(a => (
                <button key={a} onClick={() => toggleAddon(a)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${(c.addons || []).includes(a) ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  {(c.addons || []).includes(a) ? '✓ ' : '+ '}{a}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customAddon} onChange={e => setCustomAddon(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomAddon()}
                placeholder="Custom add-on..." className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400" />
              <button onClick={addCustomAddon} className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg">Add</button>
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_CYCLE.map(st => (
                <button key={st} onClick={() => onUpdate({ ...c, status: st })}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${c.status === st ? STATUS[st].color + ' border-transparent' : 'border-gray-200 text-gray-500'}`}>
                  {STATUS[st].label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Notes</p>
            <textarea value={c.notes || ''} onChange={e => onUpdate({ ...c, notes: e.target.value })}
              placeholder="Any additional notes..." rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none" />
          </div>

          <button onClick={() => onDelete(c.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
            <Trash2 size={12} /> Remove case
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Add Case Modal ────────────────────────────────────────────────────────────

function AddCaseModal({ date, onAdd, onClose }) {
  const [form, setForm] = useState({
    patientName: '', mrn: '', diagnosis: '', operation: '', side: '',
    surgeon: '', implant: '', addons: [],
    consent: false, fasting: false, marking: false,
    status: 'scheduled', notes: ''
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggleAddon = (a) => setForm(p => ({
    ...p, addons: p.addons.includes(a) ? p.addons.filter(x => x !== a) : [...p.addons, a]
  }))

  const submit = () => {
    if (!form.patientName.trim() || !form.operation.trim()) return
    onAdd({ id: generateId(), date, ...form })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 max-h-[92vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">Add Case</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{fmt(date)}</span>
        </div>

        <input autoFocus value={form.patientName} onChange={e => f('patientName', e.target.value)}
          placeholder="Patient name *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <input value={form.mrn} onChange={e => f('mrn', e.target.value)}
          placeholder="MRN / UR number" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <input value={form.diagnosis} onChange={e => f('diagnosis', e.target.value)}
          placeholder="Diagnosis *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <input value={form.operation} onChange={e => f('operation', e.target.value)}
          placeholder="Operation / Procedure *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <div className="flex gap-3">
          <input value={form.side} onChange={e => f('side', e.target.value)}
            placeholder="Side / site" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
          <input value={form.surgeon} onChange={e => f('surgeon', e.target.value)}
            placeholder="Surgeon" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        </div>
        <input value={form.implant} onChange={e => f('implant', e.target.value)}
          placeholder="Implant / Equipment (e.g. DHS 135°, none)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />

        <div>
          <p className="text-xs text-gray-500 mb-2">Add-ons / Arrange</p>
          <div className="flex flex-wrap gap-2">
            {ADDON_PRESETS.map(a => (
              <button key={a} onClick={() => toggleAddon(a)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.addons.includes(a) ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                {form.addons.includes(a) ? '✓ ' : '+ '}{a}
              </button>
            ))}
          </div>
        </div>

        <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
          placeholder="Notes..." rows={2}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400 resize-none" />

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium">Add Case</button>
        </div>
      </div>
    </div>
  )
}

// ─── Day Detail Sheet ──────────────────────────────────────────────────────────

function DaySheet({ date, cases, onUpdate, onDelete, onAdd, onClose }) {
  const [showAdd, setShowAdd] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-40" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{fmt(date)}</h3>
            <p className="text-xs text-gray-400">{cases.length} case{cases.length !== 1 ? 's' : ''}{date === today ? ' · Today' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-xl">
              <Plus size={15} /> Add
            </button>
            <button onClick={onClose} className="text-gray-400 p-2"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {cases.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">🏨</p>
              <p className="text-sm">No cases — tap Add to schedule one</p>
            </div>
          ) : (
            cases.map(c => <CaseCard key={c.id} c={c} onUpdate={onUpdate} onDelete={onDelete} />)
          )}
        </div>
      </div>
      {showAdd && <AddCaseModal date={date} onAdd={(c) => { onAdd(c); setShowAdd(false) }} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ cases, onUpdate, onDelete, onAdd }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const weekDates = getWeekDates(weekOffset)
  const today = new Date().toISOString().split('T')[0]
  const [showAdd, setShowAdd] = useState(false)
  const [addDate, setAddDate] = useState(today)

  const dayCases = (date) => cases.filter(c => c.date === date)

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-xl border border-gray-200 text-gray-500">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {fmt(weekDates[0])} – {fmt(weekDates[6])}
          </p>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-500">Back to this week</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-xl border border-gray-200 text-gray-500">
          <ChevronRight size={16} />
        </button>
      </div>

      {weekDates.map((date, i) => {
        const dc = dayCases(date)
        const isToday = date === today
        return (
          <div key={date} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-600'}`}>{DAY_LABELS[i]}</span>
                <span className="text-xs text-gray-400">{fmt(date)}</span>
                {isToday && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Today</span>}
              </div>
              <button onClick={() => { setAddDate(date); setShowAdd(true) }}
                className="text-xs text-blue-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50">
                <Plus size={13} /> Add
              </button>
            </div>
            {dc.length === 0 ? (
              <p className="text-xs text-gray-300 italic pl-1 mb-1">No cases</p>
            ) : (
              dc.map(c => <CaseCard key={c.id} c={c} onUpdate={onUpdate} onDelete={onDelete} />)
            )}
          </div>
        )
      })}

      {showAdd && <AddCaseModal date={addDate} onAdd={(c) => { onAdd(c); setShowAdd(false) }} onClose={() => setShowAdd(false)} />}
      {selectedDay && (
        <DaySheet date={selectedDay} cases={dayCases(selectedDay)}
          onUpdate={onUpdate} onDelete={onDelete}
          onAdd={onAdd} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}

// ─── Month View ────────────────────────────────────────────────────────────────

function MonthView({ cases, onUpdate, onDelete, onAdd }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState(null)
  const today = now.toISOString().split('T')[0]

  const cells = getMonthDates(year, month)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const dayCases = (date) => cases.filter(c => c.date === date)

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={prevMonth} className="p-2 rounded-xl border border-gray-200 text-gray-500"><ChevronLeft size={16} /></button>
        <div className="text-center">
          <p className="font-semibold text-gray-800">{MONTH_LABELS[month]} {year}</p>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }} className="text-xs text-blue-500">Today</button>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl border border-gray-200 text-gray-500"><ChevronRight size={16} /></button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 px-2 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-2 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const dc = dayCases(date)
          const isToday = date === today
          const dayNum = parseInt(date.split('-')[2])
          const hasOverdue = dc.some(c => c.status === 'postponed' || c.status === 'cancelled')
          return (
            <button key={date} onClick={() => setSelectedDay(date)}
              className={`rounded-xl py-1.5 px-1 flex flex-col items-center transition-colors min-h-[52px]
                ${isToday ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-100 hover:bg-blue-50'}`}>
              <span className={`text-sm font-semibold leading-none mb-1 ${isToday ? 'text-white' : ''}`}>{dayNum}</span>
              {dc.length > 0 ? (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none
                  ${isToday ? 'bg-white/30 text-white' : hasOverdue ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {dc.length}
                </span>
              ) : (
                <span className="w-1 h-1 rounded-full bg-transparent" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 mt-3">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200" /><span className="text-xs text-gray-400">Cases</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200" /><span className="text-xs text-gray-400">Has postponed</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600" /><span className="text-xs text-gray-400">Today</span></div>
      </div>

      {selectedDay && (
        <DaySheet date={selectedDay} cases={dayCases(selectedDay)}
          onUpdate={onUpdate} onDelete={onDelete}
          onAdd={onAdd} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}

// ─── Main Theatre Component ────────────────────────────────────────────────────

export default function Theatre() {
  const [cases, setCases] = useLocalStorage('theatre-cases', [])
  const [view, setView] = useState('week') // 'week' | 'month'

  const addCase    = (c) => setCases(prev => [...prev, c])
  const updateCase = (u) => setCases(prev => prev.map(c => c.id === u.id ? u : c))
  const deleteCase = (id) => setCases(prev => prev.filter(c => c.id !== id))

  const today = new Date().toISOString().split('T')[0]
  const todayCount = cases.filter(c => c.date === today).length

  return (
    <div className="flex flex-col h-full">
      <div className="bg-blue-600 text-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Theatre</h1>
          <span className="text-blue-100 text-sm">{todayCount > 0 ? `${todayCount} today` : ''}</span>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => setView('week')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${view === 'week' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}>
            Week
          </button>
          <button onClick={() => setView('month')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${view === 'month' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}>
            Month
          </button>
        </div>
      </div>

      {view === 'week'
        ? <WeekView  cases={cases} onUpdate={updateCase} onDelete={deleteCase} onAdd={addCase} />
        : <MonthView cases={cases} onUpdate={updateCase} onDelete={deleteCase} onAdd={addCase} />
      }
    </div>
  )
}
