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

async function invokeOrThrow(fn: string, body: object): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) {
    // Try to extract the real message from the response body
    try {
      const json = await (error as { context?: Response }).context?.json()
      if (json?.error) throw new Error(json.error)
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== error.message) throw parseErr
    }
    throw error
  }
  return data
}

export async function createUser(input: {
  name: string
  email: string
  role?: string
  password?: string
}): Promise<User> {
  return invokeOrThrow('admin-create-user', input) as Promise<User>
}

export async function updateUser(id: string, input: object): Promise<User> {
  return invokeOrThrow('admin-update-user', { id, ...input }) as Promise<User>
}

export async function deleteUser(id: string): Promise<void> {
  await invokeOrThrow('admin-delete-user', { id })
}
