import { useState } from 'react'
import { useLocalStorage, generateId } from '../hooks/useLocalStorage'
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, User } from 'lucide-react'

const FREQ_PRESETS = [
  { label: 'Daily', days: 1 },
  { label: '2 days', days: 2 },
  { label: '3 days', days: 3 },
  { label: 'Weekly', days: 7 },
]

function daysDiff(dateStr) {
  if (!dateStr) return null
  const last = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((now - last) / 86400000)
}

function DueChip({ wound }) {
  const days = daysDiff(wound.lastDressed)
  if (days === null) return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">No date set</span>
  const freq = wound.frequencyDays || 2
  const overdue = days >= freq
  const dueToday = days === freq - 1
  if (freq === 1 && days >= 1) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Change today</span>
  if (overdue) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Overdue ({days}d)</span>
  if (dueToday) return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Due today</span>
  return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Due in {freq - days}d</span>
}

function FreqSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">Change frequency</p>
      <div className="flex gap-2 flex-wrap">
        {FREQ_PRESETS.map(p => (
          <button key={p.days} onClick={() => onChange(p.days)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${value === p.days ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            {p.label}
          </button>
        ))}
        <input type="number" min="1" value={value}
          onChange={e => onChange(parseInt(e.target.value) || 1)}
          className="w-16 text-xs border border-gray-200 rounded-full px-3 py-1.5 outline-none focus:border-purple-400 text-center" />
      </div>
    </div>
  )
}

// ─── Wound Card ────────────────────────────────────────────────────────────────

