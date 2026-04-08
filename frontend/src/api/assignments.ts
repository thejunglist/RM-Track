import api from './client'
import type { RoomAssignment } from '../types'

export const getAssignments = (params?: { techId?: number; roomId?: number }) =>
  api.get<RoomAssignment[]>('/assignments', { params }).then(r => r.data)
export const createAssignment = (data: { techId: number; roomId: number }) =>
  api.post<RoomAssignment>('/assignments', data).then(r => r.data)
export const deleteAssignment = (id: number) => api.delete(`/assignments/${id}`)
