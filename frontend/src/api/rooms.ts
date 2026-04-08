import api from './client'
import type { Room } from '../types'

export const getRooms = (buildingId?: number) =>
  api.get<Room[]>('/rooms', { params: buildingId ? { buildingId } : {} }).then(r => r.data)
export const getRoom = (id: number) => api.get<Room>(`/rooms/${id}`).then(r => r.data)
export const createRoom = (data: { buildingId: number; number: string; floor?: string; name?: string }) =>
  api.post<Room>('/rooms', data).then(r => r.data)
export const updateRoom = (id: number, data: object) => api.put<Room>(`/rooms/${id}`, data).then(r => r.data)
export const deleteRoom = (id: number) => api.delete(`/rooms/${id}`)

export interface BulkRoomResult {
  imported: number
  skipped: number
}

export const bulkImportRooms = (items: { buildingId: number; number: string }[]) =>
  api.post<BulkRoomResult>('/rooms/bulk', items).then(r => r.data)
