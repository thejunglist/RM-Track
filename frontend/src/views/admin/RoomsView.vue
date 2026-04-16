<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getRooms, createRoom, updateRoom, deleteRoom, bulkImportRooms } from '../../api/rooms'
import type { BulkRoomResult } from '../../api/rooms'
import { getBuildings } from '../../api/buildings'
import type { Room, Building } from '../../types'

// ── Existing state ────────────────────────────────────────────────────────────
const rooms = ref<Room[]>([])
const buildings = ref<Building[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const selected = ref<Room | null>(null)
const form = ref({ buildingId: 0, number: '', floor: '', name: '' })

const headers = [
  { title: 'Number', key: 'number' },
  { title: 'Name', key: 'name' },
  { title: 'Floor', key: 'floor' },
  { title: 'Building', key: 'building.name' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

async function load() {
  loading.value = true
  ;[rooms.value, buildings.value] = await Promise.all([getRooms(), getBuildings()])
  loading.value = false
}

onMounted(load)

function openCreate() {
  selected.value = null
  form.value = { buildingId: buildings.value[0]?.id ?? 0, number: '', floor: '', name: '' }
  dialog.value = true
}

function openEdit(r: Room) {
  selected.value = r
  form.value = { buildingId: r.buildingId, number: r.number, floor: r.floor ?? '', name: r.name ?? '' }
  dialog.value = true
}

function openDelete(r: Room) { selected.value = r; delDialog.value = true }

async function save() {
  saving.value = true
  try {
    const data = { ...form.value, floor: form.value.floor || undefined, name: form.value.name || undefined }
    if (selected.value) await updateRoom(selected.value.id, data)
    else await createRoom(data)
    dialog.value = false
    await load()
  } finally { saving.value = false }
}

async function confirmDelete() {
  if (!selected.value) return
  await deleteRoom(selected.value.id)
  delDialog.value = false
  await load()
}

// ── CSV bulk import ───────────────────────────────────────────────────────────

interface PreviewRoom {
  number: string
  buildingName: string
  buildingId: number | null
}

const csvDialog = ref(false)
const importing = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const fileError = ref('')

const previewToImport = ref<PreviewRoom[]>([])
const skippedNoBuilding = ref<PreviewRoom[]>([])
const skippedAlreadyExists = ref<PreviewRoom[]>([])

const previewHeaders = [
  { title: 'Room Number', key: 'number' },
  { title: 'Building', key: 'buildingName' },
]

function buildBuildingMap(): Map<string, number> {
  const map = new Map<string, number>()
  for (const b of buildings.value) {
    map.set(b.name.toLowerCase(), b.id)
  }
  return map
}

const ROOM_CODE_RE = /^[A-Z]{2}[\dA-Za-z]+$/

function parseCsvRooms(text: string): PreviewRoom[] | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')

  // Skip header row if first column heading is "building" or "room"
  let startIndex = 0
  if (lines.length > 0 && /^(building|room)/i.test(lines[0]!.trim())) {
    startIndex = 1
  }

  const seen = new Map<string, PreviewRoom>()
  const invalid: string[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i]!.split(',')
    if (cols.length < 2) continue
    const buildingName = cols[0]!.trim()
    const number = cols[1]!.trim()
    if (!buildingName || !number) continue

    if (!ROOM_CODE_RE.test(number)) {
      invalid.push(number)
      continue
    }

    const key = `${buildingName.toLowerCase()}|${number}`
    if (!seen.has(key)) {
      seen.set(key, { number, buildingName, buildingId: null })
    }
  }

  if (invalid.length > 0) {
    fileError.value = `Invalid room code(s): ${invalid.join(', ')}. Codes must be 2 uppercase letters followed by numbers (e.g. LT101).`
    return null
  }

  if (seen.size === 0) {
    fileError.value = 'No room data found in this CSV.'
    return null
  }

  return [...seen.values()]
}

function onFileChange(files: File[] | File | null) {
  fileError.value = ''
  previewToImport.value = []
  skippedNoBuilding.value = []
  skippedAlreadyExists.value = []

  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const parsed = parseCsvRooms(text)
    if (!parsed) return

    const buildingMap = buildBuildingMap()
    const existingRooms = new Set(rooms.value.map(r => `${r.buildingId}|${r.number}`))

    for (const row of parsed) {
      const buildingId = buildingMap.get(row.buildingName.toLowerCase()) ?? null
      row.buildingId = buildingId

      if (buildingId === null) {
        skippedNoBuilding.value.push(row)
      } else if (existingRooms.has(`${buildingId}|${row.number}`)) {
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
  skippedNoBuilding.value = []
  skippedAlreadyExists.value = []
  csvDialog.value = true
}

async function confirmImport() {
  if (previewToImport.value.length === 0) return
  importing.value = true
  try {
    const result: BulkRoomResult = await bulkImportRooms(
      previewToImport.value.map(r => ({ buildingId: r.buildingId!, number: r.number }))
    )
    csvDialog.value = false
    snackbarText.value = `Imported ${result.imported} room${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped as duplicates)` : ''}.`
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
      <h2 class="text-h5">Rooms</h2>
      <v-spacer />
      <v-btn variant="outlined" prepend-icon="mdi-file-upload-outline" class="mr-2" @click="openCsvDialog">
        Import from CSV
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Room</v-btn>
    </div>

    <v-data-table :headers="headers" :items="rooms" :loading="loading" hover>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
      </template>
    </v-data-table>

    <!-- Add/Edit dialog -->
    <v-dialog v-model="dialog" max-width="520">
      <v-card :title="selected ? 'Edit Room' : 'Add Room'">
        <v-card-text class="d-flex flex-column gap-2">
          <v-select v-model="form.buildingId" :items="buildings" item-title="name" item-value="id" label="Building" required />
          <v-text-field v-model="form.number" label="Room Number" required />
          <v-text-field v-model="form.floor" label="Floor (optional)" />
          <v-text-field v-model="form.name" label="Room Name (optional)" />
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
      <v-card title="Delete Room">
        <v-card-text>Delete room <strong>{{ selected?.number }}</strong>? All equipment and questions inside will be removed.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="delDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CSV import dialog -->
    <v-dialog v-model="csvDialog" max-width="700" scrollable>
      <v-card title="Import Rooms from CSV">
        <v-card-text>
          <v-alert type="info" density="compact" variant="tonal" class="mb-4">
            Two columns: building name and room code. Room codes must be 2 uppercase letters followed by numbers (e.g. <strong>LT101</strong>, <strong>GH201</strong>). Import buildings first if any are missing.
          </v-alert>

          <v-file-input
            label="Select CSV file"
            accept=".csv,text/csv"
            prepend-icon="mdi-paperclip"
            show-size
            clearable
            @update:model-value="onFileChange"
          />

          <v-alert v-if="fileError" type="error" density="compact" class="mb-3">{{ fileError }}</v-alert>

          <template v-if="previewToImport.length + skippedNoBuilding.length + skippedAlreadyExists.length > 0">
            <div class="d-flex gap-3 mb-4 flex-wrap">
              <v-chip color="success" prepend-icon="mdi-check">
                {{ previewToImport.length }} will be imported
              </v-chip>
              <v-chip v-if="skippedNoBuilding.length" color="warning" prepend-icon="mdi-office-building-off">
                {{ skippedNoBuilding.length }} skipped — building not found
              </v-chip>
              <v-chip v-if="skippedAlreadyExists.length" color="info" prepend-icon="mdi-content-duplicate">
                {{ skippedAlreadyExists.length }} skipped — already exists
              </v-chip>
            </div>

            <div v-if="previewToImport.length > 0">
              <div class="text-subtitle-2 mb-1">Rooms to import</div>
              <v-data-table :headers="previewHeaders" :items="previewToImport" density="compact" :items-per-page="10" class="mb-4" />
            </div>

            <div v-if="skippedNoBuilding.length > 0">
              <div class="text-subtitle-2 mb-1 text-warning">Skipped — building not in database</div>
              <v-data-table :headers="previewHeaders" :items="skippedNoBuilding" density="compact" :items-per-page="5" class="mb-4" />
            </div>

            <div v-if="skippedAlreadyExists.length > 0">
              <div class="text-subtitle-2 mb-1 text-info">Skipped — room already exists</div>
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
