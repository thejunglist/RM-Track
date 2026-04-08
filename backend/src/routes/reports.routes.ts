import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { monthlyReport } from '../controllers/reports.controller.js'

const router = Router()
router.use(authenticate, requireRole('ADMIN'))
router.get('/monthly', monthlyReport)
export default router
