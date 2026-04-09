<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getBuildings, createBuilding, updateBuilding, deleteBuilding, bulkImportBuildings } from '../../api/buildings'
import type { Building } from '../../types'

// ── Existing state ────────────────────────────────────────────────────────────
const buildings = ref<Building[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const selected = ref<Building | null>(null)
const form = ref({ name: '', location: '' })

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Location', key: 'location' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

async function load() {
  loading.value = true
  buildings.value = await getBuildings()
  loading.value = false
}

onMounted(load)

function openCreate() {
  selected.value = null
  form.value = { name: '', location: '' }
  dialog.value = true
}

function openEdit(b: Building) {
  selected.value = b
  form.value = { name: b.name, location: b.location ?? '' }
  dialog.value = true
}

function openDelete(b: Building) {
  selected.value = b
  delDialog.value = true
}

async function save() {
  saving.value = true
  try {
    const data = { name: form.value.name, location: form.value.location || undefined }
    if (selected.value) {
      await updateBuilding(selected.value.id, data)
    } else {
      await createBuilding(data)
    }
    dialog.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!selected.value) return
  await deleteBuilding(selected.value.id)
  delDialog.value = false
  await load()
}

// ── CSV bulk import ───────────────────────────────────────────────────────────

const csvDialog = ref(false)
const importing = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const fileError = ref('')

const previewToImport = ref<string[]>([])
const previewSkipped = ref<string[]>([])

const previewHeaders = [{ title: 'Building Name', key: 'name' }]

function parseCsvBuildings(text: string): string[] | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')

  // Skip header row if first column heading is "name" or "building"
  let startIndex = 0
  if (lines.length > 0 && /^(name|building)/i.test(lines[0].trim())) {
    startIndex = 1
  }

  const seen = new Set<string>()
  for (let i = startIndex; i < lines.length; i++) {
    const name = lines[i].split(',')[0].trim()
    if (name) seen.add(name)
  }

  if (seen.size === 0) {
    fileError.value = 'No building names found in this CSV.'
    return null
  }

  return [...seen]
}

function onFileChange(files: File[] | File | null) {
  fileError.value = ''
  previewToImport.value = []
  previewSkipped.value = []

  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const names = parseCsvBuildings(text)
    if (!names) return

    const existingNames = new Set(buildings.value.map(b => b.name.toLowerCase()))
    for (const name of names) {
      if (existingNames.has(name.toLowerCase())) {
        previewSkipped.value.push(name)
      } else {
        previewToImport.value.push(name)
      }
    }
  }
  reader.onerror = () => { fileError.value = 'Could not read file.' }
  reader.readAsText(file)
}

function openCsvDialog() {
  fileError.value = ''
  previewToImport.value = []
  previewSkipped.value = []
  csvDialog.value = true
}

async function confirmImport() {
  if (previewToImport.value.length === 0) return
  importing.value = true
  try {
    const result = await bulkImportBuildings(previewToImport.value.map(name => ({ name })))
    csvDialog.value = false
    snackbarText.value = `Imported ${result.imported} building${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped as duplicates)` : ''}.`
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
      <h2 class="text-h5">Buildings</h2>
      <v-spacer />
      <v-btn variant="outlined" prepend-icon="mdi-file-upload-outline" class="mr-2" @click="openCsvDialog">
        Import from CSV
      </v-btn>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Building</v-btn>
    </div>

    <v-data-table :headers="headers" :items="buildings" :loading="loading" hover>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
      </template>
    </v-data-table>

    <!-- Add/Edit dialog -->
    <v-dialog v-model="dialog" max-width="480">
      <v-card :title="selected ? 'Edit Building' : 'Add Building'">
        <v-card-text>
          <v-text-field v-model="form.name" label="Name" required />
          <v-text-field v-model="form.location" label="Location (optional)" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirmation -->
    <v-dialog v-model="delDialog" max-width="400">
      <v-card title="Delete Building">
        <v-card-text>
          Delete <strong>{{ selected?.name }}</strong>? This will also remove all rooms and equipment inside it.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="delDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- CSV import dialog -->
    <v-dialog v-model="csvDialog" max-width="600" scrollable>
      <v-card title="Import Buildings from CSV">
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

          <template v-if="previewToImport.length + previewSkipped.length > 0">
            <div class="d-flex gap-3 mb-4 flex-wrap">
              <v-chip color="success" prepend-icon="mdi-check">
                {{ previewToImport.length }} will be imported
              </v-chip>
              <v-chip v-if="previewSkipped.length" color="info" prepend-icon="mdi-content-duplicate">
                {{ previewSkipped.length }} skipped — already exists
              </v-chip>
            </div>

            <div v-if="previewToImport.length > 0">
              <div class="text-subtitle-2 mb-1">Buildings to import</div>
              <v-data-table
                :headers="previewHeaders"
                :items="previewToImport.map(name => ({ name }))"
                density="compact"
                :items-per-page="10"
                class="mb-4"
              />
            </div>

            <div v-if="previewSkipped.length > 0">
              <div class="text-subtitle-2 mb-1 text-info">Skipped — already in database</div>
              <v-data-table
                :headers="previewHeaders"
                :items="previewSkipped.map(name => ({ name }))"
                density="compact"
                :items-per-page="5"
              />
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
