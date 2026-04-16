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
const showHistory = ref(false)

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
    if (e.response?.data?.existing) {
      router.push(`/tech/check/${e.response.data.existing.id}`)
    }
  }
}

// Past checks — all checks not from the current month/year
const pastChecks = computed(() => {
  return checks.value
    .filter(c => !(c.month === currentMonth && c.year === currentYear))
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.month - a.month
    })
})

// Group past checks by "Month Year" label
const pastByMonth = computed(() => {
  const groups: { label: string; checks: MonthlyCheck[] }[] = []
  for (const c of pastChecks.value) {
    const label = new Date(c.year, c.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    const existing = groups.find(g => g.label === label)
    if (existing) {
      existing.checks.push(c)
    } else {
      groups.push({ label, checks: [c] })
    }
  }
  return groups
})

function roomLabel(c: MonthlyCheck) {
  if (!c.room) return `Room ${c.roomId}`
  return c.room.name ? `${c.room.number} — ${c.room.name}` : c.room.number
}
</script>

<template>
  <AppLayout>
    <h2 class="text-h5 mb-1">My Rooms</h2>
    <p class="text-medium-emphasis mb-6">{{ monthLabel }}</p>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-progress-circular v-if="loading" indeterminate class="d-block mx-auto" />

    <template v-else>
      <!-- Current month room cards -->
      <v-row>
        <v-col
          v-for="a in assignments"
          :key="a.id"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card @click="startOrOpen(a)" hover>
            <v-card-title>
              {{ a.room?.number }}<span v-if="a.room?.name"> — {{ a.room.name }}</span>
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

      <!-- History section -->
      <div v-if="pastChecks.length > 0" class="mt-8">
        <div class="d-flex align-center mb-3 cursor-pointer" @click="showHistory = !showHistory">
          <v-icon class="mr-2" size="small">{{ showHistory ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
          <h3 class="text-subtitle-1 font-weight-medium">Previous Checks ({{ pastChecks.length }})</h3>
        </div>

        <template v-if="showHistory">
          <div v-for="group in pastByMonth" :key="group.label" class="mb-4">
            <p class="text-caption text-medium-emphasis text-uppercase font-weight-bold mb-2">{{ group.label }}</p>
            <v-card variant="outlined">
              <v-list density="compact">
                <v-list-item
                  v-for="c in group.checks"
                  :key="c.id"
                  :subtitle="c.room?.building?.name"
                  @click="router.push(`/tech/check/${c.id}`)"
                  hover
                >
                  <template #title>
                    {{ roomLabel(c) }}
                  </template>
                  <template #append>
                    <v-chip :color="statusColor(c.status)" size="x-small">{{ c.status }}</v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </div>
        </template>
      </div>
    </template>
  </AppLayout>
</template>
