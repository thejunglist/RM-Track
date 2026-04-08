import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 12

async function main() {
  console.log('Seeding database...')

  // Wipe existing data in safe order (children before parents)
  await prisma.checkAnswer.deleteMany()
  await prisma.monthlyCheck.deleteMany()
  await prisma.roomAssignment.deleteMany()
  await prisma.question.deleteMany()
  await prisma.equipment.deleteMany()
  await prisma.room.deleteMany()
  await prisma.building.deleteMany()
  await prisma.user.deleteMany()

  // ── Users ──────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@university.ac.uk' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@university.ac.uk',
      passwordHash: await bcrypt.hash('admin1234', BCRYPT_ROUNDS),
      role: 'ADMIN',
    },
  })

  const techUsers = [
    { name: 'Alex Thompson', email: 'tech1@university.ac.uk' },
    { name: 'Jamie Reid',    email: 'tech2@university.ac.uk' },
    { name: 'Sam Patterson', email: 'tech3@university.ac.uk' },
  ]

  const techs = []
  for (const t of techUsers) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        name: t.name,
        email: t.email,
        passwordHash: await bcrypt.hash('tech1234', BCRYPT_ROUNDS),
        role: 'TECH',
      },
    })
    techs.push(user)
  }

  // ── Buildings ──────────────────────────────────────────────────────────────
  const buildingData = [
    { id: 1, name: 'Livingstone Tower',      location: '26 Richmond Street, Glasgow' },
    { id: 2, name: 'Graham Hills Building',  location: '40 George Street, Glasgow'   },
    { id: 3, name: 'Royal College Building', location: '204 George Street, Glasgow'  },
  ]

  for (const b of buildingData) {
    await prisma.building.upsert({ where: { id: b.id }, update: {}, create: b })
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const roomData = [
    // Livingstone Tower
    { id: 1,  buildingId: 1, number: 'LT101', floor: '1', name: 'Lecture Theatre 1' },
    { id: 2,  buildingId: 1, number: 'LT102', floor: '1', name: 'Lecture Theatre 2' },
    { id: 3,  buildingId: 1, number: 'LT201', floor: '2', name: 'Seminar Room 1'    },
    { id: 4,  buildingId: 1, number: 'LT202', floor: '2', name: 'Seminar Room 2'    },
    { id: 5,  buildingId: 1, number: 'LT301', floor: '3', name: 'Computer Lab'      },
    // Graham Hills Building
    { id: 6,  buildingId: 2, number: 'GH301', floor: '3', name: 'Lecture Theatre 1' },
    { id: 7,  buildingId: 2, number: 'GH302', floor: '3', name: 'Lecture Theatre 2' },
    { id: 8,  buildingId: 2, number: 'GH401', floor: '4', name: 'Seminar Room 1'    },
    { id: 9,  buildingId: 2, number: 'GH402', floor: '4', name: 'Seminar Room 2'    },
    { id: 10, buildingId: 2, number: 'GH501', floor: '5', name: 'Computer Lab'      },
    // Royal College Building
    { id: 11, buildingId: 3, number: 'RC101', floor: '1', name: 'Lecture Theatre 1' },
    { id: 12, buildingId: 3, number: 'RC102', floor: '1', name: 'Lecture Theatre 2' },
    { id: 13, buildingId: 3, number: 'RC201', floor: '2', name: 'Seminar Room 1'    },
    { id: 14, buildingId: 3, number: 'RC202', floor: '2', name: 'Seminar Room 2'    },
    { id: 15, buildingId: 3, number: 'RC301', floor: '3', name: 'Computer Lab'      },
  ]

  for (const r of roomData) {
    await prisma.room.upsert({ where: { id: r.id }, update: {}, create: r })
  }

  // ── Equipment & Questions ──────────────────────────────────────────────────
  const equipmentTypes = [
    {
      name: 'Ceiling Projector',
      category: 'AV Equipment',
      questions: [
        { text: 'Is the projector powering on correctly?', answerType: 'YES_NO', order: 1 },
        { text: 'Any faults noted?',                       answerType: 'TEXT',   order: 2 },
      ],
    },
    {
      name: 'Projection Screen',
      category: 'AV Equipment',
      questions: [
        { text: 'Is the screen fully extended and undamaged?', answerType: 'YES_NO', order: 1 },
        { text: 'Any faults noted?',                           answerType: 'TEXT',   order: 2 },
      ],
    },
    {
      name: 'Push Button Controller',
      category: 'AV Equipment',
      questions: [
        { text: 'Are all buttons responsive?', answerType: 'YES_NO', order: 1 },
        { text: 'Any faults noted?',           answerType: 'TEXT',   order: 2 },
      ],
    },
  ]

  let equipmentId = 1
  let questionId = 1

  for (const room of roomData) {
    for (const type of equipmentTypes) {
      await prisma.equipment.upsert({
        where: { id: equipmentId },
        update: {},
        create: { id: equipmentId, roomId: room.id, name: type.name, category: type.category },
      })

      for (const q of type.questions) {
        await prisma.question.upsert({
          where: { id: questionId },
          update: {},
          create: { id: questionId, equipmentId, ...q },
        })
        questionId++
      }

      equipmentId++
    }
  }

  // ── Assignments ────────────────────────────────────────────────────────────
  const assignments = [
    { tech: techs[0], buildingId: 1 },  // Alex   → Livingstone Tower
    { tech: techs[1], buildingId: 2 },  // Jamie  → Graham Hills
    { tech: techs[2], buildingId: 3 },  // Sam    → Royal College
  ]

  for (const { tech, buildingId } of assignments) {
    const buildingRooms = roomData.filter(r => r.buildingId === buildingId)
    for (const room of buildingRooms) {
      await prisma.roomAssignment.upsert({
        where: { techId_roomId: { techId: tech.id, roomId: room.id } },
        update: {},
        create: { techId: tech.id, roomId: room.id },
      })
    }
  }

  console.log('Seed complete!')
  console.log('  Admin:  admin@university.ac.uk / admin1234')
  console.log('  Tech 1: tech1@university.ac.uk / tech1234  (Alex Thompson)')
  console.log('  Tech 2: tech2@university.ac.uk / tech1234  (Jamie Reid)')
  console.log('  Tech 3: tech3@university.ac.uk / tech1234  (Sam Patterson)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
