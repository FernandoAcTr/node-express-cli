export enum DbType {
  MONGO = 'mongoose',
  TYPEORM = 'typeorm',
  SEQUELIZE = 'sequelize',
  PRISMA = 'prisma',
}

export enum ProjectType {
  API = 'REST API',
  GRAPH = 'GraphQL API',
}

export abstract class CodeGenerator {
  abstract createDirStructure(): void
  abstract copyCode(dbType: DbType): void
  abstract installDependencies(): void

  abstract init(): void
  abstract makeModule(name: String, dbType: DbType): void
}
