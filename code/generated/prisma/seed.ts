import { PrismaClient } from '@prisma/client'

export interface Seed {
  id: string
  seed(prisma: PrismaClient): Promise<void>
}
