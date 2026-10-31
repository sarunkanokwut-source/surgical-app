// Whitelists and trims incoming patient JSON so the DB only ever holds known fields.

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
const oneOf = (v, opts, dflt) => (opts.includes(v) ? v : dflt)
const id = (v) => str(v, 40) || Math.random().toString(36).slice(2, 10)
const list = (v, fn, max = 50) => (Array.isArray(v) ? v.slice(0, max).map(fn) : [])

export function sanitizePatient(p = {}) {
  const w = p.wound || {}
  return {
    hn: str(p.hn, 20),
    name: str(p.name, 120),
    age: str(p.age, 10),
    sex: oneOf(p.sex, ['M', 'F', ''], ''),
    ward: str(p.ward, 60),
    bed: str(p.bed, 20),
    attending: str(p.attending, 80),
    caseType: oneOf(p.caseType, ['primary', 'consult'], 'primary'),
    consultFrom: str(p.consultFrom, 80),
    diagnosis: str(p.diagnosis, 500),
    injuryDate: date(p.injuryDate),
    remark: str(p.remark, 2000),
    seenOn: date(p.seenOn),
    operations: list(p.operations, (o) => ({
      id: id(o?.id),
      date: date(o?.date),
      procedure: str(o?.procedure, 300),
      status: oneOf(o?.status, ['planned', 'done', 'cancelled'], 'planned'),
    })),
    wound: {
      needsDressing: !!w.needsDressing,
      frequencyDays: Math.min(Math.max(parseInt(w.frequencyDays) || 1, 1), 30),
      lastDressed: date(w.lastDressed),
      note: str(w.note, 300),
    },
    investigations: list(p.investigations, (x) => ({
      id: id(x?.id),
      name: str(x?.name, 200),
      date: date(x?.date),
      status: oneOf(x?.status, ['pending', 'done'], 'pending'),
      result: str(x?.result, 500),
    }), 100),
  }
}

export function validatePatient(p) {
  if (!p.hn) return 'HN is required'
  if (!p.name) return 'Name is required'
  if (!p.ward) return 'Ward is required'
  return null
}
