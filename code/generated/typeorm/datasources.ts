import { DataSource } from 'typeorm'
import { settings } from '@config/settings'
import path from 'path'

const { DB } = settings

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB.HOST,
  port: Number(DB.PORT),
  username: DB.USER,
  password: DB.PASSWORD,
  database: DB.NAME,
  synchronize: false,
  logging: false,
  entities: [path.resolve(__dirname, '..') + '/entities/*.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
})
