import dotenv from 'dotenv'
import dotenvParseVariables from 'dotenv-parse-variables'

let env: any = dotenv.config()
if (env.error) throw env.error
env = dotenvParseVariables(env.parsed!)

export const settings = {
  PORT: env.PORT || 3000,
  SECRET: env.SECRET || 'somesecrettoken',
  DB: {
    USER: env.DB_USER,
    PASSWORD: env.DB_PASSWORD,
    HOST: env.DB_HOST,
    PORT: env.DB_PORT,
    NAME: env.DB_NAME,
    URI: env.DB_URI,
  },
}
