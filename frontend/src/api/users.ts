import api from './client'
import type { User } from '../types'

export const getUsers = () => api.get<User[]>('/users').then(r => r.data)
export const createUser = (data: { name: string; email: string; password: string; role?: string }) =>
  api.post<User>('/users', data).then(r => r.data)
export const updateUser = (id: number, data: object) => api.put<User>(`/users/${id}`, data).then(r => r.data)
export const deleteUser = (id: number) => api.delete(`/users/${id}`)
