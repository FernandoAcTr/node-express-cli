import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { DbType } from '../types'
import fs from 'fs-extra'
import path from 'path'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class EntityGenerator implements IPreGenerator, IFileSystemGenerator {
  private entityName: string
  private dbType: DbType

  async pre(): Promise<void> {
    const config = configService.getConfig()

    if (config.orm == DbType.PRISMA) {
      throw new CliError('Prisma generates entities automatically', {
        hint: 'Edit src/database/prisma/schema.prisma and run "m:generate" instead.',
      })
    }
    this.dbType = config.orm ?? DbType.TYPEORM

    this.entityName = await input({
      message: 'Name of entity:',
    })
    if (!this.entityName) {
      throw new CliError('Entity name is required', {
        hint: 'Run "node-express-cli make:entity" again and enter a name.',
      })
    }
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync(`./src/entities`, { recursive: true })
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
      path.resolve(__dirname, '../../templates/generator/orm', codeDirs[this.dbType], 'entity.template.ts'),
      { EntityName: entityName }
    )
    fs.writeFileSync(`./src/entities/${fileName}.entity.ts`, entity)
  }
}
