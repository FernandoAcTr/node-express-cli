import { Seed } from './seed'

async function seed(...seeds: Seed[]) {
  for await (const seeder of seeds) {
    console.log(`Seeding ${seeder.id}`)
    try {
      await seeder.seed()
    } catch (error) {
      console.log(error)
    }
  }
}

seed()
  .then(async () => {
    console.log('Seeding completed')
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
