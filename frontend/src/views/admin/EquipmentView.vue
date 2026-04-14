<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, bulkImportEquipment } from '../../api/equipment'
import type { BulkImportItem } from '../../api/equipment'
import { getRooms } from '../../api/rooms'
import type { Equipment, Room } from '../../types'

// ── Existing state ────────────────────────────────────────────────────────────
const equipment = ref<Equipment[]>([])
const rooms = ref<Room[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const selected = ref<Equipment | null>(null)
const form = ref({ roomId: 0, name: '', category: '' })

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Category', key: 'category' },
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
  form.value = { roomId: rooms.value[0]?.id ?? 0, name: '', category: '' }
  dialog.value = true
}
function openEdit(e: Equipment) {
  selected.value = e
  form.value = { roomId: e.roomId, name: e.name, category: e.category ?? '' }
  dialog.value = true
}
function openDelete(e: Equipment) { selected.value = e; delDialog.value = true }

async function save() {
  saving.value = true
  try {
    const data = { ...form.value, category: form.value.category || undefined }
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

// ── CSV bulk import ───────────────────────────────────────────────────────────

interface PreviewRow {
  assetTag: string
  name: string
  category: string
  building: string
  roomNumber: string
  roomId: number | null
}

const csvDialog = ref(false)
const importing = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const fileError = ref('')

const previewToImport = ref<PreviewRow[]>([])
const skippedUnknownRoom = ref<PreviewRow[]>([])
const skippedAlreadyExists = ref<PreviewRow[]>([])

const previewHeaders = [
  { title: 'Asset Tag', key: 'assetTag' },
  { title: 'Model', key: 'name' },
  { title: 'Category', key: 'category' },
  { title: 'Building', key: 'building' },
  { title: 'Room', key: 'roomNumber' },
]

function buildRoomMap(): Map<string, number> {
  const map = new Map<string, number>()
  for (const room of rooms.value) {
    const key = `${(room.building?.name ?? '').toLowerCase()}|${room.number}`
    map.set(key, room.id)
  }
  return map
}

function parseCsv(text: string): PreviewRow[] | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')

  // Skip header row if first column heading is "asset" or "name"
  let startIndex = 0
  if (lines.length > 0 && /^(asset|name)/i.test(lines[0]!.trim())) {
    startIndex = 1
  }

  const rows: PreviewRow[] = []
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i]!.split(',')
    if (cols.length < 5) continue

    const assetTag = cols[0]!.trim()
    const name = cols[1]!.trim()
    const category = cols[2]!.trim()
    const building = cols[3]!.trim()
    const roomNumber = cols[4]!.trim()

    if (!assetTag && !name) continue

    rows.push({ assetTag, name, category, building, roomNumber, roomId: null })
  }

  if (rows.length === 0) {
    fileError.value = 'No valid data rows found in this CSV.'
    return null
  }

  return rows
}

function onFileChange(files: File[] | File | null) {
  fileError.value = ''
  previewToImport.value = []
  skippedUnknownRoom.value = []
  skippedAlreadyExists.value = []

  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const rows = parseCsv(text)
    if (!rows) return

    const existingTags = new Set(equipment.value.map(eq => eq.assetTag).filter(Boolean))
    const roomMap = buildRoomMap()

    for (const row of rows) {
      const key = `${row.building.toLowerCase()}|${row.roomNumber}`
      const roomId = roomMap.get(key) ?? null
      row.roomId = roomId

      if (roomId === null) {
        skippedUnknownRoom.value.push(row)
      } else if (row.assetTag && existingTags.has(row.assetTag)) {
        skippedAlreadyExists.value.push(row)
      } else {
        previewToImport.value.push(row)
      }
    }
  }
  reader.onerror = () => { fileError.value = 'Could not read file.' }
  reader.readAsText(file)
}

function openCsvDialog() {
  fileError.value = ''
  previewToImport.value = []
  skippedUnknownRoom.value = []
  skippedAlreadyExists.value = []
  csvDialog.value = true
}

async function confirmImport() {
  if (previewToImport.value.length === 0) return
  importing.value = true
  try {
    const items: BulkImportItem[] = previewToImport.value.map(row => ({
      roomId: row.roomId!,
      name: row.name,
      category: row.category || undefined,
      assetTag: row.assetTag || undefined,
    }))
    const result = await bulkImportEquipment(items)
    csvDialog.value = false
    snackbarText.value = `Imported ${result.imported} item${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped as duplicates)` : ''}.`
    snackbar.value = true
    await load()
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Equipment</h2>
      <v-spacer />
      <v-btn variant="outlined" prepend-icon="mdi-file-upload-outline" class="mr-2" @click="openCsvDialog">
        Import from CSV
      </v-btn>
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
    <v-dialog v-model="dialog" max-width="480">
      <v-card :title="selected ? 'Edit Equipment' : 'Add Equipment'">
        <v-card-text class="d-flex flex-column gap-2">
          <v-select v-model="form.roomId" :items="rooms.map(r => ({ title: `${r.number}${r.name ? ' — '+r.name : ''}`, value: r.id }))" item-title="title" item-value="value" label="Room" required />
          <v-text-field v-model="form.name" label="Equipment Name" required />
          <v-text-field v-model="form.category" label="Category (optional)" />
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

    <!-- CSV import dialog -->
    <v-dialog v-model="csvDialog" max-width="900" scrollable>
      <v-card title="Import Equipment from CSV">
        <v-card-text>
          <v-file-input
            label="Select CSV file"
            accept=".csv,text/csv"
            prepend-icon="mdi-paperclip"
            show-size
            clearable
            @update:model-value="onFileChange"
          />

          <v-alert v-if="fileError" type="error" density="compact" class="mb-3">{{ fileError }}</v-alert>

          <template v-if="previewToImport.length + skippedUnknownRoom.length + skippedAlreadyExists.length > 0">
            <div class="d-flex gap-3 mb-4 flex-wrap">
              <v-chip color="success" prepend-icon="mdi-check">
                {{ previewToImport.length }} will be imported
              </v-chip>
              <v-chip v-if="skippedUnknownRoom.length" color="warning" prepend-icon="mdi-map-marker-off">
                {{ skippedUnknownRoom.length }} skipped — room not found
              </v-chip>
              <v-chip v-if="skippedAlreadyExists.length" color="info" prepend-icon="mdi-content-duplicate">
                {{ skippedAlreadyExists.length }} skipped — already exists
              </v-chip>
            </div>

            <div v-if="previewToImport.length > 0">
              <div class="text-subtitle-2 mb-1">Items to import</div>
              <v-data-table :headers="previewHeaders" :items="previewToImport" density="compact" :items-per-page="10" class="mb-4" />
            </div>

            <div v-if="skippedUnknownRoom.length > 0">
              <div class="text-subtitle-2 mb-1 text-warning">Skipped — building/room not recognised</div>
              <v-data-table :headers="previewHeaders" :items="skippedUnknownRoom" density="compact" :items-per-page="5" class="mb-4" />
            </div>

            <div v-if="skippedAlreadyExists.length > 0">
              <div class="text-subtitle-2 mb-1 text-info">Skipped — asset tag already in database</div>
              <v-data-table :headers="previewHeaders" :items="skippedAlreadyExists" density="compact" :items-per-page="5" />
            </div>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="csvDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="importing" :disabled="previewToImport.length === 0" @click="confirmImport">
            Import{{ previewToImport.length > 0 ? ` (${previewToImport.length})` : '' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success snackbar -->
    <v-snackbar v-model="snackbar" color="success" :timeout="4000">
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="snackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </AppLayout>
</template>
