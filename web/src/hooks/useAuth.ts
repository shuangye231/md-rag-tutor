import { useState } from 'react'
import { apiFetch, jsonBody } from '../api/client'

interface AuthResponse {
  status: string
  username?: string
  session_token?: string
  message?: string
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('currentUser') || '')
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('sessionToken') || '')

  const login = async (username: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/api/login', jsonBody({ username, password }))
    const user = data.username || username
    const token = data.session_token || ''
    localStorage.setItem('currentUser', user)
    localStorage.setItem('sessionToken', token)
    setCurrentUser(user)
    setSessionToken(token)
  }

  const register = async (username: string, password: string) => {
    await apiFetch<AuthResponse>('/api/register', jsonBody({ username, password }))
  }

  const changePassword = async (oldPassword: string, newPassword: string) => {
    await apiFetch<AuthResponse>('/api/password', jsonBody({
      username: currentUser,
      old_password: oldPassword,
      new_password: newPassword,
    }))
  }

  const logout = () => {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('sessionToken')
    setCurrentUser('')
    setSessionToken('')
  }

  return { currentUser, sessionToken, login, register, changePassword, logout }
}
