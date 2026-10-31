import { useState } from 'react'
import { Check, Bandage, FlaskConical, Scissors, AlertTriangle } from 'lucide-react'
import { daysSince, fmtDate, todayISO } from '../lib/dates'
import { lastDoneOp, nextPlannedOp, dressingStatus, pendingInvestigations } from '../lib/patient'
import { Badge } from './ui'

export default function PatientCard({ patient: p, onOpen, onQuickSave }) {
  const [busy, setBusy] = useState(false)
  const today = todayISO()
  const seen = p.seenOn === today
  const op = lastDoneOp(p)
  const planned = nextPlannedOp(p)
  const dressing = dressingStatus(p)
  const pending = pendingInvestigations(p)
  const nextIx = [...pending].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))[0]
  const ixOverdue = pending.some(x => x.date && x.date < today)
  const injDay = daysSince(p.injuryDate)

  const quick = async (e, change) => {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try { await onQuickSave({ ...p, ...change }) } catch (err) { alert(err.message) } finally { setBusy(false) }
  }

  return (
    <div onClick={() => onOpen(p)}
      className={`bg-white rounded-xl shadow-sm border-l-4 mb-2 px-3 py-2.5 active:bg-gray-50 cursor-pointer ${seen ? 'border-green-400' : p.caseType === 'consult' ? 'border-amber-400' : 'border-blue-500'}`}>
      <div className="flex items-start gap-2.5">
        <button onClick={e => quick(e, { seenOn: seen ? '' : today })} aria-label="Mark seen"
          className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${seen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
          <Check size={16} strokeWidth={3} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {p.bed && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">{p.bed}</span>}
            <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
            <span className="text-xs text-gray-400">{[p.age && `${p.age}y`, p.sex].filter(Boolean).join(' ')}</span>
            {p.caseType === 'consult' && <Badge tone="amber">Consult{p.consultFrom ? ` · ${p.consultFrom}` : ''}</Badge>}
          </div>
          <p className="text-xs text-gray-500 font-mono">HN {p.hn}{p.attending ? <span className="font-sans text-indigo-600"> · {p.attending}</span> : null}</p>
          <p className="text-sm text-gray-800 leading-snug mt-0.5">{p.diagnosis || <span className="text-gray-400 italic">No diagnosis</span>}</p>

          <div className="flex flex-wrap gap-1 mt-1.5">
            {injDay !== null && injDay >= 0 && <Badge tone="gray">Inj D{injDay} · {fmtDate(p.injuryDate)}</Badge>}
            {op && <Badge tone="green"><Scissors size={10} />POD {daysSince(op.date)} · {fmtDate(op.date)}</Badge>}
            {planned && <Badge tone="blue"><Scissors size={10} />Sx {planned.date ? fmtDate(planned.date) : 'TBA'}</Badge>}
            {pending.length > 0 && (
              <Badge tone={ixOverdue ? 'red' : 'purple'}>
                <FlaskConical size={10} />{pending.length} pending{nextIx?.date ? ` · ${fmtDate(nextIx.date)}` : ''}
              </Badge>
            )}
            {dressing && (
              dressing.due
                ? <Badge tone="red"><Bandage size={10} />Dressing due{dressing.overdueDays > 0 ? ` (+${dressing.overdueDays}d)` : ''}</Badge>
                : <Badge tone="gray"><Bandage size={10} />Dressing in {dressing.dueIn}d</Badge>
            )}
          </div>

          {p.remark && (
            <p className="text-xs text-amber-900 bg-amber-50 rounded px-2 py-1 mt-1.5 flex gap-1 whitespace-pre-line">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />{p.remark}
            </p>
          )}
        </div>

        {dressing?.due && (
          <button onClick={e => quick(e, { wound: { ...p.wound, lastDressed: today } })}
            className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1.5 rounded-lg whitespace-nowrap self-center">
            Dressed ✓
          </button>
        )}
      </div>
    </div>
  )
}
