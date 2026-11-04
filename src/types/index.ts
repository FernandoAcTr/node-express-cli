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
export const FEATURES = ['orm', 'auth', 'push', 'socket', 'mailer', 'tests', 'prettier', 'eslint'] as const

export type Feature = (typeof FEATURES)[number]

export type Config = {
  orm?: DbType
  fileBasedRouting: boolean
  package_manger: PackageManager
  /** Versión del CLI que escribió el archivo. */
  version?: string
  /** Features ya instaladas; permite repetir comandos sin duplicar trabajo. */
  features: Feature[]
}

/**
 * Estado adicional que se persiste junto con una feature. Se escribe en la
 * misma operación que `features` para que nunca queden desincronizados.
 */
export type FeatureMetadata = Partial<Pick<Config, 'orm'>>
