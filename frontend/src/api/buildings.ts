import { supabase } from '../lib/supabase'
import type { Building } from '../types'

const SELECT = 'id, name, location, createdAt:created_at'

export async function getBuildings(): Promise<Building[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select(SELECT)
    .order('name')
  if (error) throw error
  return data
}

export async function createBuilding(input: { name: string; location?: string }): Promise<Building> {
  const { data, error } = await supabase
    .from('buildings')
    .insert(input)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateBuilding(id: number, input: Partial<{ name: string; location: string }>): Promise<Building> {
  const { data, error } = await supabase
    .from('buildings')
    .update(input)
    .eq('id', id)
    .select(SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteBuilding(id: number): Promise<void> {
  const { error } = await supabase.from('buildings').delete().eq('id', id)
  if (error) throw error
}

export interface BulkBuildingResult {
  imported: number
  skipped: number
}

export async function bulkImportBuildings(items: { name: string }[]): Promise<BulkBuildingResult> {
  const { data, error } = await supabase
    .from('buildings')
    .upsert(items, { onConflict: 'name', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return { imported: data?.length ?? 0, skipped: items.length - (data?.length ?? 0) }
}
