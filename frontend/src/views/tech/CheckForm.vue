<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../../components/AppLayout.vue'
import { getCheck, startCheck, saveAnswers, completeCheck } from '../../api/checks'
import type { MonthlyCheck, CheckItem } from '../../types'

const route = useRoute()
const router = useRouter()

const check = ref<MonthlyCheck | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')

interface AnswerEntry { value: string; notes: string }
const answers = ref<Record<number, AnswerEntry>>({})

function getAnswer(checkItemId: number): AnswerEntry {
  if (!answers.value[checkItemId]) {
    answers.value[checkItemId] = { value: '', notes: '' }
  }
  return answers.value[checkItemId]!
}

// Sorted check items for this room
const checkItems = computed<CheckItem[]>(() => {
  const roomItems = check.value?.room?.checkItems ?? []
  return roomItems
    .map(rci => rci.checkItem)
    .filter((ci): ci is CheckItem => ci !== undefined)
    .sort((a, b) => a.order - b.order)
})

const isCompleted = computed(() => check.value?.status === 'COMPLETED')

onMounted(async () => {
  try {
    const data = await getCheck(Number(route.params.id))
    check.value = data

    // Pre-fill saved answers
    for (const ans of data.answers ?? []) {
      answers.value[ans.checkItemId] = { value: ans.value, notes: ans.notes ?? '' }
    }

    // Default unfilled items
    for (const item of checkItems.value) {
      if (!answers.value[item.id]) {
        answers.value[item.id] = { value: item.answerType === 'YES_NO' ? 'true' : '', notes: '' }
      }
    }

    // Mark as in-progress if still pending
    if (data.status === 'PENDING') {
      await startCheck(data.id)
    }
  } catch {
    error.value = 'Failed to load check.'
  } finally {
    loading.value = false
  }
})

async function finish() {
  // Validate required items
  const missing = checkItems.value.filter(item => {
    if (!item.isRequired) return false
    const val = getAnswer(item.id).value
    return !val || val.trim() === ''
  })
  if (missing.length > 0) {
    error.value = `Please fill in the following required fields: ${missing.map(i => i.name).join(', ')}`
    return
  }

  saving.value = true
  try {
    const payload = checkItems.value.map(item => ({
      checkItemId: item.id,
      value: getAnswer(item.id).value,
      notes: getAnswer(item.id).notes || undefined,
    }))
    await saveAnswers(check.value!.id, payload)
    await completeCheck(check.value!.id)
    router.push('/tech/dashboard')
  } catch {
    error.value = 'Failed to complete check.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="router.push('/tech/dashboard')" />
      <div class="ml-2">
        <h2 class="text-h5 d-inline">{{ check?.room?.number }}<span v-if="check?.room?.name"> — {{ check.room.name }}</span></h2>
        <v-chip class="ml-2" :color="isCompleted ? 'success' : 'info'" size="small">{{ check?.status }}</v-chip>
      </div>
    </div>

    <p v-if="check?.room?.building" class="text-body-2 text-medium-emphasis mb-4">
      {{ check.room.building.name }}
    </p>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-progress-circular v-if="loading" indeterminate class="d-block mx-auto" />

    <v-alert v-if="isCompleted && !loading" type="success" class="mb-4">
      This check has been completed and is locked.
    </v-alert>

    <template v-if="!loading">
      <v-alert v-if="checkItems.length === 0" type="warning" variant="tonal">
        No check items have been configured for this room. An admin needs to set up the checklist in <strong>Room Checklist</strong>.
      </v-alert>

      <v-card v-else flat>
        <v-card-text>
          <div v-for="item in checkItems" :key="item.id" class="mb-5">
            <p class="text-subtitle-1 font-weight-medium mb-2">
              {{ item.name }}
              <span v-if="item.isRequired" class="text-error ml-1" title="Required">*</span>
            </p>

            <v-btn-toggle
              v-if="item.answerType === 'YES_NO'"
              :model-value="getAnswer(item.id).value"
              @update:model-value="(v: string) => getAnswer(item.id).value = v"
              mandatory
              color="primary"
              :disabled="isCompleted"
            >
              <v-btn value="true">Yes</v-btn>
              <v-btn value="false">No</v-btn>
            </v-btn-toggle>

            <v-text-field
              v-else-if="item.answerType === 'NUMERIC'"
              :model-value="getAnswer(item.id).value"
              @update:model-value="(v: string) => getAnswer(item.id).value = v"
              type="number"
              :disabled="isCompleted"
              density="compact"
              style="max-width: 200px"
              hide-details
            />

            <v-textarea
              v-else
              :model-value="getAnswer(item.id).value"
              @update:model-value="(v: string) => getAnswer(item.id).value = v"
              :disabled="isCompleted"
              rows="2"
              auto-grow
              density="compact"
              hide-details
            />

            <v-text-field
              :model-value="getAnswer(item.id).notes"
              @update:model-value="(v: string) => getAnswer(item.id).notes = v"
              label="Notes (optional)"
              density="compact"
              class="mt-2"
              :disabled="isCompleted"
              hide-details
            />

            <v-divider class="mt-4" />
          </div>
        </v-card-text>

        <v-card-actions v-if="!isCompleted" class="px-4 pb-4">
          <v-spacer />
          <v-btn color="success" size="large" :loading="saving" prepend-icon="mdi-check-circle" @click="finish">
            Complete Check
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </AppLayout>
</template>
