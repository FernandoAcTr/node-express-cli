import '../alias'
import logger from '@/helpers/logger'
import { Seed } from './seed'
import { Seed as RanSeed } from '../entities/seed.entity'
import { AppDataSource } from './datasources'

async function seed(...seeds: Seed[]) {
  await AppDataSource.initialize()

  for await (const seeder of seeds) {
    const exists = await RanSeed.count({ where: { id: seeder.id } })

    if (exists == 0) {
      try {
        logger.debug(`Running ${seeder.id}...`)
        await seeder.seed()
        await RanSeed.save({ id: seeder.id })
      } catch (error) {
        console.log(error)
        process.exit(1)
      }
    }
  }

  await AppDataSource.destroy()
}

seed().catch(console.error)
