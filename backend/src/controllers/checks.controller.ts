import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const createCheckSchema = z.object({
  roomId: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
})

const answerSchema = z.object({
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    value: z.string(),
    notes: z.string().optional(),
  })),
})

export async function listChecks(req: Request, res: Response): Promise<void> {
  const { userId, role } = req.user!
  const checks = await prisma.monthlyCheck.findMany({
    where: role === 'ADMIN' ? undefined : { techId: userId },
    include: {
      room: { include: { building: { select: { name: true } } } },
      tech: { select: { id: true, name: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  res.json(checks)
}

export async function getCheck(req: Request, res: Response): Promise<void> {
  const { userId, role } = req.user!
  const check = await prisma.monthlyCheck.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      room: { include: { building: true, equipment: { include: { questions: { orderBy: { order: 'asc' } } } } } },
      tech: { select: { id: true, name: true } },
      answers: { include: { question: true } },
    },
  })
  if (!check) { res.status(404).json({ error: 'Check not found' }); return }
  if (role !== 'ADMIN' && check.techId !== userId) { res.status(403).json({ error: 'Forbidden' }); return }
  res.json(check)
}

export async function createCheck(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  const parsed = createCheckSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { roomId, month, year } = parsed.data

  // Verify assignment
  const assignment = await prisma.roomAssignment.findUnique({ where: { techId_roomId: { techId: userId, roomId } } })
  if (!assignment) { res.status(403).json({ error: 'You are not assigned to this room' }); return }

  try {
    const check = await prisma.monthlyCheck.create({
      data: { roomId, techId: userId, month, year, status: 'IN_PROGRESS' },
    })
    res.status(201).json(check)
  } catch {
    // Unique constraint violation = check already exists for this room/month/year
    const existing = await prisma.monthlyCheck.findUnique({ where: { roomId_month_year: { roomId, month, year } } })
    res.status(409).json({ error: 'Check already exists for this room and period', existing })
  }
}

export async function saveAnswers(req: Request, res: Response): Promise<void> {
  const { userId, role } = req.user!
  const check = await prisma.monthlyCheck.findUnique({ where: { id: Number(req.params.id) } })
  if (!check) { res.status(404).json({ error: 'Check not found' }); return }
  if (role !== 'ADMIN' && check.techId !== userId) { res.status(403).json({ error: 'Forbidden' }); return }
  if (check.status === 'COMPLETED') { res.status(409).json({ error: 'Check is already completed and cannot be modified' }); return }

  const parsed = answerSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const upserts = parsed.data.answers.map(a =>
    prisma.checkAnswer.upsert({
      where: { checkId_questionId: { checkId: check.id, questionId: a.questionId } },
      create: { checkId: check.id, questionId: a.questionId, value: a.value, notes: a.notes },
      update: { value: a.value, notes: a.notes },
    })
  )
  await prisma.$transaction(upserts)
  res.json({ message: 'Answers saved' })
}

export async function completeCheck(req: Request, res: Response): Promise<void> {
  const { userId, role } = req.user!
  const check = await prisma.monthlyCheck.findUnique({ where: { id: Number(req.params.id) } })
  if (!check) { res.status(404).json({ error: 'Check not found' }); return }
  if (role !== 'ADMIN' && check.techId !== userId) { res.status(403).json({ error: 'Forbidden' }); return }
  if (check.status === 'COMPLETED') { res.status(409).json({ error: 'Check is already completed' }); return }

  const updated = await prisma.monthlyCheck.update({
    where: { id: check.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
  res.json(updated)
}
