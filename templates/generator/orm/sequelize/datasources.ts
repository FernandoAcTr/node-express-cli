import { Sequelize } from 'sequelize'
import { config } from '@/config'

const { DB } = config

export const sequelize = new Sequelize({
  dialect: 'mysql',
  port: Number(DB.PORT),
  username: DB.USER,
  password: DB.PASSWORD,
  database: DB.NAME,
  logging: false,
})
