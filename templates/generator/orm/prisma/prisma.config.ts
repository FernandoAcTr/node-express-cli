import 'dotenv/config'
import { defineConfig, env } from '@prisma/config'

export default defineConfig({
  schema: './src/database/prisma/schema.prisma',
  datasource: {
    url: env('DB_URL'),
  },
  migrations: {
    path: 'src/database/prisma/migrations',
    seed: '__PRISMA_SEED_COMMAND__',
  },
})
