import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth.routes.js'
import buildingsRoutes from './routes/buildings.routes.js'
import roomsRoutes from './routes/rooms.routes.js'
import equipmentRoutes from './routes/equipment.routes.js'
import questionsRoutes from './routes/questions.routes.js'
import usersRoutes from './routes/users.routes.js'
import checksRoutes from './routes/checks.routes.js'
import reportsRoutes from './routes/reports.routes.js'
import assignmentsRoutes from './routes/assignments.routes.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/buildings', buildingsRoutes)
app.use('/api/rooms', roomsRoutes)
app.use('/api/equipment', equipmentRoutes)
app.use('/api/questions', questionsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/checks', checksRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/assignments', assignmentsRoutes)

const PORT = Number(process.env.PORT ?? 3000)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
