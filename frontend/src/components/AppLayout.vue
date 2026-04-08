<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const techNav = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/tech/dashboard' },
]

const adminNav = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/admin/dashboard' },
  { title: 'Buildings', icon: 'mdi-office-building', to: '/admin/buildings' },
  { title: 'Rooms', icon: 'mdi-door', to: '/admin/rooms' },
  { title: 'Equipment', icon: 'mdi-tools', to: '/admin/equipment' },
  { title: 'Questions', icon: 'mdi-help-circle', to: '/admin/questions' },
  { title: 'Assignments', icon: 'mdi-account-group', to: '/admin/assignments' },
  { title: 'Users', icon: 'mdi-account', to: '/admin/users' },
  { title: 'Reports', icon: 'mdi-chart-bar', to: '/admin/reports' },
]

const navItems = auth.isAdmin ? adminNav : techNav

async function signOut() {
  await auth.logout()
  router.push('/login')
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
        />
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
</template>
