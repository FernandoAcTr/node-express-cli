import '../alias'
import logger from '@helpers/logger'
import { Seed } from './seed'
import { Seed as RanSeed } from '../entities/seed.entity'
import { AppDataSource } from './datasources'

async function seed(...seeds: Seed[]) {
  await AppDataSource.initialize()

  for await (const seeder of seeds) {
    const exists = await RanSeed.count({ where: { name: seeder.name } })

    if (exists == 0) {
      try {
        logger.debug(`Running ${seeder.name}...`)
        await seeder.seed()
        await RanSeed.save({ name: seeder.name })
      } catch (error) {
        console.log(error)
        process.exit(1)
      }
    }
  }

  await AppDataSource.destroy()
}

seed().catch(console.error)
