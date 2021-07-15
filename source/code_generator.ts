export enum DbType {
  MONGO = 'mongo',
  TYPEORM = 'typeorm',
}

export interface CodeGenerator {
  createDirStructure(): void
  createConfigFiles(): void
  fillDatabase(dbType: DbType): void
  fillMiddlewares(): void
  fillSettings(): void
  fillRouter(): void
  fillIndex(): void
  installDependencies(): void
  installDevDependencies(): void
  addScripts(): void
  init(dbType: DbType): void
}