function WoundCard({ wound, onUpdate, onDelete, wardPatients }) {
  const [expanded, setExpanded] = useState(false)
  const [newNote, setNewNote] = useState('')

  const addNote = () => {
    if (!newNote.trim()) return
    onUpdate({ ...wound, notes: [...(wound.notes || []), { id: generateId(), date: new Date().toISOString().split('T')[0], text: newNote.trim() }] })
    setNewNote('')
  }
  const markDressed = () => onUpdate({ ...wound, lastDressed: new Date().toISOString().split('T')[0] })

  // Find linked patient from ward
  const linkedPatient = wardPatients.find(p => p.id === wound.patientId)

  return (
    <div className={`bg-white rounded-xl shadow-sm mb-3 border-l-4 overflow-hidden ${wound.frequencyDays === 1 && daysDiff(wound.lastDressed) >= 1 ? 'border-red-400' : 'border-purple-500'}`}>
      <div className="flex items-center px-4 py-3 gap-3">
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{wound.patientName}</span>
            {wound.mrn && <span className="text-xs text-gray-400">#{wound.mrn}</span>}
            {linkedPatient && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{linkedPatient.bed}</span>
            )}
          </div>
          <p className="text-xs text-gray-600">{wound.location}{wound.woundType ? ` — ${wound.woundType}` : ''}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {wound.ward && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{wound.ward}</span>}
            {wound.dateOfSurgery && <span className="text-xs text-gray-400">Op: {wound.dateOfSurgery}</span>}
            {linkedPatient?.service && <span className="text-xs text-indigo-400">{linkedPatient.service}</span>}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <DueChip wound={wound} />
            <span className="text-xs text-gray-400">{wound.frequencyDays === 1 ? 'Daily' : `Every ${wound.frequencyDays}d`}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={markDressed} className="text-xs bg-purple-100 text-purple-700 px-2 py-1.5 rounded-lg whitespace-nowrap">
            ✓ Done
          </button>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">

          {/* Linked ward patient info */}
          {linkedPatient && (
            <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <User size={14} className="text-blue-500" />
              <div>
                <p className="text-xs font-medium text-blue-700">{linkedPatient.name} — Bed {linkedPatient.bed}</p>
                <p className="text-xs text-blue-500">{linkedPatient.diagnosis}{linkedPatient.service ? ` · ${linkedPatient.service}` : ''}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Ward</p>
              <input value={wound.ward || ''} onChange={e => onUpdate({ ...wound, ward: e.target.value })}
                placeholder="e.g. 4 West, ICU" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Date of surgery</p>
              <input type="date" value={wound.dateOfSurgery || ''} onChange={e => onUpdate({ ...wound, dateOfSurgery: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Dressing type</p>
            <input value={wound.dressingType || ''} onChange={e => onUpdate({ ...wound, dressingType: e.target.value })}
              placeholder="e.g. Allevyn, VAC, Aquacel" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
          </div>

          <FreqSelector value={wound.frequencyDays || 2} onChange={v => onUpdate({ ...wound, frequencyDays: v })} />

          <div>
            <p className="text-xs text-gray-500 mb-1">Last dressed</p>
            <div className="flex gap-2">
              <input type="date" value={wound.lastDressed || ''} onChange={e => onUpdate({ ...wound, lastDressed: e.target.value })}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
              <button onClick={markDressed} className="text-xs bg-purple-600 text-white px-3 py-2 rounded-lg whitespace-nowrap">Today</button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Progress notes</p>
            {(wound.notes || []).length === 0 && <p className="text-xs text-gray-400 italic mb-2">No notes yet</p>}
            {(wound.notes || []).map(n => (
              <div key={n.id} className="flex gap-2 mb-2">
                <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5">{n.date}</span>
                <p className="text-sm text-gray-700">{n.text}</p>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add progress note..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400" />
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

// ─── Add Wound Modal ───────────────────────────────────────────────────────────

function AddWoundModal({ onAdd, onClose, wardPatients }) {
  const [form, setForm] = useState({
    patientId: '', patientName: '', mrn: '',
    ward: '', dateOfSurgery: '',
    location: '', woundType: '', dressingType: '',
    frequencyDays: 2, lastDressed: new Date().toISOString().split('T')[0]
  })
  const [showPicker, setShowPicker] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const selectPatient = (p) => {
    setForm(prev => ({ ...prev, patientId: p.id, patientName: p.name, mrn: p.mrn || '', ward: p.wardName || '' }))
    setShowPicker(false)
  }
  const clearPatient = () => f('patientId', '') || f('patientName', '')

  const submit = () => {
    if (!form.patientName.trim() || !form.location.trim()) return
    onAdd({ id: generateId(), ...form, notes: [] })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 max-h-[92vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-1">Add Wound</h3>

        {/* Patient picker */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Patient</p>
          {form.patientId ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <div>
                <p className="font-medium text-blue-800 text-sm">{form.patientName}</p>
                {wardPatients.find(p => p.id === form.patientId)?.bed &&
                  <p className="text-xs text-blue-500">Bed {wardPatients.find(p => p.id === form.patientId).bed}</p>}
              </div>
              <button onClick={() => f('patientId', '')} className="text-blue-400 text-xs">Change</button>
            </div>
          ) : (
            <>
              {wardPatients.length > 0 && (
                <button onClick={() => setShowPicker(!showPicker)}
                  className="w-full flex items-center gap-2 border border-dashed border-purple-300 rounded-xl px-4 py-3 text-sm text-purple-600 mb-2">
                  <User size={16} /> Pick from ward list
                </button>
              )}
              {showPicker && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-2 max-h-40 overflow-y-auto">
                  {wardPatients.map(p => (
                    <button key={p.id} onClick={() => selectPatient(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-100 last:border-0">
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">Bed {p.bed}{p.service ? ` · ${p.service}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
              <input autoFocus={wardPatients.length === 0} value={form.patientName} onChange={e => f('patientName', e.target.value)}
                placeholder="Or type patient name *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
            </>
          )}
        </div>

        <input value={form.mrn} onChange={e => f('mrn', e.target.value)}
          placeholder="MRN / UR number" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <div className="flex gap-3">
          <input value={form.ward} onChange={e => f('ward', e.target.value)}
            placeholder="Ward (e.g. 4 West, ICU)" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 pl-1">Date of surgery</p>
            <input type="date" value={form.dateOfSurgery} onChange={e => f('dateOfSurgery', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
          </div>
        </div>
        <input value={form.location} onChange={e => f('location', e.target.value)}
          placeholder="Wound location * (e.g. Left leg, Abdomen)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <input value={form.woundType} onChange={e => f('woundType', e.target.value)}
          placeholder="Wound type (e.g. surgical, traumatic, ulcer)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        <input value={form.dressingType} onChange={e => f('dressingType', e.target.value)}
          placeholder="Dressing type (e.g. Allevyn, VAC, Aquacel)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />

        <FreqSelector value={form.frequencyDays} onChange={v => f('frequencyDays', v)} />

        <div>
          <p className="text-xs text-gray-500 mb-1">Last dressed</p>
          <input type="date" value={form.lastDressed} onChange={e => f('lastDressed', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-purple-400" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium">Add Wound</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function WoundCare() {
  const [wounds, setWounds] = useLocalStorage('wound-care', [])
  const [wards] = useLocalStorage('wards', [])
  const [showAdd, setShowAdd] = useState(false)

  // Flatten all patients from all wards
  const wardPatients = wards.flatMap(w => (w.patients || []).map(p => ({ ...p, wardName: w.name })))

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
          {wounds.length} wound{wounds.length !== 1 ? 's' : ''}{overdue > 0 ? ` · ⚠️ ${overdue} overdue` : ' · all clear'}
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
          wounds.map(w => (
            <WoundCard key={w.id} wound={w} onUpdate={updateWound} onDelete={deleteWound} wardPatients={wardPatients} />
          ))
        )}
      </div>

      {showAdd && <AddWoundModal onAdd={addWound} onClose={() => setShowAdd(false)} wardPatients={wardPatients} />}
    </div>
  )
}
