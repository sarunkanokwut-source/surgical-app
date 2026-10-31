import { useEffect, useState } from 'react'
import { LogOut, X, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { fmtDate } from '../lib/dates'
import { ChangePassword } from './Login'
import { Sheet, Field, Input, Btn, ErrorMsg, Badge, Segmented } from './ui'

function Row({ label, sub, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 last:border-0 text-left">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <ChevronRight size={16} className="text-gray-300" />
    </button>
  )
}

function Group({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1.5">{title}</p>
      <div className="rounded-xl overflow-hidden shadow-sm">{children}</div>
    </div>
  )
}

// ─── Ward / attending list editor ────────────────────────────────────────────

function ListEditor({ kind, items, onChanged, onClose }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const add = async () => {
    if (!name.trim()) return
    try { await api('/lists', { method: 'POST', body: { kind, name } }); setName(''); onChanged() } catch (e) { setError(e.message) }
  }
  const remove = async (it) => {
    if (!window.confirm(`Remove "${it.name}" from the list? Patients keep their current value.`)) return
    try { await api(`/lists/${it.id}`, { method: 'DELETE' }); onChanged() } catch (e) { setError(e.message) }
  }
  return (
    <Sheet title={kind === 'ward' ? 'Wards' : 'Attending staff'} onClose={onClose}>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={kind === 'ward' ? 'e.g. Ortho M1, Ortho F, ICU' : 'e.g. Aj. Somchai'} />
        <Btn onClick={add}>Add</Btn>
      </div>
      <ErrorMsg>{error}</ErrorMsg>
      <div className="divide-y divide-gray-100">
        {items.length === 0 && <p className="text-sm text-gray-400 py-2">None yet</p>}
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-gray-800">{it.name}</span>
            <button onClick={() => remove(it)} className="text-gray-300 p-1"><X size={16} /></button>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

// ─── Discharged patients ─────────────────────────────────────────────────────

function Discharged({ isAdmin, savePatient, onClose }) {
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const load = () => api('/patients?status=discharged').then(r => setList(r.patients)).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const readmit = async (p) => {
    try { await savePatient(p, 'active'); load() } catch (e) { setError(e.message) }
  }
  const purge = async () => {
    const days = window.prompt('Permanently delete discharged patients older than how many days?', '30')
    if (days === null) return
    try {
      const r = await api('/patients/purge', { method: 'POST', body: { days: Number(days) } })
      alert(`${r.deleted} record(s) deleted`); load()
    } catch (e) { setError(e.message) }
  }

  return (
    <Sheet title="Discharged patients" onClose={onClose}>
      <ErrorMsg>{error}</ErrorMsg>
      {!list ? <p className="text-sm text-gray-400">Loading…</p> : list.length === 0 ? <p className="text-sm text-gray-400">None</p> : (
        <div className="divide-y divide-gray-100">
          {[...list].sort((a, b) => (b.dischargedAt || '').localeCompare(a.dischargedAt || '')).map(p => (
            <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.name} · HN {p.hn}</p>
                <p className="text-xs text-gray-400 truncate">{p.ward} · {p.diagnosis} · D/C {fmtDate(p.dischargedAt)}</p>
              </div>
              <Btn variant="secondary" onClick={() => readmit(p)} className="!py-1.5 !px-3 text-xs">Re-admit</Btn>
            </div>
          ))}
        </div>
      )}
      {isAdmin && (
        <div className="pt-3 border-t border-gray-100">
          <Btn variant="ghostDanger" onClick={purge} className="w-full">Purge old discharged records…</Btn>
          <p className="text-xs text-gray-400 mt-1.5">PDPA: keep personal data only as long as needed for care.</p>
        </div>
      )}
    </Sheet>
  )
}

// ─── Users (admin) ───────────────────────────────────────────────────────────

function Users({ me, onClose }) {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'user' })
  const load = () => api('/users').then(r => setUsers(r.users)).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const create = async () => {
    setError('')
    try {
      await api('/users', { method: 'POST', body: form })
      setForm({ username: '', displayName: '', password: '', role: 'user' }); load()
    } catch (e) { setError(e.message) }
  }
  const update = async (u, change) => {
    setError('')
    try { await api(`/users/${u.id}`, { method: 'PUT', body: change }); load() } catch (e) { setError(e.message) }
  }
  const resetPw = (u) => {
    const pw = window.prompt(`Temporary password for ${u.username} (min 8). They must change it at next login.`)
    if (pw) update(u, { password: pw })
  }

  return (
    <Sheet title="Team members" onClose={onClose}>
      <ErrorMsg>{error}</ErrorMsg>
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">Add member</p>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="username" autoCapitalize="none" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <Input placeholder="Display name" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
          <Input placeholder="Temp password" type="text" autoComplete="off" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <Segmented size="sm" value={form.role} onChange={v => setForm({ ...form, role: v })} options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} />
        </div>
        <Btn onClick={create} className="w-full">Create account</Btn>
        <p className="text-xs text-gray-400">Give the temporary password in person. They'll be asked to set their own on first login.</p>
      </div>

      <div className="divide-y divide-gray-100">
        {users.map(u => (
          <div key={u.id} className={`py-2.5 ${u.active ? '' : 'opacity-50'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">{u.displayName}</span>
              <span className="text-xs text-gray-400">@{u.username}</span>
              {u.role === 'admin' && <Badge tone="indigo">Admin</Badge>}
              {!u.active && <Badge tone="red">Disabled</Badge>}
              {u.mustChangePassword && u.active && <Badge tone="amber">Temp password</Badge>}
            </div>
            {u.id !== me.id && (
              <div className="flex gap-3 mt-1 text-xs">
                <button onClick={() => resetPw(u)} className="text-blue-600">Reset password</button>
                <button onClick={() => update(u, { role: u.role === 'admin' ? 'user' : 'admin' })} className="text-blue-600">
                  {u.role === 'admin' ? 'Make user' : 'Make admin'}
                </button>
                <button onClick={() => update(u, { active: !u.active })} className={u.active ? 'text-red-600' : 'text-green-700'}>
                  {u.active ? 'Disable' : 'Enable'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  )
}

function Audit({ onClose }) {
  const [entries, setEntries] = useState(null)
  useEffect(() => { api('/audit').then(r => setEntries(r.entries)).catch(() => setEntries([])) }, [])
  return (
    <Sheet title="Access log (last 300)" onClose={onClose}>
      {!entries ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="divide-y divide-gray-100 text-xs">
          {entries.map(e => (
            <div key={e.id} className="py-1.5">
              <span className="text-gray-400">{new Date(e.at + 'Z').toLocaleString('en-GB')}</span>{' '}
              <span className="font-medium text-gray-700">{e.username || '—'}</span>{' '}
              <span className={e.action === 'login_failed' ? 'text-red-600' : 'text-gray-600'}>{e.action.replace(/_/g, ' ')}</span>
              {e.target && <span className="text-gray-500"> {e.target}</span>}
              {e.ip && <span className="text-gray-300"> · {e.ip}</span>}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Settings({ user, data, onLogout }) {
  const [open, setOpen] = useState(null)
  const isAdmin = user.role === 'admin'
  const close = () => setOpen(null)

  return (
    <>
      <div className="bg-blue-700 text-white px-4 pt-4 pb-4 safe-top">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-blue-100 text-xs">Signed in as {user.displayName} (@{user.username}){isAdmin ? ' · Admin' : ''}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-6">
        <Group title="Lists">
          <Row label="Wards" sub={`${data.lists.wards.length} wards`} onClick={() => setOpen('wards')} />
          <Row label="Attending staff" sub={`${data.lists.attendings.length} staff`} onClick={() => setOpen('attendings')} />
        </Group>
        <Group title="Patients">
          <Row label="Discharged patients" sub="View, re-admit" onClick={() => setOpen('discharged')} />
        </Group>
        {isAdmin && (
          <Group title="Admin">
            <Row label="Team members" sub="Create accounts, reset passwords, disable access" onClick={() => setOpen('users')} />
            <Row label="Access log" sub="Logins and changes (PDPA audit trail)" onClick={() => setOpen('audit')} />
          </Group>
        )}
        <Group title="Account">
          <Row label="Change password" onClick={() => setOpen('password')} />
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-3 bg-white text-red-600 text-sm font-medium">
            <LogOut size={16} /> Sign out
          </button>
        </Group>
        <p className="text-[11px] text-gray-400 leading-snug px-1">
          Patient data stays on the server and is not saved on this phone. Sign out on shared devices.
          Sessions expire after inactivity.
        </p>
      </div>

      {open === 'wards' && <ListEditor kind="ward" items={data.lists.wards} onChanged={data.reload} onClose={close} />}
      {open === 'attendings' && <ListEditor kind="attending" items={data.lists.attendings} onChanged={data.reload} onClose={close} />}
      {open === 'discharged' && <Discharged isAdmin={isAdmin} savePatient={data.savePatient} onClose={close} />}
      {open === 'users' && <Users me={user} onClose={close} />}
      {open === 'audit' && <Audit onClose={close} />}
      {open === 'password' && (
        <Sheet title="Change password" onClose={close}>
          <ChangePassword onDone={() => { alert('Password changed. Other devices were signed out.'); close() }} onCancel={close} />
        </Sheet>
      )}
    </>
  )
}
