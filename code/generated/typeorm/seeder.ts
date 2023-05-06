import '../alias'
import logger from '@helpers/logger'
import { Seed } from './seed'
import { Seed as RanSeed } from '../entities/seed.entity'
import { AppDataSource } from './datasources'
import { RolesSeeder } from './seeds/roles.seeder'
import { UsersSeeder } from './seeds/users.seeder'

async function seed(...seeds: Seed[]) {
  await AppDataSource.initialize()

  for await (const seeder of seeds) {
    const exists = await RanSeed.count({ where: { name: seeder.name } })

    if (exists == 0) {
      try {
        logger.debug(`Ejecutando ${seeder.name}...`)
        await seeder.seed()
      } catch (error) {
        console.log(error)
        process.exit(1)
      }
    }
  }

  await AppDataSource.destroy()
}

seed(new RolesSeeder(), new UsersSeeder()).catch(console.error)
