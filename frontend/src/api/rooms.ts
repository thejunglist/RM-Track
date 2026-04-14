import { supabase } from '../lib/supabase'
import type { Room } from '../types'

const SELECT_LIST = 'id, buildingId:building_id, number, floor, name, createdAt:created_at, building:buildings(name)'

const SELECT_DETAIL = `
  id, buildingId:building_id, number, floor, name, createdAt:created_at,
  building:buildings(id, name, location, createdAt:created_at),
  equipment(
    id, roomId:room_id, name, category, assetTag:asset_tag, createdAt:created_at,
    questions(id, equipmentId:equipment_id, text, answerType:answer_type, order, createdAt:created_at)
  )
`.trim()

export async function getRooms(buildingId?: number): Promise<Room[]> {
  let query = supabase.from('rooms').select(SELECT_LIST).order('number')
  if (buildingId) query = query.eq('building_id', buildingId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as Room[]
}

export async function getRoom(id: number): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .select(SELECT_DETAIL)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as Room
}

export async function createRoom(input: { buildingId: number; number: string; floor?: string; name?: string }): Promise<Room> {
  const { buildingId, ...rest } = input
  const { data, error } = await supabase
    .from('rooms')
    .insert({ building_id: buildingId, ...rest })
    .select(SELECT_LIST)
    .single()
  if (error) throw error
  return data as unknown as Room
}

export async function updateRoom(id: number, input: Record<string, unknown>): Promise<Room> {
  const mapped = mapKeys(input)
  const { data, error } = await supabase
    .from('rooms')
    .update(mapped)
    .eq('id', id)
    .select(SELECT_LIST)
    .single()
  if (error) throw error
  return data as unknown as Room
}

export async function deleteRoom(id: number): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) throw error
}

export interface BulkRoomResult {
  imported: number
  skipped: number
}

export async function bulkImportRooms(items: { buildingId: number; number: string }[]): Promise<BulkRoomResult> {
  const rows = items.map(({ buildingId, number }) => ({ building_id: buildingId, number }))
  const { data, error } = await supabase
    .from('rooms')
    .upsert(rows, { onConflict: 'building_id,number', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return { imported: data?.length ?? 0, skipped: items.length - (data?.length ?? 0) }
}

function mapKeys(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = { buildingId: 'building_id' }
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [map[k] ?? k, v])
  )
}
