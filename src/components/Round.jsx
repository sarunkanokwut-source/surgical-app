import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, RefreshCw } from 'lucide-react'
import { todayISO } from '../lib/dates'
import { bedCompare, dressingStatus, pendingInvestigations } from '../lib/patient'
import PatientCard from './PatientCard'
import { Segmented } from './ui'

// Filter preferences only (no patient data) are remembered on this device
function usePref(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(`pref:${key}`); return s !== null ? JSON.parse(s) : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(`pref:${key}`, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV]
}

const selectCls = 'text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 min-w-0 flex-1'

export default function Round({ data, onOpen }) {
  const { patients, lists, loaded, error, reload, savePatient } = data
  const [ward, setWard] = usePref('ward', '')
  const [attending, setAttending] = usePref('attending', '')
  const [caseType, setCaseType] = usePref('caseType', '')
  const [groupBy, setGroupBy] = usePref('groupBy', 'ward')
  const [flag, setFlag] = useState('') // '' | 'dressing' | 'ix' | 'unseen'
  const [q, setQ] = useState('')

  const wardNames = useMemo(() => [...new Set([...lists.wards.map(w => w.name), ...patients.map(p => p.ward)].filter(Boolean))].sort(), [lists, patients])
  const attendingNames = useMemo(() => [...new Set([...lists.attendings.map(w => w.name), ...patients.map(p => p.attending)].filter(Boolean))].sort(), [lists, patients])

  const today = todayISO()
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return patients.filter(p =>
      (!ward || p.ward === ward) &&
      (!attending || p.attending === attending) &&
      (!caseType || p.caseType === caseType) &&
      (flag !== 'dressing' || dressingStatus(p)?.due) &&
      (flag !== 'ix' || pendingInvestigations(p).length > 0) &&
      (flag !== 'unseen' || p.seenOn !== today) &&
      (!s || [p.hn, p.name, p.bed, p.diagnosis].some(f => (f || '').toLowerCase().includes(s)))
    ).sort(bedCompare)
  }, [patients, ward, attending, caseType, flag, q, today])

  const groups = useMemo(() => {
    const m = new Map()
    for (const p of filtered) {
      const k = (groupBy === 'attending' ? p.attending : p.ward) || '—'
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(p)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, groupBy])

  const seenCount = filtered.filter(p => p.seenOn === today).length
  const counts = {
    dressing: patients.filter(p => dressingStatus(p)?.due).length,
    ix: patients.filter(p => pendingInvestigations(p).length).length,
  }

  const FLAGS = [
    { id: 'unseen', label: 'Not seen' },
    { id: 'dressing', label: `Dressing due (${counts.dressing})` },
    { id: 'ix', label: `Pending Ix (${counts.ix})` },
  ]

  return (
    <>
      <div className="bg-blue-700 text-white px-4 pt-4 pb-3 safe-top space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold leading-tight">Ward Round</h1>
            <p className="text-blue-100 text-xs">{seenCount}/{filtered.length} seen today</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reload} className="bg-white/15 rounded-full p-2" aria-label="Refresh"><RefreshCw size={18} /></button>
            <button onClick={() => onOpen({ ward: ward || '', attending: attending || '', caseType: caseType || 'primary' })}
              className="bg-white text-blue-700 rounded-full pl-2.5 pr-3 py-1.5 flex items-center gap-1 text-sm font-semibold">
              <Plus size={18} /> Patient
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-200" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search HN, name, bed, diagnosis"
            className="w-full bg-white/15 placeholder-blue-200 text-white rounded-lg pl-9 pr-3 py-2 text-base outline-none focus:bg-white/25" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-0.5 no-scrollbar">
          {['', ...wardNames].map(w => (
            <button key={w || 'all'} onClick={() => setWard(w)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${ward === w ? 'bg-white text-blue-700' : 'bg-white/15 text-white'}`}>
              {w || 'All wards'}
              <span className="ml-1 opacity-60 text-xs">{w ? patients.filter(p => p.ward === w).length : patients.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-2 space-y-2">
        <div className="flex gap-2">
          <select value={attending} onChange={e => setAttending(e.target.value)} className={selectCls} aria-label="Attending">
            <option value="">All attendings</option>
            {attendingNames.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className={`${selectCls} flex-none w-32`} aria-label="Group by">
            <option value="ward">Group: ward</option>
            <option value="attending">Group: staff</option>
          </select>
        </div>
        <Segmented size="sm" value={caseType} onChange={setCaseType}
          options={[{ value: '', label: 'All' }, { value: 'primary', label: 'Primary' }, { value: 'consult', label: 'Consult' }]} />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FLAGS.map(f => (
            <button key={f.id} onClick={() => setFlag(flag === f.id ? '' : f.id)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border ${flag === f.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-6">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">Can't reach server: {error}</p>}
        {!loaded ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <p className="text-4xl mb-2">🛏️</p>
            <p className="font-medium">{patients.length ? 'No patients match the filters' : 'No patients yet'}</p>
            {!patients.length && <p className="text-sm">Tap + Patient to add one</p>}
          </div>
        ) : groups.map(([name, ps]) => (
          <div key={name} className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1.5">
              {name} <span className="font-normal text-gray-400">· {ps.length}</span>
            </p>
            {ps.map(p => <PatientCard key={p.id} patient={p} onOpen={onOpen} onQuickSave={savePatient} />)}
          </div>
        ))}
      </div>
    </>
  )
}
