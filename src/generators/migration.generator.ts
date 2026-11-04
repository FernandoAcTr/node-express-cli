import { IPostGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { CliError } from '../errors'

export class MigrationGenerator implements IPreGenerator, IPostGenerator {
  private migrationName: string

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    const config = this.ctx.config.getConfig()
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

    const name = await this.ctx.prompter.input({
      message: 'Name of migration:',
      name: 'name',
    })
    if (!name) {
      throw new CliError('Migration name is required', {
        hint: 'Run "node-express-cli make:migration" again and enter a name.',
      })
    }

    this.migrationName = name
  }

  async post(): Promise<void> {
    const config = this.ctx.config.getConfig()
    const dbType = config.orm ?? DbType.TYPEORM
    const run = this.ctx.config.getRunCommand()

    if (dbType == DbType.SEQUELIZE) {
      await this.ctx.shell.execAsync(`${run} db:make:migration ${this.migrationName}`, this.ctx.cwd)
    } else if (dbType == DbType.TYPEORM) {
      await this.ctx.shell.execAsync(`${run} m:create ./src/database/migrations/${this.migrationName}`, this.ctx.cwd)
    }
  }
}
