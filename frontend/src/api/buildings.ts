import api from './client'
import type { Building } from '../types'

export const getBuildings = () => api.get<Building[]>('/buildings').then(r => r.data)
export const createBuilding = (data: { name: string; location?: string }) =>
  api.post<Building>('/buildings', data).then(r => r.data)
export const updateBuilding = (id: number, data: Partial<{ name: string; location: string }>) =>
  api.put<Building>(`/buildings/${id}`, data).then(r => r.data)
export const deleteBuilding = (id: number) => api.delete(`/buildings/${id}`)

export interface BulkBuildingResult {
  imported: number
  skipped: number
}

export const bulkImportBuildings = (items: { name: string }[]) =>
  api.post<BulkBuildingResult>('/buildings/bulk', items).then(r => r.data)
