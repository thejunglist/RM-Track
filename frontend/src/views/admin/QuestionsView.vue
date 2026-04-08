<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from '../../api/questions'
import { getEquipment } from '../../api/equipment'
import type { Question, Equipment } from '../../types'

const questions = ref<Question[]>([])
const equipment = ref<Equipment[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const selected = ref<Question | null>(null)
const form = ref({ equipmentId: 0, text: '', answerType: 'YES_NO', order: 0 })

const answerTypes = ['YES_NO', 'TEXT', 'NUMERIC']

const headers = [
  { title: 'Question', key: 'text' },
  { title: 'Type', key: 'answerType' },
  { title: 'Order', key: 'order' },
  { title: 'Equipment', key: 'equipmentId' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

function equipLabel(id: number) {
  return equipment.value.find(e => e.id === id)?.name ?? id
}

async function load() {
  loading.value = true
  ;[questions.value, equipment.value] = await Promise.all([getQuestions(), getEquipment()])
  loading.value = false
}
onMounted(load)

function openCreate() {
  selected.value = null
  form.value = { equipmentId: equipment.value[0]?.id ?? 0, text: '', answerType: 'YES_NO', order: 0 }
  dialog.value = true
}
function openEdit(q: Question) {
  selected.value = q
  form.value = { equipmentId: q.equipmentId, text: q.text, answerType: q.answerType, order: q.order }
  dialog.value = true
}
function openDelete(q: Question) { selected.value = q; delDialog.value = true }

async function save() {
  saving.value = true
  try {
    if (selected.value) await updateQuestion(selected.value.id, form.value)
    else await createQuestion(form.value)
    dialog.value = false
    await load()
  } finally { saving.value = false }
}
async function confirmDelete() {
  if (!selected.value) return
  await deleteQuestion(selected.value.id)
  delDialog.value = false
  await load()
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Questions</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Question</v-btn>
    </div>

    <v-data-table :headers="headers" :items="questions" :loading="loading" hover>
      <template #item.equipmentId="{ item }">{{ equipLabel(item.equipmentId) }}</template>
      <template #item.answerType="{ item }">
        <v-chip size="small">{{ item.answerType }}</v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="520">
      <v-card :title="selected ? 'Edit Question' : 'Add Question'">
        <v-card-text class="d-flex flex-column gap-2">
          <v-select v-model="form.equipmentId" :items="equipment.map(e => ({ title: e.name, value: e.id }))" item-title="title" item-value="value" label="Equipment" required />
          <v-textarea v-model="form.text" label="Question Text" rows="2" required />
          <v-select v-model="form.answerType" :items="answerTypes" label="Answer Type" required />
          <v-text-field v-model.number="form.order" label="Order" type="number" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="delDialog" max-width="400">
      <v-card title="Delete Question">
        <v-card-text>Delete this question? Existing check answers for it will also be removed.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="delDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AppLayout>
</template>
