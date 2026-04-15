<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getEquipment, createEquipment, updateEquipment, deleteEquipment } from '../../api/equipment'
import { getRooms } from '../../api/rooms'
import type { Equipment, Room } from '../../types'

// ── State ─────────────────────────────────────────────────────────────────────
const equipment = ref<Equipment[]>([])
const rooms = ref<Room[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const selected = ref<Equipment | null>(null)
const form = ref({ roomId: 0, name: '' })

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Room', key: 'roomId' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

function roomLabel(roomId: number) {
  const r = rooms.value.find(r => r.id === roomId)
  return r ? `${r.number}${r.name ? ' — ' + r.name : ''}` : roomId
}

async function load() {
  loading.value = true
  ;[equipment.value, rooms.value] = await Promise.all([getEquipment(), getRooms()])
  loading.value = false
}
onMounted(load)

function openCreate() {
  selected.value = null
  form.value = { roomId: rooms.value[0]?.id ?? 0, name: '' }
  dialog.value = true
}

function openEdit(e: Equipment) {
  selected.value = e
  form.value = { roomId: e.roomId, name: e.name }
  dialog.value = true
}

function openDelete(e: Equipment) { selected.value = e; delDialog.value = true }

async function save() {
  saving.value = true
  try {
    const data = { roomId: form.value.roomId, name: form.value.name || 'Unknown' }
    if (selected.value) await updateEquipment(selected.value.id, data)
    else await createEquipment(data)
    dialog.value = false
    await load()
  } finally { saving.value = false }
}

async function confirmDelete() {
  if (!selected.value) return
  await deleteEquipment(selected.value.id)
  delDialog.value = false
  await load()
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Equipment</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Equipment</v-btn>
    </div>

    <v-data-table :headers="headers" :items="equipment" :loading="loading" hover>
      <template #item.roomId="{ item }">{{ roomLabel(item.roomId) }}</template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
      </template>
    </v-data-table>

    <!-- Add/Edit dialog -->
    <v-dialog v-model="dialog" max-width="440">
      <v-card :title="selected ? 'Edit Equipment' : 'Add Equipment'">
        <v-card-text class="d-flex flex-column gap-2">
          <v-select
            v-model="form.roomId"
            :items="rooms.map(r => ({ title: `${r.number}${r.name ? ' — '+r.name : ''}`, value: r.id }))"
            item-title="title" item-value="value"
            label="Room" required
          />
          <v-text-field v-model="form.name" label="Name" required />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete dialog -->
    <v-dialog v-model="delDialog" max-width="400">
      <v-card title="Delete Equipment">
        <v-card-text>Delete <strong>{{ selected?.name }}</strong>? All associated questions will be removed.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="delDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AppLayout>
</template>
