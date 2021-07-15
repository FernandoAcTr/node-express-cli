import { createConnection } from 'typeorm'
import { settings } from '../config/settings'
const { DB } = settings

createConnection({
  type: 'mysql',
  host: DB.HOST,
  port: Number(DB.PORT),
  username: DB.USER,
  password: DB.PASSWORD,
  database: DB.NAME,
  synchronize: false,
  logging: false,
  entities: ['build/entities/*.entity.js'],
})
  .then(() => {
    console.log('Mysql conection is online...')
  })
  .catch(console.log)
