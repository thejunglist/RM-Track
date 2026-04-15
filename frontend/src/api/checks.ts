import { supabase } from '../lib/supabase'
import type { MonthlyCheck } from '../types'

const SELECT_LIST = `
  id, roomId:room_id, techId:tech_id, month, year, status,
  completedAt:completed_at, createdAt:created_at
`.trim()

const SELECT_DETAIL = `
  id, roomId:room_id, techId:tech_id, month, year, status,
  completedAt:completed_at, createdAt:created_at,
  room:rooms(
    id, buildingId:building_id, number, floor, name, createdAt:created_at,
    building:buildings(id, name, location, createdAt:created_at),
    checkItems:room_check_items(
      id, checkItemId:check_item_id,
      checkItem:check_items(id, name, answerType:answer_type, order, createdAt:created_at)
    )
  ),
  tech:profiles(id, name),
  answers:check_answers(
    id, checkId:check_id, checkItemId:check_item_id, value, notes, createdAt:created_at
  )
`.trim()

export async function getChecks(): Promise<MonthlyCheck[]> {
  const { data, error } = await supabase
    .from('monthly_checks')
    .select(SELECT_LIST)
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw error
  return data as unknown as MonthlyCheck[]
}

export async function getCheck(id: number): Promise<MonthlyCheck> {
  const { data, error } = await supabase
    .from('monthly_checks')
    .select(SELECT_DETAIL)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as MonthlyCheck
}

export async function createCheck(input: { roomId: number; month: number; year: number }): Promise<MonthlyCheck> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('monthly_checks')
    .insert({ room_id: input.roomId, month: input.month, year: input.year, tech_id: session.user.id })
    .select(SELECT_LIST)
    .single()
  if (error) throw error
  return data as unknown as MonthlyCheck
}

export async function startCheck(id: number): Promise<void> {
  const { error } = await supabase
    .from('monthly_checks')
    .update({ status: 'IN_PROGRESS' })
    .eq('id', id)
    .eq('status', 'PENDING')
  if (error) throw error
}

export async function saveAnswers(
  checkId: number,
  answers: { checkItemId: number; value: string; notes?: string }[],
): Promise<void> {
  const rows = answers.map((a) => ({
    check_id: checkId,
    check_item_id: a.checkItemId,
    value: a.value,
    notes: a.notes ?? null,
  }))
  const { error } = await supabase
    .from('check_answers')
    .upsert(rows, { onConflict: 'check_id,check_item_id' })
  if (error) throw error
}

export async function completeCheck(id: number): Promise<MonthlyCheck> {
  const { data, error } = await supabase
    .from('monthly_checks')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_LIST)
    .single()
  if (error) throw error
  return data as unknown as MonthlyCheck
}
