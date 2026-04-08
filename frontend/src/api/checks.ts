import api from './client'
import type { MonthlyCheck } from '../types'

export const getChecks = () => api.get<MonthlyCheck[]>('/checks').then(r => r.data)
export const getCheck = (id: number) => api.get<MonthlyCheck>(`/checks/${id}`).then(r => r.data)
export const createCheck = (data: { roomId: number; month: number; year: number }) =>
  api.post<MonthlyCheck>('/checks', data).then(r => r.data)
export const saveAnswers = (id: number, answers: { questionId: number; value: string; notes?: string }[]) =>
  api.put(`/checks/${id}/answer`, { answers })
export const completeCheck = (id: number) => api.put<MonthlyCheck>(`/checks/${id}/complete`)
