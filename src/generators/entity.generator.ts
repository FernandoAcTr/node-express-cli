import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { DbType } from '../types'
import fs from 'fs-extra'
import path from 'path'

export class EntityGenerator implements IPreGenerator, IFileSystemGenerator {
  private entityName: string
  private dbType: DbType

  async pre(): Promise<void> {
    const config = configService.getConfig()

    if (config.orm == DbType.PRISMA) {
      console.log('================================'.yellow)
      console.log("Since you are using Prisma you don't need to make entities, Prisma generate them for you.".yellow)
      console.log('================================'.yellow)
      process.exit(0)
    }
    this.dbType = config.orm ?? DbType.TYPEORM

    this.entityName = await input({
      message: 'Name of entity:',
    })
    if (!this.entityName) {
      process.exit(0)
    }
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync(`./src/entities`, { recursive: true })
  }

  async copyFiles(): Promise<void> {
    const entityName = `${this.entityName[0].toUpperCase()}${this.entityName.substring(1).toLowerCase()}`
    const fileName = this.entityName.toLowerCase()

    const codeDirs = {
      [DbType.MONGO]: 'mongo',
      [DbType.TYPEORM]: 'typeorm',
      [DbType.SEQUELIZE]: 'sequelize',
    }

    const entity = fs
      .readFileSync(path.resolve(__dirname, '../../templates/generator/orm', codeDirs[this.dbType], 'entity.template.ts'))
      .toString()
      .replace(/__EntityName__/g, entityName)
    fs.writeFileSync(`./src/entities/${fileName}.entity.ts`, entity)
  }
}
