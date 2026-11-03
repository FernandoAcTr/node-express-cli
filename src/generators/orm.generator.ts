import fs from 'fs-extra'
import path from 'path'
import { IGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { renderTemplate } from '../utils/template'
import { patchAtAnchor } from '../patch/anchor'
import { ormScripts } from '../utils/scripts'
import { Reporter } from '../report'

export class OrmGenerator implements IGenerator {
  private orm: DbType
  private previousOrm?: DbType

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    const orm = await this.ctx.prompter.select<DbType>({
      message: 'Choose an ORM',
      name: 'orm',
      choices: Object.values(DbType).map((x) => ({ name: x, value: x })),
      default: DbType.TYPEORM,
    })

    const config = this.ctx.config.getConfig()
    this.previousOrm = config.orm
    config.orm = orm
    this.ctx.config.writeConfig(config)

    this.orm = orm
  }

  async createDirectories(): Promise<void> {
    const dirs = ['./src/database/seeds', './src/database/factories', './src/entities']
    if (this.orm == DbType.TYPEORM || this.orm == DbType.SEQUELIZE) {
      dirs.push('./src/database/migrations')
    }
    if (this.orm == DbType.PRISMA) {
      dirs.push('./src/database/prisma')
      dirs.push('./src/database/prisma/migrations')
    }

    dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }))
  }

  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/seed/seeder.ts'), './src/database/seeder.ts')
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/seed/seed.ts'), './src/database/seed.ts')

    if (this.orm == DbType.TYPEORM) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/typeorm/datasources.ts'), './src/database/datasources.ts')
      fs.copySync(path.resolve(__dirname, '../../templates/generator/orm/typeorm/audit'), './src/entities/audit')
    } else if (this.orm == DbType.SEQUELIZE) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/sequelize/datasources.ts'), './src/database/datasources.ts')
      fs.copyFileSync(
        path.resolve(__dirname, '../../templates/generator/orm/sequelize/sequelize-cli.json'),
        './src/database/sequelize-cli.json'
      )
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/sequelize/.sequelizerc'), './.sequelizerc')
    } else if (this.orm == DbType.PRISMA) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/prisma/schema.prisma'), './src/database/prisma/schema.prisma')
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/prisma/client.ts'), './src/database/client.ts')
      const prismaConfig = renderTemplate(path.resolve(__dirname, '../../templates/generator/orm/prisma/prisma.config.ts'), {
        PRISMA_SEED_COMMAND: `${this.ctx.config.getTypeScriptExecutionCommand()} src/database/seeder.ts`,
      })
      fs.writeFileSync('./prisma.config.ts', prismaConfig)
    } else if (this.orm == DbType.MONGO) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/mongo/datasources.ts'), './src/database/datasources.ts')
    }
  }

  async post(): Promise<void> {
    if (this.orm == DbType.TYPEORM) {
      const mainFile = path.join(this.ctx.cwd, 'src/main.ts')
      const reporter = new Reporter(this.ctx.logger)
      reporter.patches(mainFile, [patchAtAnchor(mainFile, 'imports', "import 'reflect-metadata'", { sort: true })])

      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
      this.ctx.logger.warn('You must install specific database driver like mysql or pg')
      this.ctx.logger.success('You need to initialize the AppDataSource manually.')
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    } else if (this.orm == DbType.SEQUELIZE) {
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
      this.ctx.logger.warn('You must install specific database driver like mysql2 or pg')
      this.ctx.logger.success(`You can use the .authenticate() function to test if the connection is OK`)
      this.ctx.logger.success(`sequelize.authenticate().then((x) => logger.info('🚀 Database is ready'))`)
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    } else if (this.orm == DbType.PRISMA) {
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
      this.ctx.logger.success(`You need to create your first migration. Run ${this.ctx.config.getRunCommand()} m:run`)
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    } else if (this.orm == DbType.MONGO) {
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
      this.ctx.logger.success('Now you need to import datasources.ts in your index.ts in order to connect with mongo')
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    }
  }

  async installDependencies(): Promise<void> {
    // `hasFeature` distingue una instalación completa de un `orm` escrito en
    // config antes de que la instalación terminara.
    const alreadyInstalled = this.ctx.has('orm') && this.ctx.config.hasFeature('orm') && this.previousOrm === this.orm
    const runner = this.ctx.config.getPackageRunnerCommand()

    if (alreadyInstalled) {
      this.ctx.logger.info(`${this.orm} is already installed; skipping dependency installation`)
    } else {
      this.ctx.logger.info('================= Installing ORM =================')

      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @faker-js/faker`)

      if (this.orm == DbType.TYPEORM) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} typeorm reflect-metadata`)
      } else if (this.orm == DbType.SEQUELIZE) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} sequelize`)
        await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} sequelize-cli`)
      } else if (this.orm == DbType.PRISMA) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @prisma/client@^6`)
        await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} prisma@^6 @prisma/config@^6`)
        this.ctx.config.deletePackageField('prisma')
        await this.ctx.shell.execAsync(`${runner} prisma generate`)
      } else if (this.orm == DbType.MONGO) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} mongoose`)
      }
    }

    this.ctx.config.setScripts(ormScripts(this.orm, this.ctx.config))
  }
}
