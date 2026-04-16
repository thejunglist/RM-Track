<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppLayout from '../../components/AppLayout.vue'
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users'
import type { User } from '../../types'

const users = ref<User[]>([])
const loading = ref(true)
const dialog = ref(false)
const delDialog = ref(false)
const saving = ref(false)
const saveError = ref('')
const selected = ref<User | null>(null)
const form = ref({ name: '', email: '', password: '', role: 'TECH' })
const showPassword = ref(false)

const roles = ['TECH', 'ADMIN']
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'role' },
  { title: 'Created', key: 'createdAt' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const },
]

async function load() {
  loading.value = true
  users.value = await getUsers()
  loading.value = false
}
onMounted(load)

function openCreate() {
  selected.value = null
  form.value = { name: '', email: '', password: '', role: 'TECH' }
  dialog.value = true
}
function openEdit(u: User) {
  selected.value = u
  form.value = { name: u.name, email: u.email, password: '', role: u.role }
  dialog.value = true
}
function openDelete(u: User) { selected.value = u; delDialog.value = true }

async function save() {
  saving.value = true
  saveError.value = ''
  try {
    if (selected.value) {
      const data: Record<string, string> = { name: form.value.name, email: form.value.email, role: form.value.role }
      if (form.value.password) data.password = form.value.password
      await updateUser(selected.value.id, data)
    } else {
      await createUser({
        name: form.value.name,
        email: form.value.email,
        role: form.value.role,
        password: form.value.password || undefined,
      })
    }
    dialog.value = false
    await load()
  } catch (e: unknown) {
    saveError.value = e instanceof Error ? e.message : 'An unknown error occurred'
  } finally { saving.value = false }
}

async function confirmDelete() {
  if (!selected.value) return
  await deleteUser(selected.value.id)
  delDialog.value = false
  await load()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString()
}
</script>

<template>
  <AppLayout>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">Users</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add User</v-btn>
    </div>

    <v-data-table :headers="headers" :items="users" :loading="loading" hover>
      <template #item.role="{ item }">
        <v-chip :color="item.role === 'ADMIN' ? 'primary' : 'default'" size="small">{{ item.role }}</v-chip>
      </template>
      <template #item.createdAt="{ item }">{{ formatDate(item.createdAt) }}</template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="480">
      <v-card :title="selected ? 'Edit User' : 'Add User'">
        <v-card-text class="d-flex flex-column gap-2">
          <v-alert v-if="saveError" type="error" density="compact">{{ saveError }}</v-alert>
          <v-text-field v-model="form.name" label="Full Name" required />
          <v-text-field v-model="form.email" label="Email" type="email" required />
          <v-text-field
            v-model="form.password"
            :label="selected ? 'New Password (leave blank to keep current)' : 'Password (leave blank to send invite email)'"
            :type="showPassword ? 'text' : 'password'"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
          />
          <v-alert v-if="!selected && !form.password" type="info" density="compact" variant="tonal">
            No password set — an invite email will be sent so the user can set their own password.
          </v-alert>
          <v-select v-model="form.role" :items="roles" label="Role" required />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">
            {{ selected ? 'Save' : (form.password ? 'Create User' : 'Send Invite') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="delDialog" max-width="400">
      <v-card title="Delete User">
        <v-card-text>Delete user <strong>{{ selected?.name }}</strong>?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="delDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </AppLayout>
</template>
