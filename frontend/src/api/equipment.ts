import { supabase } from '../lib/supabase'
import type { Equipment } from '../types'

const SELECT = 'id, roomId:room_id, name, make, model, serial, description, assetTag:asset_tag, createdAt:created_at'

export async function getEquipment(roomId?: number): Promise<Equipment[]> {
  let query = supabase.from('equipment').select(SELECT).order('name')
  if (roomId) query = query.eq('room_id', roomId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as Equipment[]
}

export async function createEquipment(input: {
  roomId: number
  name: string
  make?: string
  model?: string
  serial?: string
  description?: string
  assetTag?: string
}): Promise<Equipment> {
  const { roomId, assetTag, ...rest } = input
  const { data, error } = await supabase
    .from('equipment')
    .insert({ room_id: roomId, asset_tag: assetTag, ...rest })
    .select(SELECT)
    .single()
  if (error) throw error
  return data as unknown as Equipment
}

export async function updateEquipment(id: number, input: Record<string, unknown>): Promise<Equipment> {
  const mapped = mapKeys(input)
  const { data, error } = await supabase
    .from('equipment')
    .update(mapped)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data as unknown as Equipment
}

export async function deleteEquipment(id: number): Promise<void> {
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) throw error
}

export interface BulkImportItem {
  roomId: number
  name: string
  make?: string
  model?: string
  serial?: string
  description?: string
  assetTag?: string
}

export interface BulkImportResult {
  imported: number
  skipped: number
}

export async function bulkImportEquipment(items: BulkImportItem[]): Promise<BulkImportResult> {
  const rows = items.map(({ roomId, assetTag, ...rest }) => ({
    room_id: roomId,
    asset_tag: assetTag,
    ...rest,
  }))
  const { data, error } = await supabase
    .from('equipment')
    .upsert(rows, { onConflict: 'asset_tag', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return { imported: data?.length ?? 0, skipped: items.length - (data?.length ?? 0) }
}

function mapKeys(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = { roomId: 'room_id', assetTag: 'asset_tag' }
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [map[k] ?? k, v])
  )
}
