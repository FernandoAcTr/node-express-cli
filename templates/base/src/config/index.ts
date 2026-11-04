import dotenv from 'dotenv'
import fs from 'fs'

if (fs.existsSync('.env')) {
  dotenv.config()
}

export const config = Object.freeze({
  PORT: process.env.PORT || 3000,
  SECRET: process.env.SECRET || 'somesecrettoken',
  // @nec:config
})
