<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
import { getCheck, saveAnswers, completeCheck } from '../../api/checks'
import type { MonthlyCheck, Equipment } from '../../types'

const route = useRoute()
const router = useRouter()

const check = ref<MonthlyCheck | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const step = ref(1)

interface AnswerEntry { value: string; notes: string }
const answers = ref<Record<number, AnswerEntry>>({})

function getAnswer(questionId: number): AnswerEntry {
  if (!answers.value[questionId]) {
    answers.value[questionId] = { value: '', notes: '' }
  }
  return answers.value[questionId]
}

onMounted(async () => {
  try {
    const data = await getCheck(Number(route.params.id))
    check.value = data
    for (const ans of data.answers ?? []) {
      answers.value[ans.questionId] = { value: ans.value, notes: ans.notes ?? '' }
    }
    for (const eq of data.room?.equipment ?? []) {
      for (const q of eq.questions ?? []) {
        if (!answers.value[q.id]) {
          answers.value[q.id] = { value: q.answerType === 'YES_NO' ? 'true' : '', notes: '' }
        }
      }
    }
  } catch {
    error.value = 'Failed to load check'
  } finally {
    loading.value = false
  }
})

const equipment = computed(() => check.value?.room?.equipment ?? [])
const isCompleted = computed(() => check.value?.status === 'COMPLETED')

async function saveStep(eq: Equipment) {
  saving.value = true
  const payload = (eq.questions ?? []).map(q => ({
    questionId: q.id,
    value: getAnswer(q.id).value,
    notes: getAnswer(q.id).notes || undefined,
  }))
  try {
    await saveAnswers(check.value!.id, payload)
  } catch {
    error.value = 'Failed to save answers'
  } finally {
    saving.value = false
  }
}

async function nextStep(eq: Equipment) {
  await saveStep(eq)
  step.value++
}

async function finish() {
  saving.value = true
  try {
    const lastEq = equipment.value[step.value - 1]
    if (lastEq) await saveStep(lastEq)
    await completeCheck(check.value!.id)
    router.push('/tech/dashboard')
  } catch {
    error.value = 'Failed to complete check'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="router.push('/tech/dashboard')" />
      <h2 class="text-h5 ml-2">
        {{ check?.room?.number }} — {{ check?.room?.name }}
        <v-chip class="ml-2" :color="check?.status === 'COMPLETED' ? 'success' : 'info'" size="small">
          {{ check?.status }}
        </v-chip>
      </h2>
    </div>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-progress-circular v-if="loading" indeterminate class="d-block mx-auto" />

    <v-alert v-if="isCompleted && !loading" type="success" class="mb-4">
      This check has been completed and is locked.
    </v-alert>

    <v-stepper v-else-if="!loading" v-model="step" :items="equipment.map(e => e.name)" flat>
      <template v-for="(eq, idx) in equipment" :key="eq.id" #[`item.${idx+1}`]>
        <v-card flat>
          <v-card-subtitle class="mb-3">{{ eq.category }}</v-card-subtitle>

          <div v-for="q in eq.questions" :key="q.id" class="mb-4">
            <p class="text-subtitle-2 mb-2">{{ q.text }}</p>

            <v-btn-toggle
              v-if="q.answerType === 'YES_NO'"
              :model-value="getAnswer(q.id).value"
              @update:model-value="(v: string) => getAnswer(q.id).value = v"
              mandatory
              color="primary"
              :disabled="isCompleted"
            >
              <v-btn value="true">Yes</v-btn>
              <v-btn value="false">No</v-btn>
            </v-btn-toggle>

            <v-text-field
              v-else-if="q.answerType === 'NUMERIC'"
              :model-value="getAnswer(q.id).value"
              @update:model-value="(v: string) => getAnswer(q.id).value = v"
              type="number"
              :disabled="isCompleted"
              density="compact"
              style="max-width:200px"
            />

            <v-textarea
              v-else
              :model-value="getAnswer(q.id).value"
              @update:model-value="(v: string) => getAnswer(q.id).value = v"
              :disabled="isCompleted"
              rows="2"
              auto-grow
              density="compact"
            />

            <v-text-field
              :model-value="getAnswer(q.id).notes"
              @update:model-value="(v: string) => getAnswer(q.id).notes = v"
              label="Notes (optional)"
              density="compact"
              class="mt-2"
              :disabled="isCompleted"
            />
          </div>

          <div class="d-flex gap-3 mt-4">
            <v-btn v-if="idx > 0" variant="outlined" @click="step--">Back</v-btn>
            <v-btn
              v-if="idx < equipment.length - 1"
              color="primary"
              :loading="saving"
              @click="nextStep(eq)"
            >
              Save &amp; Next
            </v-btn>
            <v-btn v-else color="success" :loading="saving" @click="finish">
              Complete Check
            </v-btn>
          </div>
        </v-card>
      </template>
    </v-stepper>
  </AppLayout>
</template>
