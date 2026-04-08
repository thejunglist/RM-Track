import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.middleware.js'
import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from '../controllers/questions.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listQuestions)
router.post('/', requireRole('ADMIN'), createQuestion)
router.put('/:id', requireRole('ADMIN'), updateQuestion)
router.delete('/:id', requireRole('ADMIN'), deleteQuestion)
export default router
