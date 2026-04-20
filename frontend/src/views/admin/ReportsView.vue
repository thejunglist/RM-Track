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
function techName(room: any) {
  const check = room.checks?.[0]
  if (!check) return '—'
  const name = check.tech?.name ?? '—'
  const partner = check.tech?.partnerName
  return partner ? `${name} & ${partner}` : name
}
function completedAt(room: any) {
  const d = room.checks?.[0]?.completedAt
  return d ? new Date(d).toLocaleDateString() : '—'
}
function roomNotes(room: any): { item: string; note: string }[] {
  return room.checks?.[0]?.notes ?? []
}
function isOverdue(room: any): boolean {
  return room.overdue === true
}

// Expanded notes rows (keyed by room id)
const expandedNotes = ref<Set<number>>(new Set())
function toggleNotes(roomId: number) {
  const s = new Set(expandedNotes.value)
  if (s.has(roomId)) { s.delete(roomId) } else { s.add(roomId) }
  expandedNotes.value = s
}

// Summary stats
const stats = computed(() => {
  if (!report.value) return null
  let total = 0, completed = 0, inProgress = 0, pending = 0, overdue = 0
  for (const b of report.value.buildings) {
    for (const r of b.rooms) {
      total++
      const s = roomStatus(r)
      if (s === 'COMPLETED') completed++
      else if (s === 'IN_PROGRESS') inProgress++
      else pending++
      if (isOverdue(r)) overdue++
    }
  }
  return { total, completed, inProgress, pending, overdue, pct: total ? Math.round(completed / total * 100) : 0 }
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
        <v-col cols="6" md="2">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.total }}</div>
              <div class="text-caption">Total Rooms</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.completed }}</div>
              <div class="text-caption">Completed</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card variant="tonal" color="blue">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.inProgress }}</div>
              <div class="text-caption">In Progress</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.pending }}</div>
              <div class="text-caption">Pending</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card variant="tonal" :color="stats.overdue > 0 ? 'error' : 'grey'">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.overdue }}</div>
              <div class="text-caption">Not checked this month</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <div class="text-h4">{{ stats.pct }}%</div>
              <div class="text-caption">Completion</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-progress-linear :model-value="stats?.pct ?? 0" color="success" rounded height="12" class="mb-6">
        <template #default="{ value }">
          <span class="text-caption font-weight-bold">{{ Math.ceil(value) }}% complete</span>
        </template>
      </v-progress-linear>

      <!-- Overdue alert -->
      <v-alert
        v-if="stats && stats.overdue > 0"
        type="error"
        variant="tonal"
        icon="mdi-alert-circle"
        class="mb-6"
      >
        <strong>{{ stats.overdue }} room{{ stats.overdue > 1 ? 's have' : ' has' }} not been checked this month.</strong>
        These are marked below with an OVERDUE badge.
      </v-alert>

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
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="room in building.rooms" :key="room.id">
              <tr>
                <td>{{ room.number }}{{ room.name ? ' — ' + room.name : '' }}</td>
                <td>{{ room.floor ?? '—' }}</td>
                <td>
                  <!-- Overdue takes priority over status chip -->
                  <v-chip v-if="isOverdue(room) && roomStatus(room) === 'PENDING'"
                    color="error" size="small" prepend-icon="mdi-alert-circle">
                    OVERDUE
                  </v-chip>
                  <template v-else>
                    <v-icon :color="statusColor(roomStatus(room))" size="small" class="mr-1">
                      {{ statusIcon(roomStatus(room)) }}
                    </v-icon>
                    {{ roomStatus(room) }}
                    <v-icon v-if="isOverdue(room)" color="error" size="small" class="ml-1"
                      title="No completed check in 3 months">mdi-alert-circle</v-icon>
                  </template>
                </td>
                <td>{{ techName(room) }}</td>
                <td>{{ completedAt(room) }}</td>
                <td>
                  <v-btn
                    v-if="roomNotes(room).length > 0"
                    variant="text"
                    size="small"
                    :color="expandedNotes.has(room.id) ? 'primary' : 'default'"
                    :prepend-icon="expandedNotes.has(room.id) ? 'mdi-note-text' : 'mdi-note-text-outline'"
                    @click="toggleNotes(room.id)"
                  >
                    {{ roomNotes(room).length }}
                  </v-btn>
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
              </tr>
              <!-- Expanded notes row -->
              <tr v-if="expandedNotes.has(room.id)" class="bg-surface-variant">
                <td colspan="6" class="pa-3">
                  <div v-for="n in roomNotes(room)" :key="n.item" class="text-body-2 mb-1">
                    <strong>{{ n.item }}:</strong> {{ n.note }}
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="building.rooms.length === 0">
              <td colspan="6" class="text-medium-emphasis">No rooms</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </AppLayout>
</template>
