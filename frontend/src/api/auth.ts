import api from './client'
import type { User } from '../types'

export const login = (email: string, password: string) =>
  api.post<User>('/auth/login', { email, password }).then(r => r.data)

export const logout = () => api.post('/auth/logout')

export const me = () => api.get<User>('/auth/me').then(r => r.data)
