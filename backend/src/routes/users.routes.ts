import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/users.controller.js'

const router = Router()
router.use(authenticate, requireRole('ADMIN'))
router.get('/', listUsers)
router.post('/', createUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)
export default router
