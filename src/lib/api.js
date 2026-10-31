// Thin fetch wrapper. Session lives in an httpOnly cookie; nothing is kept in localStorage.

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'fetch', ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = {}
  try { data = await res.json() } catch {}
  if (res.status === 401 && path !== '/auth/login') onUnauthorized()
  if (!res.ok) throw new ApiError(res.status, data.error || `Error ${res.status}`)
  return data
}
