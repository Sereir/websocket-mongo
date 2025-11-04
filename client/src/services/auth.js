const TOKEN_KEY = 'jwt_token'
const ME_KEY = 'me_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthed() {
  return !!getToken()
}

export function getMe() {
  try {
    const raw = localStorage.getItem(ME_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setMe(me) {
  if (me) localStorage.setItem(ME_KEY, JSON.stringify(me))
}

export function clearMe() {
  localStorage.removeItem(ME_KEY)
}
