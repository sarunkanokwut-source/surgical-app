import { useState } from 'react'
import { useLocalStorage, generateId } from '../hooks/useLocalStorage'
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react'

const STATUS = {
  scheduled:    { label: 'Scheduled',   color: 'bg-blue-100 text-blue-700' },
  'in-progress':{ label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  done:         { label: 'Done',        color: 'bg-green-100 text-green-700' },
  postponed:    { label: 'Postponed',   color: 'bg-orange-100 text-orange-700' },
  cancelled:    { label: 'Cancelled',   color: 'bg-red-100 text-red-700' },
}

const STATUS_CYCLE = ['scheduled', 'in-progress', 'done', 'postponed', 'cancelled']

function getWeekDates() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function CaseCard({ c, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS[c.status] || STATUS.scheduled
  const cycleStatus = () => {
    const idx = STATUS_CYCLE.indexOf(c.status)
    onUpdate({ ...c, status: STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] })
  }
  const toggle = (field) => onUpdate({ ...c, [field]: !c[field] })

  return (
    <div className={`bg-white rounded-xl shadow-sm mb-3 border-l-4 overflow-hidden ${c.status === 'done' ? 'border-green-400 opacity-75' : c.status === 'cancelled' ? 'border-red-300 opacity-60' : 'border-blue-500'}`}>
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{c.patientName}</span>
            {c.mrn && <span className="text-xs text-gray-400">#{c.mrn}</span>}
          </div>
          <p className="text-xs text-gray-600 truncate">{c.procedure}{c.side ? ` — ${c.side}` : ''}</p>
          {c.surgeon && <p className="text-xs text-gray-400">{c.surgeon}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cycleStatus} className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</button>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Pre-op Checklist</p>
            <div className="flex gap-3">
              {[['consent', 'Consent'], ['fasting', 'Fasting'], ['marking', 'Marking']].map(([field, label]) => (
                <button key={field} onClick={() => toggle(field)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${c[field] ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <Check size={13} strokeWidth={3} className={c[field] ? 'text-green-600' : 'text-gray-300'} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_CYCLE.map(s => (
                <button key={s} onClick={() => onUpdate({ ...c, status: s })}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${c.status === s ? STATUS[s].color + ' border-transparent' : 'border-gray-200 text-gray-500'}`}>
                  {STATUS[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Notes</p>
            <textarea value={c.notes || ''} onChange={e => onUpdate({ ...c, notes: e.target.value })}
              placeholder="Notes..." rows={2}
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

function AddCaseModal({ date, onAdd, onClose }) {
  const [form, setForm] = useState({
    patientName: '', mrn: '', procedure: '', side: '', surgeon: '',
    consent: false, fasting: false, marking: false, status: 'scheduled', notes: ''
  })
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const submit = () => {
    if (!form.patientName.trim() || !form.procedure.trim()) return
    onAdd({ id: generateId(), date, ...form })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-4">Add Case — {formatDate(date)}</h3>
        <div className="space-y-3">
          <input autoFocus value={form.patientName} onChange={e => f('patientName', e.target.value)}
            placeholder="Patient name *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
          <input value={form.mrn} onChange={e => f('mrn', e.target.value)}
            placeholder="MRN / UR number" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
          <input value={form.procedure} onChange={e => f('procedure', e.target.value)}
            placeholder="Procedure *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
          <input value={form.side} onChange={e => f('side', e.target.value)}
            placeholder="Side / site (e.g. Right, Abdomen)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
          <input value={form.surgeon} onChange={e => f('surgeon', e.target.value)}
            placeholder="Surgeon" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
            <button onClick={submit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium">Add Case</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Theatre() {
  const [cases, setCases] = useLocalStorage('theatre-cases', [])
  const [selectedDay, setSelectedDay] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const weekDates = getWeekDates()
  const today = new Date().toISOString().split('T')[0]

  const addCase = (c) => setCases(prev => [...prev, c])
  const updateCase = (u) => setCases(prev => prev.map(c => c.id === u.id ? u : c))
  const deleteCase = (id) => setCases(prev => prev.filter(c => c.id !== id))

  const activeDate = selectedDay === 'all' ? null : weekDates[parseInt(selectedDay)]
  const visibleCases = activeDate ? cases.filter(c => c.date === activeDate) : cases.filter(c => weekDates.includes(c.date))

  const addDate = activeDate || today

  return (
    <div className="flex flex-col h-full">
      <div className="bg-blue-600 text-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Theatre</h1>
          <button onClick={() => setShowAdd(true)} className="bg-white/20 rounded-full p-2"><Plus size={20} /></button>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button onClick={() => setSelectedDay('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedDay === 'all' ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}>
            Week
          </button>
          {weekDates.map((date, i) => {
            const count = cases.filter(c => c.date === date).length
            const isToday = date === today
            return (
              <button key={date} onClick={() => setSelectedDay(String(i))}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors relative ${selectedDay === String(i) ? 'bg-white text-blue-600' : isToday ? 'bg-white/30 text-white' : 'bg-white/20 text-white'}`}>
                {DAY_LABELS[i]}
                {count > 0 && <span className="ml-1 text-xs opacity-75">({count})</span>}
                {isToday && selectedDay !== String(i) && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-300 rounded-full" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {selectedDay === 'all' ? (
          weekDates.map((date, i) => {
            const dayCases = cases.filter(c => c.date === date)
            return (
              <div key={date} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-700 text-sm">{DAY_LABELS[i]} — {formatDate(date)}</h2>
                    {date === today && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Today</span>}
                  </div>
                  <span className="text-xs text-gray-400">{dayCases.length} case{dayCases.length !== 1 ? 's' : ''}</span>
                </div>
                {dayCases.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-1">No cases scheduled</p>
                ) : (
                  dayCases.map(c => <CaseCard key={c.id} c={c} onUpdate={updateCase} onDelete={deleteCase} />)
                )}
              </div>
            )
          })
        ) : (
          <>
            {visibleCases.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🏨</p>
                <p className="font-medium">No cases for {DAY_LABELS[parseInt(selectedDay)]}</p>
                <p className="text-sm">Tap + to add a case</p>
              </div>
            ) : (
              visibleCases.map(c => <CaseCard key={c.id} c={c} onUpdate={updateCase} onDelete={deleteCase} />)
            )}
          </>
        )}
      </div>

      {showAdd && <AddCaseModal date={addDate} onAdd={addCase} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
