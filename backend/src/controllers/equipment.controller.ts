import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const equipmentSchema = z.object({
  roomId: z.number().int().positive(),
  name: z.string().min(1),
  category: z.string().optional(),
})

export async function listEquipment(req: Request, res: Response): Promise<void> {
  const roomId = req.query.roomId ? Number(req.query.roomId) : undefined
  const equipment = await prisma.equipment.findMany({
    where: roomId ? { roomId } : undefined,
    orderBy: { name: 'asc' },
  })
  res.json(equipment)
}

export async function createEquipment(req: Request, res: Response): Promise<void> {
  const parsed = equipmentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const eq = await prisma.equipment.create({ data: parsed.data })
  res.status(201).json(eq)
}

export async function updateEquipment(req: Request, res: Response): Promise<void> {
  const parsed = equipmentSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const eq = await prisma.equipment.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(eq)
  } catch {
    res.status(404).json({ error: 'Equipment not found' })
  }
}

export async function deleteEquipment(req: Request, res: Response): Promise<void> {
  try {
    await prisma.equipment.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Equipment not found' })
  }
}

const bulkImportSchema = z.array(
  z.object({
    roomId: z.number().int().positive(),
    name: z.string().min(1),
    category: z.string().optional(),
    assetTag: z.string().optional(),
  })
).min(1).max(500)

export async function bulkImportEquipment(req: Request, res: Response): Promise<void> {
  const parsed = bulkImportSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const result = await prisma.equipment.createMany({
    data: parsed.data,
    skipDuplicates: true,
  })

  res.status(201).json({ imported: result.count, skipped: parsed.data.length - result.count })
}
