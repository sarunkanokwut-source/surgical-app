import { useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '../lib/api'
import { Input, Btn, ErrorMsg, Field } from './ui'

export function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const { user } = await api('/auth/login', { method: 'POST', body: { username, password } })
      setPassword('')
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-blue-700 to-blue-900">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl space-y-4">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2"><Lock size={22} /></div>
          <h1 className="text-xl font-bold text-gray-900">Ward Round</h1>
          <p className="text-xs text-gray-500">Authorised clinical staff only</p>
        </div>
        <Field label="Username">
          <Input autoComplete="username" autoCapitalize="none" value={username} onChange={e => setUsername(e.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </Field>
        <ErrorMsg>{error}</ErrorMsg>
        <Btn type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Btn>
        <p className="text-[11px] leading-snug text-gray-400 text-center">
          Contains confidential patient information protected under the Personal Data Protection Act B.E. 2562 (PDPA).
          Access is logged. Use only for patient care; do not screenshot or share outside the care team.
        </p>
      </form>
    </div>
  )
}

export function ChangePassword({ forced, onDone, onCancel }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (next !== confirm) return setError('New passwords do not match')
    setBusy(true); setError('')
    try {
      await api('/auth/password', { method: 'POST', body: { current, next } })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {forced && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Please set your own password before continuing.</p>}
      <Field label="Current password"><Input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></Field>
      <Field label="New password (min 8 characters)"><Input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} /></Field>
      <Field label="Confirm new password"><Input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></Field>
      <ErrorMsg>{error}</ErrorMsg>
      <div className="flex gap-3">
        {onCancel && <Btn variant="secondary" onClick={onCancel} className="flex-1">Cancel</Btn>}
        <Btn type="submit" disabled={busy} className="flex-1">{busy ? 'Saving…' : 'Change password'}</Btn>
      </div>
    </form>
  )
}
