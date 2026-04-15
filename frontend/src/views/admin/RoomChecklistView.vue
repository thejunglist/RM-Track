<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getRooms } from '../../api/rooms'
import { getCheckItems } from '../../api/checkItems'
import { getRoomCheckItems, setRoomCheckItems } from '../../api/roomCheckItems'
import type { Room, CheckItem } from '../../types'

const rooms = ref<Room[]>([])
const checkItems = ref<CheckItem[]>([])
const loading = ref(true)

// Per-room configured item counts (roomId → count)
const configuredCounts = ref<Record<number, number>>({})

const dialog = ref(false)
const saving = ref(false)
const selectedRoom = ref<Room | null>(null)
const selectedIds = ref<number[]>([])
const applyToBuilding = ref(false)

const headers = [
  { title: 'Room', key: 'number' },
  { title: 'Building', key: 'building.name' },
  { title: 'Items Configured', key: 'configured', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

async function load() {
  loading.value = true
  ;[rooms.value, checkItems.value] = await Promise.all([getRooms(), getCheckItems()])

  // Load configured counts for all rooms in parallel
  const counts = await Promise.all(
    rooms.value.map(r => getRoomCheckItems(r.id).then(items => ({ roomId: r.id, count: items.length })))
  )
  configuredCounts.value = Object.fromEntries(counts.map(c => [c.roomId, c.count]))
  loading.value = false
}
onMounted(load)

async function openConfigure(room: Room) {
  selectedRoom.value = room
  applyToBuilding.value = false
  const existing = await getRoomCheckItems(room.id)
  selectedIds.value = existing.map(rci => rci.checkItemId)
  dialog.value = true
}

const buildingRooms = computed(() => {
  if (!selectedRoom.value) return []
  return rooms.value.filter(r => r.buildingId === selectedRoom.value!.buildingId)
})

async function save() {
  if (!selectedRoom.value) return
  saving.value = true
  try {
    const targetRooms = applyToBuilding.value ? buildingRooms.value : [selectedRoom.value]
    await Promise.all(targetRooms.map(r => setRoomCheckItems(r.id, selectedIds.value)))
    dialog.value = false
    await load()
  } finally { saving.value = false }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Room Checklist</h2>
    </div>

    <v-alert type="info" density="compact" variant="tonal" class="mb-4">
      Configure which check items apply to each room. Use <strong>Apply to whole building</strong> to set the same checklist for all rooms in a building at once.
    </v-alert>

    <v-data-table :headers="headers" :items="rooms" :loading="loading" hover>
      <template #item.configured="{ item }">
        <v-chip
          :color="(configuredCounts[item.id] ?? 0) > 0 ? 'success' : 'warning'"
          size="small"
        >
          {{ configuredCounts[item.id] ?? 0 }} item{{ (configuredCounts[item.id] ?? 0) !== 1 ? 's' : '' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="tonal" prepend-icon="mdi-cog" @click="openConfigure(item)">Configure</v-btn>
      </template>
    </v-data-table>

    <!-- Configure dialog -->
    <v-dialog v-model="dialog" max-width="520" scrollable>
      <v-card :title="`Configure — ${selectedRoom?.number}${selectedRoom?.name ? ' ' + selectedRoom.name : ''}`">
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Select which items should appear on the check form for this room.
          </p>

          <v-list lines="one" density="compact">
            <v-list-item
              v-for="item in checkItems"
              :key="item.id"
              :title="item.name"
              :subtitle="item.answerType"
            >
              <template #prepend>
                <v-checkbox-btn
                  :model-value="selectedIds.includes(item.id)"
                  @update:model-value="(v) => v
                    ? selectedIds.push(item.id)
                    : selectedIds.splice(selectedIds.indexOf(item.id), 1)"
                />
              </template>
            </v-list-item>
          </v-list>

          <v-divider class="my-3" />

          <v-switch
            v-model="applyToBuilding"
            color="primary"
            density="compact"
            hide-details
            :label="`Apply to all ${buildingRooms.length} rooms in ${selectedRoom?.building?.name ?? 'this building'}`"
          />
        </v-card-text>

        <v-card-actions>
          <v-btn variant="text" @click="selectedIds = []">Clear all</v-btn>
          <v-btn variant="text" @click="selectedIds = checkItems.map(i => i.id)">Select all</v-btn>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AppLayout>
</template>
