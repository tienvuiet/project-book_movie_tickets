const KEY = 'cinema_auth'

export function readAuth() {
  return JSON.parse(localStorage.getItem(KEY) || 'null')
}

export function writeAuth(auth) {
  localStorage.setItem(KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(KEY)
}

export function patchTokens(tokens) {
  const current = readAuth() || {}
  const next = { ...current, ...tokens }
  writeAuth(next)
  window.dispatchEvent(new CustomEvent('cinema-auth-updated', { detail: next }))
  return next
}
