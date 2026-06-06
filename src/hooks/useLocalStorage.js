import { useState } from 'react'

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initial
    } catch {
      return initial
    }
  })

  const set = (v) => {
    const next = typeof v === 'function' ? v(value) : v
    setValue(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
  }

  return [value, set]
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
