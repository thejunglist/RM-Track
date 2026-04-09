<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getAssignments, createAssignment, deleteAssignment } from '../../api/assignments'
import { getUsers } from '../../api/users'
import { getRooms } from '../../api/rooms'
import { getBuildings } from '../../api/buildings'
import type { RoomAssignment, User, Room, Building } from '../../types'

const assignments = ref<RoomAssignment[]>([])
const users = ref<User[]>([])
const rooms = ref<Room[]>([])
const buildings = ref<Building[]>([])
const loading = ref(true)
const dialog = ref(false)
const saving = ref(false)
const form = ref({ techId: '' as string, buildingId: 0 })

const techs = () => users.value.filter(u => u.role === 'TECH')

const headers = [
  { title: 'Tech', key: 'tech.name' },
  { title: 'Room', key: 'room.number' },
  { title: 'Building', key: 'room.building.name' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

async function load() {
  loading.value = true
  ;[assignments.value, users.value, rooms.value, buildings.value] = await Promise.all([
    getAssignments(),
    getUsers(),
    getRooms(),
    getBuildings(),
  ])
  loading.value = false
}
onMounted(load)

function openCreate() {
  form.value = { techId: techs()[0]?.id ?? '', buildingId: buildings.value[0]?.id ?? 0 }
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    const buildingRooms = rooms.value.filter(r => r.buildingId === form.value.buildingId)
    await Promise.all(
      buildingRooms.map(r =>
        createAssignment({ techId: form.value.techId, roomId: r.id }).catch(() => {})
      )
    )
    dialog.value = false
    await load()
  } finally { saving.value = false }
}

async function remove(a: RoomAssignment) {
  await deleteAssignment(a.id)
  await load()
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Room Assignments</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Assign Tech</v-btn>
    </div>

    <v-data-table :headers="headers" :items="assignments" :loading="loading" hover>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="remove(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="480">
      <v-card title="Assign Tech to Building">
        <v-card-text class="d-flex flex-column gap-2">
          <v-select
            v-model="form.techId"
            :items="techs().map(u => ({ title: u.name + ' (' + u.email + ')', value: u.id }))"
            item-title="title" item-value="value"
            label="Technician" required
          />
          <v-select
            v-model="form.buildingId"
            :items="buildings.map(b => ({ title: b.name, value: b.id }))"
            item-title="title" item-value="value"
            label="Building" required
          />
          <div v-if="form.buildingId" class="text-caption text-medium-emphasis">
            {{ rooms.filter(r => r.buildingId === form.buildingId).length }} rooms will be assigned
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Assign</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AppLayout>
</template>
