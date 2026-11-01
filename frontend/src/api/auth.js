import { apiPost } from './client.js'

export function login(username, password) {
  return apiPost('/api/auth/login', { username, password })
}

export function logout() {
  return apiPost('/api/auth/logout', {})
}
