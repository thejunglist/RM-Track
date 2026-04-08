<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getMonthlyReport } from '../../api/reports'

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const report = ref<any>(null)
const loading = ref(false)

const monthLabel = computed(() =>
  new Date(year.value, month.value - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
)

async function load() {
  loading.value = true
  try {
    report.value = await getMonthlyReport(month.value, year.value)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const statusColor = (status: string) =>
  ({ PENDING: 'warning', IN_PROGRESS: 'blue', COMPLETED: 'success' })[status] ?? 'grey'

function roomStatus(room: any) {
  return room.checks?.[0]?.status ?? 'PENDING'
}

const months = Array.from({ length: 12 }, (_, i) => ({
  title: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  value: i + 1,
}))
const years = [2024, 2025, 2026, 2027]
</script>

<template>
  <AppLayout>
    <h2 class="text-h5 mb-4">Monthly Overview — {{ monthLabel }}</h2>

    <div class="d-flex gap-4 align-center mb-6">
      <v-select v-model="month" :items="months" item-title="title" item-value="value"
        label="Month" density="compact" style="max-width:160px" />
      <v-select v-model="year" :items="years" label="Year" density="compact" style="max-width:110px" />
      <v-btn color="primary" :loading="loading" @click="load">Load</v-btn>
    </div>

    <v-progress-circular v-if="loading" indeterminate class="d-block mx-auto" />

    <div v-else-if="report">
      <v-card v-for="building in report.buildings" :key="building.id" class="mb-6" variant="outlined">
        <v-card-title>
          <v-icon class="mr-2">mdi-office-building</v-icon>{{ building.name }}
          <span class="text-caption ml-2 text-medium-emphasis">{{ building.location }}</span>
        </v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap gap-3">
            <v-chip
              v-for="room in building.rooms"
              :key="room.id"
              :color="statusColor(roomStatus(room))"
              label
            >
              {{ room.number }}
              <v-tooltip activator="parent">
                {{ room.name ?? room.number }} — {{ roomStatus(room) }}
                <span v-if="room.checks?.[0]?.tech"> · {{ room.checks[0].tech.name }}</span>
              </v-tooltip>
            </v-chip>
          </div>
          <p v-if="building.rooms.length === 0" class="text-medium-emphasis mt-2">No rooms in this building.</p>
        </v-card-text>
      </v-card>

      <div class="d-flex gap-4 mt-2">
        <v-chip color="warning" size="small">PENDING</v-chip>
        <v-chip color="blue" size="small">IN PROGRESS</v-chip>
        <v-chip color="success" size="small">COMPLETED</v-chip>
      </div>
    </div>
  </AppLayout>
</template>
