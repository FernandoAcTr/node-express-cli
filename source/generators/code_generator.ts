export enum DbType {
  MONGO = 'mongo',
  TYPEORM = 'typeorm',
}

export abstract class CodeGenerator {
  abstract createDirStructure(): void
  abstract copyCode(dbType: DbType): void
  abstract installDependencies(): void

  abstract init(): void
  abstract makeModule(name: String, dbType: DbType): void
}
