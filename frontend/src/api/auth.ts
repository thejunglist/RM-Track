import { supabase } from '../lib/supabase'
import type { User } from '../types'

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, role, createdAt:created_at')
    .eq('id', data.user.id)
    .single()
  if (profileError) throw profileError

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    createdAt: profile.createdAt,
  }
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function me(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, createdAt:created_at')
    .eq('id', session.user.id)
    .single()
  if (error) return null

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    createdAt: profile.createdAt,
  }
}
