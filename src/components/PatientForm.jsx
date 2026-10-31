import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { emptyPatient, newId } from '../lib/patient'
import { todayISO, daysSince, fmtDate } from '../lib/dates'
import { Sheet, Field, Input, Section, Segmented, Btn, ErrorMsg, inputCls } from './ui'

const IX_PRESETS = ['CBC', 'BUN/Cr', 'Electrolytes', 'ESR/CRP', 'Coag', 'H/C', 'Film X-ray', 'Film post-op', 'CT', 'MRI', 'EKG', 'CXR']
const FREQ = [{ d: 1, l: 'Daily' }, { d: 2, l: 'q 2d' }, { d: 3, l: 'q 3d' }, { d: 7, l: 'Weekly' }]
const smallInput = 'text-base border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 bg-white min-w-0'

export default function PatientForm({ patient, lists, isAdmin, onSave, onDelete, onClose }) {
  const isNew = !patient.id
  const [p, setP] = useState(() => {
    const base = emptyPatient()
    return { ...base, ...patient, wound: { ...base.wound, ...patient.wound } }
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const today = todayISO()

  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }))
  const setWound = (k, v) => setP(prev => ({ ...prev, wound: { ...prev.wound, [k]: v } }))
  const setItem = (key, id, change) => setP(prev => ({ ...prev, [key]: prev[key].map(x => x.id === id ? { ...x, ...change } : x) }))
  const removeItem = (key, id) => setP(prev => ({ ...prev, [key]: prev[key].filter(x => x.id !== id) }))
  const addItem = (key, item) => setP(prev => ({ ...prev, [key]: [...prev[key], { id: newId(), ...item }] }))

  const save = async (status) => {
    if (!p.hn.trim() || !p.name.trim() || !p.ward.trim()) return setError('HN, name and ward are required')
    setBusy(true); setError('')
    try {
      await onSave(p, status)
      onClose()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Permanently delete ${p.name} (HN ${p.hn})? This cannot be undone.`)) return
    setBusy(true)
    try { await onDelete(p.id); onClose() } catch (e) { setError(e.message); setBusy(false) }
  }

  const footer = (
    <>
      <Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
      <Btn onClick={() => save()} disabled={busy} className="flex-[2]">{busy ? 'Saving…' : isNew ? 'Add patient' : 'Save'}</Btn>
    </>
  )

  return (
    <Sheet title={isNew ? 'New patient' : `${p.name} · HN ${p.hn}`} onClose={onClose} footer={footer}>
      <ErrorMsg>{error}</ErrorMsg>

      {/* Identity */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="HN *"><Input value={p.hn} onChange={e => set('hn', e.target.value)} inputMode="numeric" autoFocus={isNew} /></Field>
        <Field label="Bed"><Input value={p.bed} onChange={e => set('bed', e.target.value)} /></Field>
        <Field label="Name *" className="col-span-2"><Input value={p.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Age"><Input value={p.age} onChange={e => set('age', e.target.value)} inputMode="numeric" /></Field>
        <Field label="Sex">
          <Segmented value={p.sex} onChange={v => set('sex', v)} options={[{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }]} />
        </Field>
        <Field label="Ward *">
          <Input value={p.ward} onChange={e => set('ward', e.target.value)} list="ward-list" placeholder="Select or type" />
        </Field>
        <Field label="Attending">
          <Input value={p.attending} onChange={e => set('attending', e.target.value)} list="attending-list" placeholder="Select or type" />
        </Field>
        <datalist id="ward-list">{lists.wards.map(w => <option key={w.id} value={w.name} />)}</datalist>
        <datalist id="attending-list">{lists.attendings.map(a => <option key={a.id} value={a.name} />)}</datalist>
      </div>

      <Field label="Case">
        <Segmented value={p.caseType} onChange={v => set('caseType', v)}
          options={[{ value: 'primary', label: 'Primary (our case)' }, { value: 'consult', label: 'Consult' }]} />
      </Field>
      {p.caseType === 'consult' && (
        <Field label="Consulted by (department / team)"><Input value={p.consultFrom} onChange={e => set('consultFrom', e.target.value)} placeholder="e.g. Med, Surg, Neuro" /></Field>
      )}

      <Field label="Diagnosis">
        <textarea value={p.diagnosis} onChange={e => set('diagnosis', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </Field>

      <Field label={`Date of injury${p.injuryDate ? ` · Day ${daysSince(p.injuryDate)}` : ''}`}>
        <Input type="date" value={p.injuryDate} onChange={e => set('injuryDate', e.target.value)} max={today} />
      </Field>

      {/* Operations */}
      <Section title="Operations" right={
        <button onClick={() => addItem('operations', { date: '', procedure: '', status: 'planned' })} className="text-xs text-blue-600 flex items-center gap-0.5"><Plus size={14} />Add</button>
      }>
        {p.operations.length === 0 && <p className="text-xs text-gray-400 italic">None</p>}
        <div className="space-y-2">
          {p.operations.map(o => (
            <div key={o.id} className="border border-gray-200 rounded-lg p-2 space-y-2">
              <div className="flex gap-2">
                <input type="date" value={o.date} onChange={e => setItem('operations', o.id, { date: e.target.value })} className={`${smallInput} flex-1`} />
                <select value={o.status} onChange={e => setItem('operations', o.id, { status: e.target.value })} className={`${smallInput} w-28`}>
                  <option value="planned">Planned</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={() => removeItem('operations', o.id)} className="text-gray-300 px-1"><Trash2 size={16} /></button>
              </div>
              <input value={o.procedure} onChange={e => setItem('operations', o.id, { procedure: e.target.value })}
                placeholder="Procedure (e.g. ORIF Lt distal radius)" className={`${smallInput} w-full`} />
              {o.status === 'done' && o.date && <p className="text-xs text-green-700">POD {daysSince(o.date)}</p>}
            </div>
          ))}
        </div>
      </Section>

      {/* Wound */}
      <Section title="Wound dressing">
        <div className="space-y-3">
          <Segmented value={p.wound.needsDressing ? 'yes' : 'no'} onChange={v => setWound('needsDressing', v === 'yes')}
            options={[{ value: 'no', label: 'No dressing' }, { value: 'yes', label: 'Needs dressing' }]} />
          {p.wound.needsDressing && (
            <>
              <div className="flex gap-1.5 flex-wrap items-center">
                {FREQ.map(f => (
                  <button key={f.d} onClick={() => setWound('frequencyDays', f.d)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${p.wound.frequencyDays === f.d ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}>{f.l}</button>
                ))}
                <span className="text-xs text-gray-500 ml-1">every</span>
                <input type="number" min="1" max="30" value={p.wound.frequencyDays} onChange={e => setWound('frequencyDays', parseInt(e.target.value) || 1)}
                  className={`${smallInput} w-16 text-center`} />
                <span className="text-xs text-gray-500">d</span>
              </div>
              <Field label={`Last dressed${p.wound.lastDressed ? ` · ${fmtDate(p.wound.lastDressed)}` : ''}`}>
                <div className="flex gap-2">
                  <Input type="date" value={p.wound.lastDressed} onChange={e => setWound('lastDressed', e.target.value)} max={today} />
                  <Btn variant="secondary" onClick={() => setWound('lastDressed', today)} className="whitespace-nowrap">Today</Btn>
                </div>
              </Field>
              <Input value={p.wound.note} onChange={e => setWound('note', e.target.value)} placeholder="Wound / dressing note (e.g. VAC, Bactigras, drain)" />
            </>
          )}
        </div>
      </Section>

      {/* Investigations */}
      <Section title="Investigations" right={
        <button onClick={() => addItem('investigations', { name: '', date: today, status: 'pending', result: '' })} className="text-xs text-blue-600 flex items-center gap-0.5"><Plus size={14} />Add</button>
      }>
        <div className="flex flex-wrap gap-1 mb-2">
          {IX_PRESETS.map(n => (
            <button key={n} onClick={() => addItem('investigations', { name: n, date: today, status: 'pending', result: '' })}
              className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">+ {n}</button>
          ))}
        </div>
        <div className="space-y-2">
          {[...p.investigations].sort((a, b) => (a.status === b.status ? (a.date || '').localeCompare(b.date || '') : a.status === 'pending' ? -1 : 1)).map(x => (
            <div key={x.id} className={`border rounded-lg p-2 space-y-2 ${x.status === 'done' ? 'border-gray-100 bg-gray-50' : x.date && x.date < today ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex gap-2 items-center">
                <button onClick={() => setItem('investigations', x.id, { status: x.status === 'done' ? 'pending' : 'done' })}
                  aria-label="Toggle done"
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${x.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                  <Check size={14} strokeWidth={3} />
                </button>
                <input value={x.name} onChange={e => setItem('investigations', x.id, { name: e.target.value })} placeholder="Investigation"
                  className={`${smallInput} flex-1 ${x.status === 'done' ? 'line-through text-gray-400' : ''}`} />
                <button onClick={() => removeItem('investigations', x.id)} className="text-gray-300 px-0.5"><Trash2 size={16} /></button>
              </div>
              <div className="flex gap-2">
                <input type="date" value={x.date} onChange={e => setItem('investigations', x.id, { date: e.target.value })} className={`${smallInput} w-[9.5rem] flex-none`} />
                <input value={x.result} onChange={e => setItem('investigations', x.id, { result: e.target.value })} placeholder="Result / note"
                  className={`${smallInput} flex-1`} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Field label="Important remark">
        <textarea value={p.remark} onChange={e => set('remark', e.target.value)} rows={3} className={`${inputCls} resize-none`}
          placeholder="e.g. NPO for OR, on warfarin, plan D/C Fri, family meeting" />
      </Field>

      {!isNew && (
        <div className="pt-2 border-t border-gray-100 space-y-3">
          {p.updatedBy && <p className="text-xs text-gray-400">Last updated by {p.updatedBy} · {new Date(p.updatedAt + 'Z').toLocaleString('en-GB')}</p>}
          <div className="flex gap-2">
            {p.status === 'discharged'
              ? <Btn variant="secondary" disabled={busy} onClick={() => save('active')} className="flex-1">Re-admit</Btn>
              : <Btn variant="secondary" disabled={busy} onClick={() => window.confirm(`Discharge ${p.name}? They will leave the active list.`) && save('discharged')} className="flex-1">Discharge</Btn>}
            {isAdmin && <Btn variant="ghostDanger" disabled={busy} onClick={remove}><Trash2 size={16} /></Btn>}
          </div>
        </div>
      )}
    </Sheet>
  )
}
