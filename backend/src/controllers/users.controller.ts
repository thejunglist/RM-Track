import { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'

const BCRYPT_ROUNDS = 12

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['TECH', 'ADMIN']).default('TECH'),
})

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['TECH', 'ADMIN']).optional(),
})

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { name: 'asc' } })
  res.json(users)
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { password, ...rest } = parsed.data
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  try {
    const user = await prisma.user.create({ data: { ...rest, passwordHash }, select: userSelect })
    res.status(201).json(user)
  } catch {
    res.status(409).json({ error: 'Email already in use' })
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  try {
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data, select: userSelect })
    res.json(user)
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
}
