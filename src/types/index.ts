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
export const FEATURES = ['orm', 'auth', 'push', 'socket', 'mailer', 'notifications', 'tests', 'prettier', 'eslint'] as const

export type Feature = (typeof FEATURES)[number]

/** Features del CLI más las señales de estado que puede consultar un comando. */
export type ContextFeature = Feature | 'fileBasedRouting'

/** Requisito declarado por un comando, con el mensaje que se muestra si falta. */
export interface RequiredFeature {
  feature: ContextFeature
  hint: string
}

/** Argumentos ya parseados que recibe un comando. */
export interface CommandArgs {
  positionals: string[]
  flags: Record<string, unknown>
}

/** Resultado crudo de yargs antes de separar posicionales y flags. */
export type ParsedArgv = Record<string, unknown> & { _: (string | number)[] }

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
