<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getMonthlyReport } from '../../api/reports'

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const report = ref<any>(null)
const loading = ref(false)

const months = Array.from({ length: 12 }, (_, i) => ({
  title: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  value: i + 1,
}))
const years = [2024, 2025, 2026, 2027]

const monthLabel = computed(() =>
  new Date(year.value, month.value - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
)

async function load() {
  loading.value = true
  try { report.value = await getMonthlyReport(month.value, year.value) }
  finally { loading.value = false }
}
onMounted(load)

const statusColor = (status: string) =>
  ({ PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green' })[status] ?? 'grey'

const statusIcon = (status: string) =>
  ({ PENDING: 'mdi-clock-outline', IN_PROGRESS: 'mdi-progress-check', COMPLETED: 'mdi-check-circle' })[status] ?? 'mdi-help'

function roomStatus(room: any) { return room.checks?.[0]?.status ?? 'PENDING' }
function techName(room: any) { return room.checks?.[0]?.tech?.name ?? '—' }
function completedAt(room: any) {
  const d = room.checks?.[0]?.completedAt
  return d ? new Date(d).toLocaleDateString() : '—'
}

// Summary stats
const stats = computed(() => {
  if (!report.value) return null
  let total = 0, completed = 0, inProgress = 0, pending = 0
  for (const b of report.value.buildings) {
    for (const r of b.rooms) {
      total++
      const s = roomStatus(r)
      if (s === 'COMPLETED') completed++
      else if (s === 'IN_PROGRESS') inProgress++
      else pending++
    }
  }
  return { total, completed, inProgress, pending, pct: total ? Math.round(completed / total * 100) : 0 }
})
</script>

<template>
  <AppLayout>
    <h2 class="text-h5 mb-4">Reports</h2>

    <div class="d-flex gap-4 align-center mb-6">
      <v-select v-model="month" :items="months" item-title="title" item-value="value"
        label="Month" density="compact" style="max-width:160px" />
      <v-select v-model="year" :items="years" label="Year" density="compact" style="max-width:110px" />
      <v-btn color="primary" :loading="loading" @click="load">Load</v-btn>
    </div>

    <v-progress-circular v-if="loading" indeterminate class="d-block mx-auto" />

    <template v-else-if="report">
      <!-- Summary cards -->
      <v-row class="mb-6" v-if="stats">
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.total }}</div>
              <div class="text-caption">Total Rooms</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.completed }}</div>
              <div class="text-caption">Completed</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="blue">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.inProgress }}</div>
              <div class="text-caption">In Progress</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.pending }}</div>
              <div class="text-caption">Pending</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-progress-linear :model-value="stats?.pct ?? 0" color="success" rounded height="12" class="mb-6">
        <template #default="{ value }">
          <span class="text-caption font-weight-bold">{{ Math.ceil(value) }}% complete</span>
        </template>
      </v-progress-linear>

      <!-- Per building detail table -->
      <v-card v-for="building in report.buildings" :key="building.id" class="mb-6" variant="outlined">
        <v-card-title>
          <v-icon class="mr-2">mdi-office-building</v-icon>{{ building.name }}
        </v-card-title>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Room</th>
              <th>Floor</th>
              <th>Status</th>
              <th>Tech</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in building.rooms" :key="room.id">
              <td>{{ room.number }}{{ room.name ? ' — ' + room.name : '' }}</td>
              <td>{{ room.floor ?? '—' }}</td>
              <td>
                <v-icon :color="statusColor(roomStatus(room))" size="small" class="mr-1">
                  {{ statusIcon(roomStatus(room)) }}
                </v-icon>
                {{ roomStatus(room) }}
              </td>
              <td>{{ techName(room) }}</td>
              <td>{{ completedAt(room) }}</td>
            </tr>
            <tr v-if="building.rooms.length === 0">
              <td colspan="5" class="text-medium-emphasis">No rooms</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </AppLayout>
</template>
