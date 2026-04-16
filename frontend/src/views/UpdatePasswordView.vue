<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const password = ref('')
const confirm = ref('')
const saving = ref(false)
const error = ref('')

async function setPassword() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match.'
    return
  }

  saving.value = true
  try {
    const { error: updateError } = await supabase.auth.updateUser({ password: password.value })
    if (updateError) throw updateError

    // Reload profile then go to the right dashboard
    await auth.init()
    router.push(auth.isAdmin ? '/admin/dashboard' : '/tech/dashboard')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to set password.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
      <v-card width="400" class="pa-4">
        <v-card-title class="text-h5 mb-2">Set your password</v-card-title>
        <v-card-subtitle class="mb-4">Choose a password to complete your account setup.</v-card-subtitle>

        <v-card-text class="d-flex flex-column gap-3">
          <v-alert v-if="error" type="error" density="compact">{{ error }}</v-alert>

          <v-text-field
            v-model="password"
            label="New Password"
            type="password"
            required
          />
          <v-text-field
            v-model="confirm"
            label="Confirm Password"
            type="password"
            required
            @keyup.enter="setPassword"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" :loading="saving" @click="setPassword">Set Password</v-btn>
        </v-card-actions>
      </v-card>
    </v-main>
  </v-app>
</template>
