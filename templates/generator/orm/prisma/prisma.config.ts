import 'dotenv/config'
import { defineConfig } from '@prisma/config'

export default defineConfig({
  schema: './src/database/prisma/schema.prisma',
  migrations: {
    path: 'src/database/prisma/migrations',
    seed: '__PRISMA_SEED_COMMAND__',
  },
})
