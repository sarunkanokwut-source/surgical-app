import { useState } from 'react'
import Ward from './components/Ward'
import Theatre from './components/Theatre'
import WoundCare from './components/WoundCare'
import Jobs from './components/Jobs'

const TABS = [
  { id: 'ward',    label: 'Ward',    icon: '🏥', color: 'text-blue-600' },
  { id: 'theatre', label: 'Theatre', icon: '🔪', color: 'text-blue-600' },
  { id: 'wounds',  label: 'Wounds',  icon: '🩹', color: 'text-purple-600' },
  { id: 'jobs',    label: 'Jobs',    icon: '✅', color: 'text-green-600' },
]

export default function App() {
  const [tab, setTab] = useState('ward')

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-gray-50">
      <div className="flex-1 overflow-hidden">
        {tab === 'ward'    && <Ward />}
        {tab === 'theatre' && <Theatre />}
        {tab === 'wounds'  && <WoundCare />}
        {tab === 'jobs'    && <Jobs />}
      </div>

      <nav className="bg-white border-t border-gray-200 flex safe-bottom">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${tab === t.id ? t.color : 'text-gray-400'}`}>
            <span className="text-xl leading-none">{t.icon}</span>
            <span className={`text-xs font-medium ${tab === t.id ? '' : ''}`}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
