import { supabase } from '../lib/supabase'
import type { CheckItem } from '../types'

const SELECT = 'id, name, answerType:answer_type, order, createdAt:created_at'

export async function getCheckItems(): Promise<CheckItem[]> {
  const { data, error } = await supabase
    .from('check_items')
    .select(SELECT)
    .order('order')
  if (error) throw error
  return data as unknown as CheckItem[]
}

export async function createCheckItem(input: {
  name: string
  answerType: string
  order: number
}): Promise<CheckItem> {
  const { data, error } = await supabase
    .from('check_items')
    .insert({ name: input.name, answer_type: input.answerType, order: input.order })
    .select(SELECT)
    .single()
  if (error) throw error
  return data as unknown as CheckItem
}

export async function updateCheckItem(id: number, input: {
  name?: string
  answerType?: string
  order?: number
}): Promise<CheckItem> {
  const mapped: Record<string, unknown> = {}
  if (input.name !== undefined) mapped.name = input.name
  if (input.answerType !== undefined) mapped.answer_type = input.answerType
  if (input.order !== undefined) mapped.order = input.order

  const { data, error } = await supabase
    .from('check_items')
    .update(mapped)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data as unknown as CheckItem
}

export async function deleteCheckItem(id: number): Promise<void> {
  const { error } = await supabase.from('check_items').delete().eq('id', id)
  if (error) throw error
}
