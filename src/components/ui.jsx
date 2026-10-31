import { X } from 'lucide-react'

export function Sheet({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[94vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 p-1 -mr-1"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-100 flex gap-3 safe-bottom">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

// text-base keeps iOS from zooming on focus
export const inputCls = 'w-full text-base border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-white'

export function Input(props) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />
}

export function Section({ title, right, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Segmented({ value, options, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3 py-2 text-sm'
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {options.map(o => (
        <button type="button" key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md font-medium transition-colors ${pad} ${value === o.value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-700',
  }
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

export function Btn({ variant = 'primary', className = '', ...props }) {
  const v = {
    primary: 'bg-blue-600 text-white',
    secondary: 'border border-gray-200 text-gray-700 bg-white',
    danger: 'bg-red-600 text-white',
    ghostDanger: 'text-red-600 border border-red-200 bg-white',
  }[variant]
  return <button type="button" {...props} className={`py-2.5 px-4 rounded-xl font-medium text-sm disabled:opacity-50 ${v} ${className}`} />
}

export function ErrorMsg({ children }) {
  if (!children) return null
  return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{children}</p>
}
