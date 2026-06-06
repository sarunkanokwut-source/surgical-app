import { useState } from 'react'
import { useLocalStorage, generateId } from '../hooks/useLocalStorage'
import { Plus, Check, Trash2, Flag } from 'lucide-react'

const PRIORITY = {
  urgent:  { label: 'Urgent',  color: 'bg-red-100 text-red-700 border-red-200' },
  routine: { label: 'Routine', color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function JobItem({ job, onUpdate, onDelete }) {
  const p = PRIORITY[job.priority]
  const toggle = (field) => onUpdate({ ...job, [field]: !job[field] })

  return (
    <div className={`bg-white rounded-xl shadow-sm mb-2 border flex items-start px-4 py-3 gap-3 transition-opacity ${job.done ? 'opacity-50' : ''} ${job.priority === 'urgent' ? 'border-red-200' : 'border-gray-100'}`}>
      <button onClick={() => toggle('done')}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${job.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
        {job.done && <Check size={12} strokeWidth={3} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm text-gray-800 ${job.done ? 'line-through text-gray-400' : ''}`}>{job.text}</p>
        {job.patient && <p className="text-xs text-gray-400 mt-0.5">{job.patient}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${p.color}`}>{p.label}</span>
          {job.handover && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">Handover</span>}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => toggle('handover')}
          className={`p-1.5 rounded-lg transition-colors ${job.handover ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-blue-400'}`}>
          <Flag size={14} />
        </button>
        <button onClick={() => onDelete(job.id)} className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function AddJobModal({ onAdd, onClose }) {
  const [text, setText] = useState('')
  const [patient, setPatient] = useState('')
  const [priority, setPriority] = useState('routine')
  const submit = () => {
    if (!text.trim()) return
    onAdd({ id: generateId(), text: text.trim(), patient: patient.trim(), priority, done: false, handover: false, createdAt: Date.now() })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900">Add Job</h3>
        <input autoFocus value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Job description *" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-400" />
        <input value={patient} onChange={e => setPatient(e.target.value)}
          placeholder="Patient (optional)" className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-400" />
        <div>
          <p className="text-xs text-gray-500 mb-2">Priority</p>
          <div className="flex gap-3">
            {Object.entries(PRIORITY).map(([k, v]) => (
              <button key={k} onClick={() => setPriority(k)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${priority === k ? (k === 'urgent' ? 'bg-red-500 border-red-500 text-white' : 'bg-gray-700 border-gray-700 text-white') : 'border-gray-200 text-gray-600'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600">Cancel</button>
          <button onClick={submit} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium">Add Job</button>
        </div>
      </div>
    </div>
  )
}

export default function Jobs() {
  const [jobs, setJobs] = useLocalStorage('jobs-list', [])
  const [showAdd, setShowAdd] = useState(false)
  const [handoverMode, setHandoverMode] = useState(false)
  const [showDone, setShowDone] = useState(false)

  const updateJob = (u) => setJobs(js => js.map(j => j.id === u.id ? u : j))
  const deleteJob = (id) => setJobs(js => js.filter(j => j.id !== id))
  const addJob = (j) => setJobs(js => [j, ...js])
  const clearDone = () => setJobs(js => js.filter(j => !j.done))

  const urgent = jobs.filter(j => !j.done && j.priority === 'urgent')
  const routine = jobs.filter(j => !j.done && j.priority === 'routine')
  const done = jobs.filter(j => j.done)
  const handoverJobs = jobs.filter(j => !j.done && j.handover)

  const visibleJobs = handoverMode ? handoverJobs : null

  return (
    <div className="flex flex-col h-full">
      <div className="bg-green-600 text-white px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">Jobs</h1>
          <button onClick={() => setShowAdd(true)} className="bg-white/20 rounded-full p-2"><Plus size={20} /></button>
        </div>
        <p className="text-green-100 text-sm">
          {urgent.length > 0 ? `${urgent.length} urgent · ` : ''}{routine.length} routine · {done.length} done
        </p>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setHandoverMode(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!handoverMode ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}>
            All Jobs
          </button>
          <button onClick={() => setHandoverMode(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${handoverMode ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}>
            Handover ({handoverJobs.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
        {handoverMode ? (
          <>
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">Handover — {handoverJobs.length} job{handoverJobs.length !== 1 ? 's' : ''} flagged</p>
            {handoverJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">🏁</p>
                <p className="font-medium">No handover jobs</p>
                <p className="text-sm">Flag jobs with the bookmark icon</p>
              </div>
            ) : (
              handoverJobs.map(j => <JobItem key={j.id} job={j} onUpdate={updateJob} onDelete={deleteJob} />)
            )}
          </>
        ) : (
          <>
            {jobs.filter(j => !j.done).length === 0 && done.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-medium">No jobs yet</p>
                <p className="text-sm">Tap + to add a job</p>
              </div>
            ) : (
              <>
                {urgent.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-red-500 mb-2 uppercase tracking-wide font-semibold">Urgent</p>
                    {urgent.map(j => <JobItem key={j.id} job={j} onUpdate={updateJob} onDelete={deleteJob} />)}
                  </div>
                )}
                {routine.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">Routine</p>
                    {routine.map(j => <JobItem key={j.id} job={j} onUpdate={updateJob} onDelete={deleteJob} />)}
                  </div>
                )}
                {done.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setShowDone(!showDone)} className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                        Done ({done.length}) {showDone ? '▲' : '▼'}
                      </button>
                      <button onClick={clearDone} className="text-xs text-red-400">Clear all</button>
                    </div>
                    {showDone && done.map(j => <JobItem key={j.id} job={j} onUpdate={updateJob} onDelete={deleteJob} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showAdd && <AddJobModal onAdd={addJob} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
