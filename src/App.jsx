import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, CalendarClock, Settings as SettingsIcon } from 'lucide-react'
import { api, setUnauthorizedHandler } from './lib/api'
import { Login, ChangePassword } from './components/Login'
import Round from './components/Round'
import Todo, { buildTodo } from './components/Todo'
import Settings from './components/Settings'
import PatientForm from './components/PatientForm'
import { Sheet } from './components/ui'

const POLL_MS = 30_000

function useWardData(enabled) {
  const [patients, setPatients] = useState([])
  const [lists, setLists] = useState({ wards: [], attendings: [] })
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([api('/patients'), api('/lists')])
      setPatients(p.patients)
      setLists(l)
      setLoaded(true)
      setError('')
    } catch (e) {
      if (e.status !== 401) setError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!enabled) { setPatients([]); setLoaded(false); return }
    reload()
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), POLL_MS)
    const onVis = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [enabled, reload])

  // Create or update. Returns the saved patient; throws ApiError on failure.
  const savePatient = useCallback(async (p, status) => {
    const { id, version, updatedAt, updatedBy, dischargedAt, status: _s, ...data } = p
    try {
      const res = id
        ? await api(`/patients/${id}`, { method: 'PUT', body: { data, version, status: status || p.status } })
        : await api('/patients', { method: 'POST', body: { data } })
      const saved = res.patient
      setPatients(ps => {
        const rest = ps.filter(x => x.id !== saved.id)
        return saved.status === 'active' ? [...rest, saved] : rest
      })
      return saved
    } catch (e) {
      if (e.status === 409 || e.status === 404) reload()
      throw e
    }
  }, [reload])

  const deletePatient = useCallback(async (id) => {
    await api(`/patients/${id}`, { method: 'DELETE' })
    setPatients(ps => ps.filter(x => x.id !== id))
  }, [])

  return { patients, lists, loaded, error, reload, savePatient, deletePatient }
}

const TABS = [
  { id: 'round', label: 'Round', Icon: ClipboardList },
  { id: 'todo', label: 'To-do', Icon: CalendarClock },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = checking, null = logged out
  const [tab, setTab] = useState('round')
  const [editing, setEditing] = useState(null) // patient object, or {} for new

  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); setEditing(null) })
    api('/auth/me').then(r => setUser(r.user)).catch(() => setUser(null))
  }, [])

  const ready = !!user && !user.mustChangePassword
  const data = useWardData(ready)

  const todoCount = useMemo(() => {
    const t = buildTodo(data.patients)
    return t.overdue.length + t.today.length
  }, [data.patients])

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch {}
    setUser(null); setEditing(null); setTab('round')
  }

  if (user === undefined) return <div className="h-screen flex items-center justify-center text-gray-400">Loading…</div>
  if (!user) return <Login onLogin={setUser} />
  if (user.mustChangePassword) {
    return (
      <Sheet title="Set a new password" onClose={logout}>
        <ChangePassword forced onDone={() => setUser({ ...user, mustChangePassword: false })} onCancel={logout} />
      </Sheet>
    )
  }

  // Always edit the freshest copy (polling may have updated it)
  const openPatient = (p) => setEditing(p.id ? data.patients.find(x => x.id === p.id) || p : p)

  return (
    <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-gray-50">
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'round' && <Round data={data} onOpen={openPatient} />}
        {tab === 'todo' && <Todo data={data} onOpen={openPatient} />}
        {tab === 'settings' && <Settings user={user} data={data} onLogout={logout} />}
      </div>

      <nav className="bg-white border-t border-gray-200 flex safe-bottom">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`relative flex-1 flex flex-col items-center py-2 gap-0.5 ${tab === id ? 'text-blue-600' : 'text-gray-400'}`}>
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
            {id === 'todo' && todoCount > 0 && (
              <span className="absolute top-1 left-1/2 ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{todoCount}</span>
            )}
          </button>
        ))}
      </nav>

      {editing && (
        <PatientForm
          patient={editing}
          lists={data.lists}
          isAdmin={user.role === 'admin'}
          onSave={data.savePatient}
          onDelete={data.deletePatient}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
