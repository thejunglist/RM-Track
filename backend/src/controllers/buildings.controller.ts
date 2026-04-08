import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const buildingSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
})

export async function listBuildings(_req: Request, res: Response): Promise<void> {
  const buildings = await prisma.building.findMany({ orderBy: { name: 'asc' } })
  res.json(buildings)
}

export async function createBuilding(req: Request, res: Response): Promise<void> {
  const parsed = buildingSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const building = await prisma.building.create({ data: parsed.data })
  res.status(201).json(building)
}

export async function updateBuilding(req: Request, res: Response): Promise<void> {
  const parsed = buildingSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const building = await prisma.building.update({ where: { id: Number(req.params.id) }, data: parsed.data })
    res.json(building)
  } catch {
    res.status(404).json({ error: 'Building not found' })
  }
}

export async function deleteBuilding(req: Request, res: Response): Promise<void> {
  try {
    await prisma.building.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'Building not found' })
  }
}

const bulkBuildingSchema = z.array(z.object({ name: z.string().min(1) })).min(1).max(200)

export async function bulkImportBuildings(req: Request, res: Response): Promise<void> {
  const parsed = bulkBuildingSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const existing = await prisma.building.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map(b => b.name.toLowerCase()))

  const toCreate = parsed.data.filter(b => !existingNames.has(b.name.toLowerCase()))
  if (toCreate.length > 0) {
    await prisma.building.createMany({ data: toCreate })
  }

  res.status(201).json({ imported: toCreate.length, skipped: parsed.data.length - toCreate.length })
}
