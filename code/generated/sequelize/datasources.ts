import { Sequelize } from 'sequelize'
import { settings } from '@config/settings'

const { DB } = settings

export const sequelize = new Sequelize({
  dialect: 'mysql',
  port: Number(DB.PORT),
  username: DB.USER,
  password: DB.PASSWORD,
  database: DB.NAME,
  logging: false,
})
