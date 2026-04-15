<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getCheckItems, createCheckItem, updateCheckItem, deleteCheckItem } from '../../api/checkItems'
import type { CheckItem } from '../../types'

const items = ref<CheckItem[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const selected = ref<CheckItem | null>(null)
const form = ref({ name: '', answerType: 'YES_NO', order: 0 })

const headers = [
  { title: 'Order', key: 'order', width: '80px' },
  { title: 'Name', key: 'name' },
  { title: 'Answer Type', key: 'answerType' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

const answerTypes = [
  { title: 'Yes / No', value: 'YES_NO' },
  { title: 'Numeric', value: 'NUMERIC' },
  { title: 'Text', value: 'TEXT' },
]

const typeColor: Record<string, string> = {
  YES_NO: 'primary',
  NUMERIC: 'warning',
  TEXT: 'info',
}

async function load() {
  loading.value = true
  items.value = await getCheckItems()
  loading.value = false
}
onMounted(load)

function openCreate() {
  selected.value = null
  const nextOrder = items.value.length > 0 ? Math.max(...items.value.map(i => i.order)) + 1 : 1
  form.value = { name: '', answerType: 'YES_NO', order: nextOrder }
  dialog.value = true
}

function openEdit(item: CheckItem) {
  selected.value = item
  form.value = { name: item.name, answerType: item.answerType, order: item.order }
  dialog.value = true
}

function openDelete(item: CheckItem) { selected.value = item; delDialog.value = true }

async function save() {
  saving.value = true
  try {
    if (selected.value) {
      await updateCheckItem(selected.value.id, form.value)
    } else {
      await createCheckItem(form.value)
    }
    dialog.value = false
    await load()
  } finally { saving.value = false }
}

async function confirmDelete() {
  if (!selected.value) return
  await deleteCheckItem(selected.value.id)
  delDialog.value = false
  await load()
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Check Items</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Item</v-btn>
    </div>

    <v-alert type="info" density="compact" variant="tonal" class="mb-4">
      This is the global list of check items. Use <strong>Room Checklist</strong> to configure which items apply to each room.
    </v-alert>

    <v-data-table :headers="headers" :items="items" :loading="loading" hover :sort-by="[{ key: 'order', order: 'asc' }]">
      <template #item.answerType="{ item }">
        <v-chip :color="typeColor[item.answerType]" size="small">{{ item.answerType }}</v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
      </template>
    </v-data-table>

    <!-- Add/Edit dialog -->
    <v-dialog v-model="dialog" max-width="440">
      <v-card :title="selected ? 'Edit Check Item' : 'Add Check Item'">
        <v-card-text class="d-flex flex-column gap-2">
          <v-text-field v-model="form.name" label="Name" required />
          <v-select v-model="form.answerType" :items="answerTypes" item-title="title" item-value="value" label="Answer Type" />
          <v-text-field v-model.number="form.order" label="Order" type="number" hint="Lower numbers appear first" />
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
      <v-card title="Delete Check Item">
        <v-card-text>
          Delete <strong>{{ selected?.name }}</strong>? It will be removed from all room checklists and any saved answers will be lost.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="delDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AppLayout>
</template>
