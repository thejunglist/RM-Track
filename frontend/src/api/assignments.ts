import { supabase } from '../lib/supabase'
import type { RoomAssignment } from '../types'

const SELECT = `
  id, techId:tech_id, roomId:room_id, createdAt:created_at,
  tech:profiles(id, name, email),
  room:rooms(id, number, floor, name, createdAt:created_at, building:buildings(name))
`.trim()

export async function getAssignments(params?: { techId?: string; roomId?: number }): Promise<RoomAssignment[]> {
  let query = supabase.from('room_assignments').select(SELECT)
  if (params?.techId) query = query.eq('tech_id', params.techId)
  if (params?.roomId) query = query.eq('room_id', params.roomId)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as RoomAssignment[]
}

export async function createAssignment(input: { techId: string; roomId: number }): Promise<RoomAssignment> {
  const { data, error } = await supabase
    .from('room_assignments')
    .insert({ tech_id: input.techId, room_id: input.roomId })
    .select(SELECT)
    .single()
  if (error) throw error
  return data as unknown as RoomAssignment
}

export async function deleteAssignment(id: number): Promise<void> {
  const { error } = await supabase.from('room_assignments').delete().eq('id', id)
  if (error) throw error
}
