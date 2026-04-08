import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listRooms, getRoom, createRoom, updateRoom, deleteRoom, bulkImportRooms } from '../controllers/rooms.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listRooms)
router.get('/:id', getRoom)
router.post('/bulk', requireRole('ADMIN'), bulkImportRooms)
router.post('/', requireRole('ADMIN'), createRoom)
router.put('/:id', requireRole('ADMIN'), updateRoom)
router.delete('/:id', requireRole('ADMIN'), deleteRoom)
export default router
