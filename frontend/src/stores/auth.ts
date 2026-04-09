import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function init() {
    if (initialized.value) return

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await loadProfile(session.user.id)
    }
    initialized.value = true

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        user.value = null
      }
    })
  }

  async function loadProfile(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, role, createdAt:created_at')
      .eq('id', userId)
      .single()
    if (profile) {
      user.value = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        createdAt: profile.createdAt,
      }
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      await loadProfile(data.user.id)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
  }

  return { user, loading, initialized, isAuthenticated, isAdmin, init, login, logout }
})
