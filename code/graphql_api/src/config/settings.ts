import dotenv from 'dotenv'
import fs from 'fs'

if (fs.existsSync('.env')) {
  dotenv.config()
}

export const settings = {
  ENV: process.env.ENV || 'develop',
  PORT: process.env.PORT || 3000,
  SECRET: process.env.SECRET || 'somesecrettoken',
  DB: {
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    NAME: process.env.DB_NAME,
    URI: process.env.DB_URI,
  },
  MAILER: {
    HOST: process.env.MAIL_HOST,
    PORT: process.env.MAIL_PORT,
    USERNAME: process.env.MAIL_USERNAME,
    PASSWORD: process.env.MAIL_PASSWORD,
    FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS,
    FROM_NAME: process.env.MAIL_FROM_NAME,
  },
}
