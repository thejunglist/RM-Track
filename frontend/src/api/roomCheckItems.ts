import { supabase } from '../lib/supabase'
import type { RoomCheckItem } from '../types'

const SELECT = 'id, roomId:room_id, checkItemId:check_item_id, createdAt:created_at'

export async function getRoomCheckItems(roomId: number): Promise<RoomCheckItem[]> {
  const { data, error } = await supabase
    .from('room_check_items')
    .select(SELECT)
    .eq('room_id', roomId)
  if (error) throw error
  return data as unknown as RoomCheckItem[]
}

/** Replace all check items for a room with the given set of check item IDs. */
export async function setRoomCheckItems(roomId: number, checkItemIds: number[]): Promise<void> {
  // Delete existing
  const { error: delError } = await supabase
    .from('room_check_items')
    .delete()
    .eq('room_id', roomId)
  if (delError) throw delError

  // Insert new (skip if empty)
  if (checkItemIds.length === 0) return

  const rows = checkItemIds.map(checkItemId => ({ room_id: roomId, check_item_id: checkItemId }))
  const { error: insError } = await supabase.from('room_check_items').insert(rows)
  if (insError) throw insError
}
