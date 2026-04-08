import api from './client'
import type { Question } from '../types'

export const getQuestions = (equipmentId?: number) =>
  api.get<Question[]>('/questions', { params: equipmentId ? { equipmentId } : {} }).then(r => r.data)
export const createQuestion = (data: { equipmentId: number; text: string; answerType: string; order?: number }) =>
  api.post<Question>('/questions', data).then(r => r.data)
export const updateQuestion = (id: number, data: object) =>
  api.put<Question>(`/questions/${id}`, data).then(r => r.data)
export const deleteQuestion = (id: number) => api.delete(`/questions/${id}`)
