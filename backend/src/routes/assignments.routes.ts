import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listAssignments, createAssignment, deleteAssignment } from '../controllers/assignments.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listAssignments)
router.post('/', requireRole('ADMIN'), createAssignment)
router.delete('/:id', requireRole('ADMIN'), deleteAssignment)
export default router
