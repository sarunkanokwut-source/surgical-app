import { useState } from 'react'
import { useLocalStorage, generateId } from '../hooks/useLocalStorage'
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

function daysDiff(dateStr) {
  if (!dateStr) return null
  const last = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now - last) / 86400000)
}

function DueChip({ wound }) {
  const days = daysDiff(wound.lastDressed)
  if (days === null) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No date</span>
  const freq = wound.frequencyDays || 2
  const overdue = days >= freq
  const dueToday = days === freq - 1
  if (overdue) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Overdue ({days}d)</span>
  if (dueToday) return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Due today</span>
  return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Due in {freq - days}d</span>
}

function WoundCard({ wound, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [newNote, setNewNote] = useState('')

  const addNote = () => {
    if (!newNote.trim()) return
    onUpdate({ ...wound, notes: [...(wound.notes || []), { id: generateId(), date: new Date().toISOString().split('T')[0], text: newNote.trim() }] })
    setNewNote('')
  }
  const markDressed = () => onUpdate({ ...wound, lastDressed: new Date().toISOString().split('T')[0] })

  return (
    <div className="bg-white rounded-xl shadow-sm mb-3 border-l-4 border-purple-500 overflow-hidden">
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{wound.patientName}</span>
            {wound.mrn && <span className="text-xs text-gray-400">#{wound.mrn}</span>}
          </div>
          <p className="text-xs text-gray-600">{wound.location}{wound.woundType ? ` — ${wound.woundType}` : ''}</p>
          <div className="mt-1"><DueChip wound={wound} /></div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 p-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Dressing type</p>
              <input value={wound.dressingType || ''} onChange={e => onUpdate({ ...wound, dressingType: e.target.value })}
                placeholder="e.g. Allevyn, VAC" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Change every (days)</p>
              <input type="number" min="1" value={wound.frequencyDays || ''} onChange={e => onUpdate({ ...wound, frequencyDays: parseInt(e.target.value) || 2 })}
                placeholder="2" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Last dressed</p>
            <div className="flex gap-2">
              <input type="date" value={wound.lastDressed || ''} onChange={e => onUpdate({ ...wound, lastDressed: e.target.value })}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
              <button onClick={markDressed} className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg whitespace-nowrap">Mark today</button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Progress notes</p>
            {(wound.notes || []).map(n => (
              <div key={n.id} className="flex gap-2 mb-2">
                <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5">{n.date}</span>
                <p className="text-sm text-gray-700">{n.text}</p>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add note..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
              <button onClick={addNote} className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg">Add</button>
            </div>
          </div>

          <button onClick={() => onDelete(wound.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
            <Trash2 size={12} /> Remove wound
          </button>
        </div>
      )}
    </div>
  )
}

function AddWoundModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ patientName: '', mrn: '', location: '', woundType: '', dressingType: '', frequencyDays: 2, lastDressed: new Date().toISOString().split('T')[0] })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const submit = () => {
    if (!form.patientName.trim() || !form.location.trim()) return
    onAdd({ id: generateId(), ...form, notes: [] })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-1">Add Wound</h3>
        <input autoFocus value={form.patientName} onChange={e => f('patientName', e.target.value)}
          placeholder="Patient name *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <input value={form.mrn} onChange={e => f('mrn', e.target.value)}
          placeholder="MRN / UR number" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <input value={form.location} onChange={e => f('location', e.target.value)}
          placeholder="Wound location *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <input value={form.woundType} onChange={e => f('woundType', e.target.value)}
          placeholder="Wound type (e.g. surgical, traumatic, ulcer)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <input value={form.dressingType} onChange={e => f('dressingType', e.target.value)}
          placeholder="Dressing type (e.g. Allevyn, VAC)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Change every (days)</p>
            <input type="number" min="1" value={form.frequencyDays} onChange={e => f('frequencyDays', parseInt(e.target.value) || 2)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Last dressed</p>
            <input type="date" value={form.lastDressed} onChange={e => f('lastDressed', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium">Add Wound</button>
        </div>
      </div>
    </div>
  )
}

export default function WoundCare() {
  const [wounds, setWounds] = useLocalStorage('wound-care', [])
  const [showAdd, setShowAdd] = useState(false)

  const updateWound = (u) => setWounds(ws => ws.map(w => w.id === u.id ? u : w))
  const deleteWound = (id) => setWounds(ws => ws.filter(w => w.id !== id))
  const addWound = (w) => setWounds(ws => [...ws, w])

  const overdue = wounds.filter(w => {
    const d = daysDiff(w.lastDressed)
    return d !== null && d >= (w.frequencyDays || 2)
  }).length

  return (
    <div className="flex flex-col h-full">
      <div className="bg-purple-600 text-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Wound Care</h1>
          <button onClick={() => setShowAdd(true)} className="bg-white/20 rounded-full p-2"><Plus size={20} /></button>
        </div>
        <p className="text-purple-100 text-sm">
          {wounds.length} wound{wounds.length !== 1 ? 's' : ''}{overdue > 0 ? ` · ${overdue} overdue` : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {wounds.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🩹</p>
            <p className="font-medium">No wounds tracked</p>
            <p className="text-sm">Tap + to add a wound</p>
          </div>
        ) : (
          wounds.map(w => <WoundCard key={w.id} wound={w} onUpdate={updateWound} onDelete={deleteWound} />)
        )}
      </div>

      {showAdd && <AddWoundModal onAdd={addWound} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
