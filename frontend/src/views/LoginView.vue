<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push(auth.isAdmin ? '/admin/dashboard' : '/tech/dashboard')
  } catch {
    error.value = 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-6" elevation="4">
          <v-card-title class="text-h5 text-center mb-4">
            <v-icon class="mr-2">mdi-clipboard-check</v-icon>
            Room Tracker
          </v-card-title>
          <v-form @submit.prevent="submit">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              prepend-inner-icon="mdi-email"
              autocomplete="email"
              :disabled="loading"
              required
            />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              prepend-inner-icon="mdi-lock"
              autocomplete="current-password"
              :disabled="loading"
              required
            />
            <v-alert v-if="error" type="error" class="mb-3" density="compact">{{ error }}</v-alert>
            <v-btn type="submit" color="primary" block :loading="loading">Sign In</v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
