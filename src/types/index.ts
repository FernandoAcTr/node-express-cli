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

export type Config = {
  orm?: DbType
  fileBasedRouting: boolean
  package_manger: PackageManager
}
