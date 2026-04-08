import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const VALID_TYPES = ['YES_NO', 'TEXT', 'NUMERIC'] as const
const questionSchema = z.object({
  equipmentId: z.number().int().positive(),
  text: z.string().min(1),
  answerType: z.enum(VALID_TYPES),
  order: z.number().int().optional().default(0),
})

export async function listQuestions(req: Request, res: Response): Promise<void> {
  const equipmentId = req.query.equipmentId ? Number(req.query.equipmentId) : undefined
  const questions = await prisma.question.findMany({
    where: equipmentId ? { equipmentId } : undefined,
    orderBy: { order: 'asc' },
  })
  res.json(questions)
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  const parsed = questionSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const q = await prisma.question.create({ data: parsed.data })
  res.status(201).json(q)
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  const parsed = questionSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const q = await prisma.question.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(q)
  } catch {
    res.status(404).json({ error: 'Question not found' })
  }
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  try {
    await prisma.question.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Question not found' })
  }
}
