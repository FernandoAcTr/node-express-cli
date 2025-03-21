import { input } from '@inquirer/prompts'
import { IPostGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { DbType } from '../types'
import { shellService } from '../services/shell.service'

export class MigrationGenerator implements IPreGenerator, IPostGenerator {
  async pre(): Promise<void> {
    const config = configService.getConfig()
    const dbType = config.orm ?? DbType.TYPEORM

    if (dbType == DbType.MONGO) {
      console.log('================================'.yellow)
      console.log("Since you are using MongoDB, you don't need migrations.".yellow)
      console.log('================================'.yellow)
      process.exit(0)
    }
    if (dbType == DbType.PRISMA) {
      console.log('================================'.yellow)
      console.log("Prisma doesn't need custom migrations, please use the command to generate them.".yellow)
      console.log('================================'.yellow)
      process.exit(0)
    }
  }
  async post(): Promise<void> {
    const config = configService.getConfig()
    const dbType = config.orm ?? DbType.TYPEORM

    const name = await input({
      message: 'Name of migration:',
    })
    if (!name) {
      process.exit(0)
    }

    if (dbType == DbType.SEQUELIZE) {
      shellService.exec(`npm run db:make:migration ${name}`)
    } else if (dbType == DbType.TYPEORM) {
      shellService.exec(`npm run m:create ./src/database/migrations/${name}`)
    }
  }
}
