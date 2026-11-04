import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { config } from '@/config'
import { PrismaClient } from './prisma/generated/client'

const adapter = new PrismaMariaDb({
  host: config.DB.HOST!,
  port: Number(config.DB.PORT),
  user: config.DB.USER!,
  password: config.DB.PASSWORD!,
  database: config.DB.NAME!,
  connectionLimit: 5,
})

const prisma = new PrismaClient({ adapter })

export { prisma }
