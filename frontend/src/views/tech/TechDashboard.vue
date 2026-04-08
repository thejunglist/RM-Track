<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
import { getAssignments } from '../../api/assignments'
import { getChecks, createCheck } from '../../api/checks'
import type { RoomAssignment, MonthlyCheck } from '../../types'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const assignments = ref<RoomAssignment[]>([])
const checks = ref<MonthlyCheck[]>([])
const loading = ref(true)
const error = ref('')

const now = new Date()
const currentMonth = now.getMonth() + 1
const currentYear = now.getFullYear()

const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

onMounted(async () => {
  try {
    const [a, c] = await Promise.all([
      getAssignments({ techId: auth.user!.id }),
      getChecks(),
    ])
    assignments.value = a
    checks.value = c
  } catch {
    error.value = 'Failed to load data'
  } finally {
    loading.value = false
  }
})

function checkForRoom(roomId: number) {
  return checks.value.find(c => c.roomId === roomId && c.month === currentMonth && c.year === currentYear)
}

const statusColor = (status: string) =>
  ({ PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success' })[status] ?? 'grey'

async function startOrOpen(assignment: RoomAssignment) {
  const existing = checkForRoom(assignment.roomId)
  if (existing) {
    router.push(`/tech/check/${existing.id}`)
    return
  }
  try {
    const check = await createCheck({ roomId: assignment.roomId, month: currentMonth, year: currentYear })
    router.push(`/tech/check/${check.id}`)
  } catch (e: any) {
    // Check exists (409) — navigate to existing
    if (e.response?.data?.existing) {
      router.push(`/tech/check/${e.response.data.existing.id}`)
    }
  }
}
</script>

<template>
  <AppLayout>
    <h2 class="text-h5 mb-1">My Rooms</h2>
    <p class="text-medium-emphasis mb-6">{{ monthLabel }}</p>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-progress-circular v-if="loading" indeterminate class="d-block mx-auto" />

    <v-row v-else>
      <v-col
        v-for="a in assignments"
        :key="a.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card @click="startOrOpen(a)" hover>
          <v-card-title>
            {{ a.room?.number }} — {{ a.room?.name ?? 'Room' }}
          </v-card-title>
          <v-card-subtitle>{{ a.room?.building?.name }}</v-card-subtitle>
          <v-card-text>
            <v-chip
              :color="statusColor(checkForRoom(a.roomId)?.status ?? 'PENDING')"
              size="small"
            >
              {{ checkForRoom(a.roomId)?.status ?? 'PENDING' }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col v-if="assignments.length === 0" cols="12">
        <v-alert type="info">You have no rooms assigned for this month.</v-alert>
      </v-col>
    </v-row>
  </AppLayout>
</template>
