<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'

const auth = useAuthStore()
const router = useRouter()

const techNav = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/tech/dashboard' },
]

const adminNav = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/admin/dashboard' },
  { title: 'Buildings', icon: 'mdi-office-building', to: '/admin/buildings' },
  { title: 'Rooms', icon: 'mdi-door', to: '/admin/rooms' },
  { title: 'Check Items', icon: 'mdi-format-list-checks', to: '/admin/check-items' },
  { title: 'Room Checklist', icon: 'mdi-clipboard-list', to: '/admin/room-checklist' },
  { title: 'Assignments', icon: 'mdi-account-group', to: '/admin/assignments' },
  { title: 'Users', icon: 'mdi-account', to: '/admin/users' },
  { title: 'Reports', icon: 'mdi-chart-bar', to: '/admin/reports' },
]

const navItems = auth.isAdmin ? adminNav : techNav

async function signOut() {
  await auth.logout()
  router.push('/login')
}

// Change password dialog
const pwDialog = ref(false)
const pwForm = ref({ password: '', confirm: '' })
const pwSaving = ref(false)
const pwError = ref('')
const pwSuccess = ref(false)
const showPw = ref(false)
const showConfirm = ref(false)

function openPasswordDialog() {
  pwForm.value = { password: '', confirm: '' }
  pwError.value = ''
  pwSuccess.value = false
  pwDialog.value = true
}

async function savePassword() {
  pwError.value = ''
  if (!pwForm.value.password) {
    pwError.value = 'Please enter a new password.'
    return
  }
  if (pwForm.value.password.length < 6) {
    pwError.value = 'Password must be at least 6 characters.'
    return
  }
  if (pwForm.value.password !== pwForm.value.confirm) {
    pwError.value = 'Passwords do not match.'
    return
  }
  pwSaving.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: pwForm.value.password })
    if (error) throw error
    pwSuccess.value = true
    setTimeout(() => { pwDialog.value = false }, 1500)
  } catch (e: unknown) {
    pwError.value = e instanceof Error ? e.message : 'Failed to update password.'
  } finally {
    pwSaving.value = false
  }
}
</script>

<template>
  <v-navigation-drawer permanent>
    <v-list-item
      prepend-icon="mdi-clipboard-check"
      title="Room Tracker"
      subtitle="University Maintenance"
      nav
    />
    <v-divider />
    <v-list density="compact" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :to="item.to"
        rounded="lg"
      />
    </v-list>
    <template #append>
      <v-divider />
      <v-list density="compact" nav class="mb-2">
        <v-list-item
          prepend-icon="mdi-account-circle"
          :title="auth.user?.name"
          :subtitle="auth.user?.role"
          rounded="lg"
          @click="openPasswordDialog"
          style="cursor: pointer"
        >
          <template #append>
            <v-icon size="small" color="medium-emphasis">mdi-key-outline</v-icon>
          </template>
        </v-list-item>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Sign Out"
          @click="signOut"
          rounded="lg"
        />
      </v-list>
    </template>
  </v-navigation-drawer>

  <v-main>
    <v-container fluid class="pa-6">
      <slot />
    </v-container>
  </v-main>

  <!-- Change password dialog -->
  <v-dialog v-model="pwDialog" max-width="400">
    <v-card title="Change Password">
      <v-card-text class="d-flex flex-column gap-3">
        <v-alert v-if="pwError" type="error" density="compact">{{ pwError }}</v-alert>
        <v-alert v-if="pwSuccess" type="success" density="compact">Password updated!</v-alert>
        <v-text-field
          v-model="pwForm.password"
          label="New Password"
          :type="showPw ? 'text' : 'password'"
          :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPw = !showPw"
          hide-details="auto"
        />
        <v-text-field
          v-model="pwForm.confirm"
          label="Confirm Password"
          :type="showConfirm ? 'text' : 'password'"
          :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showConfirm = !showConfirm"
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="pwDialog = false">Cancel</v-btn>
        <v-btn color="primary" :loading="pwSaving" @click="savePassword">Update Password</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
