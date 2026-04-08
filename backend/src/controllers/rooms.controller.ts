import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const roomSchema = z.object({
  buildingId: z.number().int().positive(),
  number: z.string().min(1),
  floor: z.string().optional(),
  name: z.string().optional(),
})

export async function listRooms(req: Request, res: Response): Promise<void> {
  const buildingId = req.query.buildingId ? Number(req.query.buildingId) : undefined
  const rooms = await prisma.room.findMany({
    where: buildingId ? { buildingId } : undefined,
    include: { building: { select: { name: true } } },
    orderBy: { number: 'asc' },
  })
  res.json(rooms)
}

export async function getRoom(req: Request, res: Response): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: Number(req.params.id) },
    include: { building: true, equipment: { include: { questions: { orderBy: { order: 'asc' } } } } },
  })
  if (!room) { res.status(404).json({ error: 'Room not found' }); return }
  res.json(room)
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const parsed = roomSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const room = await prisma.room.create({ data: parsed.data })
  res.status(201).json(room)
}

export async function updateRoom(req: Request, res: Response): Promise<void> {
  const parsed = roomSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const room = await prisma.room.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(room)
  } catch {
    res.status(404).json({ error: 'Room not found' })
  }
}

export async function deleteRoom(req: Request, res: Response): Promise<void> {
  try {
    await prisma.room.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Room not found' })
  }
}

const bulkRoomSchema = z.array(
  z.object({
    buildingId: z.number().int().positive(),
    number: z.string().min(1),
  })
).min(1).max(1000)

export async function bulkImportRooms(req: Request, res: Response): Promise<void> {
  const parsed = bulkRoomSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const result = await prisma.room.createMany({
    data: parsed.data,
    skipDuplicates: true,
  })

  res.status(201).json({ imported: result.count, skipped: parsed.data.length - result.count })
}
