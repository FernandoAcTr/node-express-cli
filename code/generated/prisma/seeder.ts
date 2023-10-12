import { PrismaClient } from '@prisma/client'
import { Seed } from './seed'

const prisma = new PrismaClient()

async function seed(...seeds: Seed[]) {
  for await (const seeder of seeds) {
    const exists = await prisma.seed.count({ where: { id: seeder.id } })
    if (exists == 0) {
      console.log(`Seeding ${seeder.id}`)
      try {
        await seeder.seed(prisma)
        await prisma.seed.create({ data: { id: seeder.id } })
      } catch (error) {
        console.log(error)
      }
    }
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
