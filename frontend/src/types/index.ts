export type Role = 'TECH' | 'ADMIN'
export type AnswerType = 'YES_NO' | 'TEXT' | 'NUMERIC'
export type CheckStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface Building {
  id: number
  name: string
  location?: string
  createdAt: string
}

export interface Room {
  id: number
  buildingId: number
  building?: { name: string }
  number: string
  floor?: string
  name?: string
  equipment?: Equipment[]
  createdAt: string
}

export interface Equipment {
  id: number
  roomId: number
  name: string
  category?: string
  assetTag?: string
  questions?: Question[]
  createdAt: string
}

export interface Question {
  id: number
  equipmentId: number
  text: string
  answerType: AnswerType
  order: number
  createdAt: string
}

export interface MonthlyCheck {
  id: number
  roomId: number
  room?: Room
  techId: number
  tech?: { id: number; name: string }
  month: number
  year: number
  status: CheckStatus
  completedAt?: string
  answers?: CheckAnswer[]
  createdAt: string
}

export interface CheckAnswer {
  id: number
  checkId: number
  questionId: number
  question?: Question
  value: string
  notes?: string
  createdAt: string
}

export interface RoomAssignment {
  id: number
  techId: number
  tech?: { id: number; name: string; email: string }
  roomId: number
  room?: Room
  createdAt: string
}
