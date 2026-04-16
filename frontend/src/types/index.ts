export type Role = 'TECH' | 'ADMIN'
export type AnswerType = 'YES_NO' | 'TEXT' | 'NUMERIC'
export type CheckStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface User {
  id: string   // UUID from Supabase Auth
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
  checkItems?: RoomCheckItem[]
  createdAt: string
}

export interface CheckItem {
  id: number
  name: string
  answerType: AnswerType
  order: number
  isRequired: boolean
  createdAt: string
}

export interface RoomCheckItem {
  id: number
  roomId: number
  checkItemId: number
  checkItem?: CheckItem
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
  techId: string   // UUID
  tech?: { id: string; name: string }
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
  checkItemId: number
  checkItem?: CheckItem
  value: string
  notes?: string
  createdAt: string
}

export interface RoomAssignment {
  id: number
  techId: string   // UUID
  tech?: { id: string; name: string; email: string }
  roomId: number
  room?: Room
  createdAt: string
}
