import { DataSource } from 'typeorm'
import { config } from '@/config'
import migrations from './migrations'

const { DB } = config

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB.HOST,
  port: Number(DB.PORT),
  username: DB.USER,
  password: DB.PASSWORD,
  database: DB.NAME,
  synchronize: false,
  logging: false,
  entities: [],
  migrations: migrations,
})
