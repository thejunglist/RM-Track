import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },

    // Tech routes
    { path: '/tech/dashboard', component: () => import('../views/tech/TechDashboard.vue'), meta: { role: 'TECH' } },
    { path: '/tech/check/:id', component: () => import('../views/tech/CheckForm.vue'), meta: { role: 'TECH' } },

    // Admin routes
    { path: '/admin/dashboard', component: () => import('../views/admin/AdminDashboard.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/buildings', component: () => import('../views/admin/BuildingsView.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/rooms', component: () => import('../views/admin/RoomsView.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/equipment', component: () => import('../views/admin/EquipmentView.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/questions', component: () => import('../views/admin/QuestionsView.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/users', component: () => import('../views/admin/UsersView.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/assignments', component: () => import('../views/admin/AssignmentsView.vue'), meta: { role: 'ADMIN' } },
    { path: '/admin/reports', component: () => import('../views/admin/ReportsView.vue'), meta: { role: 'ADMIN' } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    await auth.fetchUser()
  }

  if (to.meta.public) return true

  if (!auth.isAuthenticated) return '/login'

  if (to.meta.role === 'ADMIN' && !auth.isAdmin) {
    return auth.isAdmin ? '/admin/dashboard' : '/tech/dashboard'
  }
  if (to.meta.role === 'TECH' && auth.isAdmin) {
    return '/admin/dashboard'
  }

  return true
})

export default router
