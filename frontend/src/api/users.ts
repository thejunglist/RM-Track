import { supabase } from '../lib/supabase'
import type { User } from '../types'

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, createdAt:created_at')
    .order('name')
  if (error) throw error
  return data
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role?: string
}): Promise<User> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', { body: input })
  if (error) throw error
  return data as User
}

export async function updateUser(id: string, input: object): Promise<User> {
  const { data, error } = await supabase.functions.invoke('admin-update-user', {
    body: { id, ...input },
  })
  if (error) throw error
  return data as User
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-delete-user', { body: { id } })
  if (error) throw error
}
