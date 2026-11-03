export enum DbType {
  MONGO = 'mongoose',
  TYPEORM = 'typeorm',
  SEQUELIZE = 'sequelize',
  PRISMA = 'prisma',
}

export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
}

/** Features que se registran en `cli.config.json` después de instalarse. */
export type Feature = 'orm' | 'auth' | 'push' | 'socket' | 'mailer' | 'tests' | 'prettier' | 'eslint'

export type Config = {
  orm?: DbType
  fileBasedRouting: boolean
  package_manger: PackageManager
  /** Versión del CLI que escribió el archivo. */
  version?: string
  /** Features ya instaladas; permite repetir comandos sin duplicar trabajo. */
  features: string[]
}
