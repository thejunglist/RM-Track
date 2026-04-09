import { supabase } from '../lib/supabase'
import type { Question } from '../types'

const SELECT = 'id, equipmentId:equipment_id, text, answerType:answer_type, order, createdAt:created_at'

export async function getQuestions(equipmentId?: number): Promise<Question[]> {
  let query = supabase.from('questions').select(SELECT).order('order')
  if (equipmentId) query = query.eq('equipment_id', equipmentId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createQuestion(input: {
  equipmentId: number
  text: string
  answerType: string
  order?: number
}): Promise<Question> {
  const { equipmentId, answerType, ...rest } = input
  const { data, error } = await supabase
    .from('questions')
    .insert({ equipment_id: equipmentId, answer_type: answerType, ...rest })
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateQuestion(id: number, input: Record<string, unknown>): Promise<Question> {
  const mapped = mapKeys(input)
  const { data, error } = await supabase
    .from('questions')
    .update(mapped)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteQuestion(id: number): Promise<void> {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}

function mapKeys(input: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = { equipmentId: 'equipment_id', answerType: 'answer_type' }
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [map[k] ?? k, v])
  )
}
