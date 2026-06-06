import { useState } from 'react'
import { useLocalStorage, generateId } from '../hooks/useLocalStorage'
import { Plus, ChevronDown, ChevronUp, Check, Trash2, X, Pencil, ArrowUpDown, MoveUp, MoveDown } from 'lucide-react'

const DEFAULT_TASKS = ['Bloods', 'Imaging', 'Consult', 'Discharge', 'Script', 'Referral', 'IX', 'Review']

// ─── Patient Card ────────────────────────────────────────────────────────────

function PatientCard({ patient, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [newTask, setNewTask] = useState('')

  const toggleSeen = () => onUpdate({ ...patient, seen: !patient.seen })
  const toggleTask = (tid) => onUpdate({ ...patient, tasks: patient.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) })
  const addTask = (label) => {
    if (!label.trim()) return
    onUpdate({ ...patient, tasks: [...patient.tasks, { id: generateId(), label: label.trim(), done: false }] })
    setNewTask('')
  }
  const removeTask = (tid) => onUpdate({ ...patient, tasks: patient.tasks.filter(t => t.id !== tid) })
  const doneTasks = patient.tasks.filter(t => t.done).length

  const startEdit = (e) => {
    e.stopPropagation()
    setEditForm({ name: patient.name, bed: patient.bed, diagnosis: patient.diagnosis || '', service: patient.service || '' })
    setEditing(true)
    if (!expanded) setExpanded(true)
  }
  const saveEdit = () => {
    if (!editForm.name.trim() || !editForm.bed.trim()) return
    onUpdate({ ...patient, ...editForm })
    setEditing(false)
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 mb-3 overflow-hidden ${patient.seen ? 'border-green-400' : 'border-blue-500'}`}>
      <div className="flex items-center px-4 py-3 gap-3">
        <button onClick={toggleSeen}
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${patient.seen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
          <Check size={16} strokeWidth={3} />
        </button>
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{patient.name}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{patient.bed}</span>
          </div>
          <p className="text-xs text-gray-500 truncate">{patient.diagnosis || 'No diagnosis'}</p>
          {patient.service && <p className="text-xs text-indigo-500 font-medium truncate">{patient.service}</p>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">{doneTasks}/{patient.tasks.length}</span>
          <button onClick={startEdit} className="text-gray-300 hover:text-blue-400 p-1"><Pencil size={14} /></button>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 p-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">

          {/* Edit patient details */}
          {editing ? (
            <div className="space-y-2 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Edit Patient</p>
              <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                placeholder="Name *" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white" />
              <input value={editForm.bed} onChange={e => setEditForm({...editForm, bed: e.target.value})}
                placeholder="Bed / Room *" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white" />
              <input value={editForm.diagnosis} onChange={e => setEditForm({...editForm, diagnosis: e.target.value})}
                placeholder="Diagnosis" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white" />
              <input value={editForm.service} onChange={e => setEditForm({...editForm, service: e.target.value})}
                placeholder="Attending / Service" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white">Cancel</button>
                <button onClick={saveEdit} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Save</button>
              </div>
            </div>
          ) : (
            <>
              {/* Move up/down */}
              <div className="flex gap-2">
                <button onClick={onMoveUp} disabled={isFirst}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isFirst ? 'text-gray-300 border-gray-100' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  <MoveUp size={13} /> Move Up
                </button>
                <button onClick={onMoveDown} disabled={isLast}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isLast ? 'text-gray-300 border-gray-100' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  <MoveDown size={13} /> Move Down
                </button>
              </div>
            </>
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Tasks</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {patient.tasks.map(t => (
                <div key={t.id} className="flex items-center gap-1">
                  <button onClick={() => toggleTask(t.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${t.done ? 'bg-green-100 border-green-300 text-green-700 line-through' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                    {t.label}
                  </button>
                  <button onClick={() => removeTask(t.id)} className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap mb-2">
              {DEFAULT_TASKS.filter(d => !patient.tasks.find(t => t.label === d)).map(d => (
                <button key={d} onClick={() => addTask(d)}
                  className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  + {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask(newTask)}
                placeholder="Custom task..." className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400" />
              <button onClick={() => addTask(newTask)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg">Add</button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Notes</p>
            <textarea value={patient.notes} onChange={e => onUpdate({ ...patient, notes: e.target.value })}
              placeholder="Clinical notes..." rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none" />
          </div>

          <button onClick={() => onDelete(patient.id)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
            <Trash2 size={12} /> Remove patient
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Add Patient Modal ────────────────────────────────────────────────────────

function AddPatientModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: '', bed: '', diagnosis: '', service: '' })
  const submit = () => {
    if (!form.name.trim() || !form.bed.trim()) return
    onAdd({ id: generateId(), ...form, seen: false, notes: '', tasks: [] })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900">Add Patient</h3>
        <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Patient name *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })}
          placeholder="Bed / Room *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })}
          placeholder="Diagnosis" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
          placeholder="Attending / Service (e.g. Gen Surgery, Ortho)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium">Add Patient</button>
        </div>
      </div>
    </div>
  )
}

// ─── Ward Name Modal ──────────────────────────────────────────────────────────

function WardNameModal({ initial, title, onConfirm, onClose }) {
  const [name, setName] = useState(initial || '')
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim())}
          placeholder="e.g. 4 West, ICU, Surgical" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-blue-400" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={() => name.trim() && onConfirm(name.trim())}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium">Confirm</button>
        </div>
      </div>
    </div>
  )
}

// ─── Ward View (single ward's patient list) ───────────────────────────────────

const SORT_OPTIONS = [
  { key: 'manual',  label: 'Manual' },
  { key: 'bed',     label: 'Bed' },
  { key: 'name',    label: 'Name' },
  { key: 'unseen',  label: 'Unseen first' },
  { key: 'service', label: 'Service' },
]

function sortPatients(patients, sort) {
  if (sort === 'manual') return patients
  return [...patients].sort((a, b) => {
    if (sort === 'bed')     return (a.bed || '').localeCompare(b.bed || '', undefined, { numeric: true })
    if (sort === 'name')    return (a.name || '').localeCompare(b.name || '')
    if (sort === 'unseen')  return (a.seen === b.seen ? 0 : a.seen ? 1 : -1)
    if (sort === 'service') return (a.service || '').localeCompare(b.service || '')
    return 0
  })
}

function WardView({ ward, onUpdateWard }) {
  const [showAdd, setShowAdd] = useState(false)
  const [sort, setSort] = useState('manual')
  const [showSort, setShowSort] = useState(false)

  const patients = ward.patients || []
  const seen = patients.filter(p => p.seen).length

  const updatePatient = (updated) => onUpdateWard({ ...ward, patients: patients.map(p => p.id === updated.id ? updated : p) })
  const deletePatient = (id) => onUpdateWard({ ...ward, patients: patients.filter(p => p.id !== id) })
  const addPatient = (p) => onUpdateWard({ ...ward, patients: [...patients, p] })
  const resetRound = () => onUpdateWard({ ...ward, patients: patients.map(p => ({ ...p, seen: false, tasks: p.tasks.map(t => ({ ...t, done: false })) })) })

  const movePatient = (id, dir) => {
    const idx = patients.findIndex(p => p.id === id)
    if (idx === -1) return
    const next = [...patients]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onUpdateWard({ ...ward, patients: next })
  }

  const displayed = sortPatients(patients, sort)

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500">{seen}/{patients.length} patients seen</p>
          <div className="mt-1 bg-gray-200 rounded-full h-1.5 w-40">
            <div className="bg-blue-500 rounded-full h-1.5 transition-all" style={{ width: patients.length ? `${(seen / patients.length) * 100}%` : '0%' }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-xl bg-white">
              <ArrowUpDown size={14} />
              {SORT_OPTIONS.find(s => s.key === sort)?.label}
            </button>
            {showSort && (
              <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 z-10 min-w-[140px] overflow-hidden">
                {SORT_OPTIONS.map(s => (
                  <button key={s.key} onClick={() => { setSort(s.key); setShowSort(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sort === s.key ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-xl">
            <Plus size={16} /> Patient
          </button>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🛏️</p>
          <p className="font-medium">No patients in {ward.name}</p>
          <p className="text-sm">Tap + Patient to add</p>
        </div>
      ) : (
        <>
          {displayed.map((p, i) => (
            <PatientCard key={p.id} patient={p} onUpdate={updatePatient} onDelete={deletePatient}
              onMoveUp={() => movePatient(p.id, -1)}
              onMoveDown={() => movePatient(p.id, 1)}
              isFirst={i === 0} isLast={i === displayed.length - 1} />
          ))}
          <button onClick={resetRound} className="w-full mt-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500">
            Reset round (uncheck all)
          </button>
        </>
      )}

      {showAdd && <AddPatientModal onAdd={addPatient} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── Main Ward Component ──────────────────────────────────────────────────────

export default function Ward() {
  const [wards, setWards] = useLocalStorage('wards', [])
  const [activeWardId, setActiveWardId] = useLocalStorage('active-ward', null)
  const [modal, setModal] = useState(null) // 'add' | 'rename' | 'manage'

  const activeWard = wards.find(w => w.id === activeWardId) || wards[0] || null

  const addWard = (name) => {
    const w = { id: generateId(), name, patients: [] }
    setWards(ws => [...ws, w])
    setActiveWardId(w.id)
    setModal(null)
  }
  const renameWard = (name) => {
    setWards(ws => ws.map(w => w.id === activeWard.id ? { ...w, name } : w))
    setModal(null)
  }
  const deleteWard = (id) => {
    setWards(ws => {
      const next = ws.filter(w => w.id !== id)
      if (activeWardId === id) setActiveWardId(next[0]?.id || null)
      return next
    })
  }
  const updateWard = (updated) => setWards(ws => ws.map(w => w.id === updated.id ? updated : w))

  const totalPatients = wards.reduce((n, w) => n + (w.patients?.length || 0), 0)
  const totalSeen = wards.reduce((n, w) => n + (w.patients?.filter(p => p.seen).length || 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Ward Round</h1>
          <div className="flex items-center gap-2">
            {activeWard && (
              <button onClick={() => setModal('rename')} className="bg-white/20 rounded-full p-2">
                <Pencil size={16} />
              </button>
            )}
            <button onClick={() => setModal('add')} className="bg-white/20 rounded-full p-2">
              <Plus size={20} />
            </button>
          </div>
        </div>
        <p className="text-blue-100 text-xs mb-2">{totalSeen}/{totalPatients} patients seen across {wards.length} ward{wards.length !== 1 ? 's' : ''}</p>

        {/* Ward tabs */}
        {wards.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {wards.map(w => {
              const seen = (w.patients || []).filter(p => p.seen).length
              const total = (w.patients || []).length
              const isActive = w.id === (activeWard?.id)
              return (
                <button key={w.id} onClick={() => setActiveWardId(w.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-white text-blue-600' : 'bg-white/20 text-white'}`}>
                  {w.name}
                  <span className={`text-xs ${isActive ? 'text-blue-400' : 'text-white/70'}`}>{seen}/{total}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {wards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-8 text-center">
          <p className="text-5xl mb-4">🏥</p>
          <p className="font-semibold text-gray-600 text-lg mb-1">No wards yet</p>
          <p className="text-sm mb-6">Add your first ward to start the round</p>
          <button onClick={() => setModal('add')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium">
            + Add Ward
          </button>
        </div>
      ) : activeWard ? (
        <WardView key={activeWard.id} ward={activeWard} onUpdateWard={updateWard} />
      ) : null}

      {/* Manage wards — long press hint shown as small button */}
      {wards.length > 0 && (
        <div className="px-4 pb-2">
          <button onClick={() => setModal('manage')} className="text-xs text-gray-400 w-full text-center py-1">
            Manage wards
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'add' && (
        <WardNameModal title="New Ward" onConfirm={addWard} onClose={() => setModal(null)} />
      )}
      {modal === 'rename' && activeWard && (
        <WardNameModal title="Rename Ward" initial={activeWard.name} onConfirm={renameWard} onClose={() => setModal(null)} />
      )}
      {modal === 'manage' && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setModal(null)}>
          <div className="bg-white w-full rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Manage Wards</h3>
            <div className="space-y-2 mb-4">
              {wards.map(w => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="font-medium text-gray-800">{w.name}</p>
                    <p className="text-xs text-gray-400">{(w.patients || []).length} patients</p>
                  </div>
                  <button onClick={() => {
                    if (window.confirm(`Delete ${w.name}? All patients will be lost.`)) deleteWard(w.id)
                  }} className="text-red-400 hover:text-red-600 p-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setModal(null)} className="w-full py-3 rounded-xl border border-gray-200 text-gray-600">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
