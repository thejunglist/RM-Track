import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listChecks, getCheck, createCheck, saveAnswers, completeCheck } from '../controllers/checks.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listChecks)
router.post('/', requireRole('TECH'), createCheck)
router.get('/:id', getCheck)
router.put('/:id/answer', requireRole('TECH'), saveAnswers)
router.put('/:id/complete', requireRole('TECH'), completeCheck)
export default router
