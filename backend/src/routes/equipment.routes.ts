import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listEquipment, createEquipment, updateEquipment, deleteEquipment, bulkImportEquipment } from '../controllers/equipment.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listEquipment)
router.post('/bulk', requireRole('ADMIN'), bulkImportEquipment)
router.post('/', requireRole('ADMIN'), createEquipment)
router.put('/:id', requireRole('ADMIN'), updateEquipment)
router.delete('/:id', requireRole('ADMIN'), deleteEquipment)
export default router
