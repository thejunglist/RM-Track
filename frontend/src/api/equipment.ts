import { supabase } from '../lib/supabase'
import type { Equipment } from '../types'

const SELECT = 'id, roomId:room_id, name, createdAt:created_at'

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
}): Promise<Equipment> {
  const { data, error } = await supabase
    .from('equipment')
    .insert({ room_id: input.roomId, name: input.name })
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

function mapKeys(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = { roomId: 'room_id' }
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [map[k] ?? k, v])
  )
}
