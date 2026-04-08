import api from './client'
import type { Equipment } from '../types'

export const getEquipment = (roomId?: number) =>
  api.get<Equipment[]>('/equipment', { params: roomId ? { roomId } : {} }).then(r => r.data)
export const createEquipment = (data: { roomId: number; name: string; category?: string }) =>
  api.post<Equipment>('/equipment', data).then(r => r.data)
export const updateEquipment = (id: number, data: object) =>
  api.put<Equipment>(`/equipment/${id}`, data).then(r => r.data)
export const deleteEquipment = (id: number) => api.delete(`/equipment/${id}`)

export interface BulkImportItem {
  roomId: number
  name: string
  category?: string
  assetTag?: string
}

export interface BulkImportResult {
  imported: number
  skipped: number
}

export const bulkImportEquipment = (items: BulkImportItem[]) =>
  api.post<BulkImportResult>('/equipment/bulk', items).then(r => r.data)
