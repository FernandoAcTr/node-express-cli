import { DataSource } from 'typeorm'
import { config } from '@/config'
import migrations from './migrations'
import fs from 'fs'
import path from 'path'

const { DB } = config

function getMigrations() {
  const migrationsDir = `${__dirname}/migrations`
  const files = fs.readdirSync(migrationsDir, { withFileTypes: true })

  const migrations = files.map((f) => (f.isDirectory() ? '' : `${migrationsDir}/${f.name}`)).filter((f) => f !== '')

  return migrations
}

function getEntities() {
  const entitiesDir = path.resolve(__dirname, '../entities')
  const files = fs.readdirSync(entitiesDir, { withFileTypes: true })

  const entities = files
    .map((f) => (f.isDirectory() || !f.name.includes('.entity') ? '' : `${entitiesDir}/${f.name}`))
    .filter((f) => f !== '')

  return entities
}

const migrations = getMigrations()
const entities = getEntities()

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB.HOST,
  port: Number(DB.PORT),
  username: DB.USER,
  password: DB.PASSWORD,
  database: DB.NAME,
  synchronize: false,
  logging: false,
  entities: entities,
  migrations: migrations,
})
