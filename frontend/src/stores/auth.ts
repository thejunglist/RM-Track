import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, me as apiMe } from '../api/auth'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function fetchUser() {
    try {
      user.value = await apiMe()
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      user.value = await apiLogin(email, password)
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await apiLogout()
    user.value = null
  }

  return { user, loading, isAuthenticated, isAdmin, fetchUser, login, logout }
})
