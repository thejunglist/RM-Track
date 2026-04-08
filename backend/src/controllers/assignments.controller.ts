import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const assignSchema = z.object({
  techId: z.number().int().positive(),
  roomId: z.number().int().positive(),
})

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const { userId, role } = req.user!
  // TECH can only see their own assignments — ignore any techId query param
  const techId = role === 'ADMIN'
    ? (req.query.techId ? Number(req.query.techId) : undefined)
    : userId
  const roomId = req.query.roomId ? Number(req.query.roomId) : undefined
  const assignments = await prisma.roomAssignment.findMany({
    where: { ...(techId && { techId }), ...(roomId && { roomId }) },
    include: {
      tech: { select: { id: true, name: true, email: true } },
      room: { include: { building: { select: { name: true } } } },
    },
  })
  res.json(assignments)
}

export async function createAssignment(req: Request, res: Response): Promise<void> {
  const parsed = assignSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const assignment = await prisma.roomAssignment.create({
      data: parsed.data,
      include: {
        tech: { select: { id: true, name: true } },
        room: { include: { building: { select: { name: true } } } },
      },
    })
    res.status(201).json(assignment)
  } catch {
    res.status(409).json({ error: 'Assignment already exists' })
  }
}

export async function deleteAssignment(req: Request, res: Response): Promise<void> {
  try {
    await prisma.roomAssignment.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Assignment not found' })
  }
}
