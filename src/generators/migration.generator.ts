import { input } from '@inquirer/prompts'
import { IPostGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { DbType } from '../types'
import { shellService } from '../services/shell.service'
import { CliError } from '../errors'

export class MigrationGenerator implements IPreGenerator, IPostGenerator {
  private migrationName: string

  async pre(): Promise<void> {
    const config = configService.getConfig()
    const dbType = config.orm ?? DbType.TYPEORM

    if (dbType == DbType.MONGO) {
      throw new CliError("MongoDB doesn't use SQL migrations", {
        hint: 'Change your entity models instead; migrations are not needed with mongoose.',
      })
    }
    if (dbType == DbType.PRISMA) {
      throw new CliError("Prisma doesn't use custom migration files", {
        hint: 'Edit the schema and run "m:run" to let Prisma generate the migration.',
      })
    }

    const name = await input({
      message: 'Name of migration:',
    })
    if (!name) {
      throw new CliError('Migration name is required', {
        hint: 'Run "node-express-cli make:migration" again and enter a name.',
      })
    }

    this.migrationName = name
  }

  async post(): Promise<void> {
    const config = configService.getConfig()
    const dbType = config.orm ?? DbType.TYPEORM

    if (dbType == DbType.SEQUELIZE) {
      shellService.exec(`npm run db:make:migration ${this.migrationName}`)
    } else if (dbType == DbType.TYPEORM) {
      shellService.exec(`npm run m:create ./src/database/migrations/${this.migrationName}`)
    }
  }
}
