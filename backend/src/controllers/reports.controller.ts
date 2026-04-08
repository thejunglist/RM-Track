import { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const reportQuery = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
})

export async function monthlyReport(req: Request, res: Response): Promise<void> {
  const parsed = reportQuery.safeParse(req.query)
  if (!parsed.success) { res.status(400).json({ error: 'Provide valid month and year query params' }); return }
  const { month, year } = parsed.data

  const buildings = await prisma.building.findMany({
    include: {
      rooms: {
        include: {
          checks: {
            where: { month, year },
            select: { id: true, status: true, completedAt: true, tech: { select: { name: true } } },
          },
        },
        orderBy: { number: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  res.json({ month, year, buildings })
}
