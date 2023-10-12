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
  protected abstract createDirStructure(): void
  protected abstract copyCode(dbType: DbType): void
  protected abstract installDependencies(): void
  abstract init(): void
}
