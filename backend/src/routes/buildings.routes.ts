import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listBuildings, createBuilding, updateBuilding, deleteBuilding, bulkImportBuildings } from '../controllers/buildings.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listBuildings)
router.post('/bulk', requireRole('ADMIN'), bulkImportBuildings)
router.post('/', requireRole('ADMIN'), createBuilding)
router.put('/:id', requireRole('ADMIN'), updateBuilding)
router.delete('/:id', requireRole('ADMIN'), deleteBuilding)
export default router
