import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class EntityGenerator implements IPreGenerator, IFileSystemGenerator {
  private entityName: string
  private dbType: DbType

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    const config = this.ctx.config.getConfig()

    if (config.orm == DbType.PRISMA) {
      throw new CliError('Prisma generates entities automatically', {
        hint: 'Edit src/database/prisma/schema.prisma and run "m:generate" instead.',
      })
    }
    this.dbType = config.orm ?? DbType.TYPEORM

    this.entityName = await this.ctx.prompter.input({
      message: 'Name of entity:',
      name: 'name',
    })
    if (!this.entityName) {
      throw new CliError('Entity name is required', {
        hint: 'Run "node-express-cli make:entity" again and enter a name.',
      })
    }
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/entities')
  }

  async copyFiles(): Promise<void> {
    const entityName = pascalCase(this.entityName)
    const fileName = kebabCase(this.entityName)

    const codeDirs = {
      [DbType.MONGO]: 'mongo',
      [DbType.TYPEORM]: 'typeorm',
      [DbType.SEQUELIZE]: 'sequelize',
    }

    const entity = renderTemplate(
      this.ctx.project.template('generator/orm', codeDirs[this.dbType], 'entity.template.ts'),
      { EntityName: entityName }
    )
    this.ctx.project.write(`src/entities/${fileName}.entity.ts`, entity, 'create')
  }
}
