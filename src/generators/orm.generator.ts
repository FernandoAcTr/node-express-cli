import fs from 'fs-extra'
import path from 'path'
import { IGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { renderTemplate } from '../utils/template'
import { patchAtAnchor } from '../patch/anchor'

export class OrmGenerator implements IGenerator {
  private orm: DbType

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    const orm = await this.ctx.prompter.select<DbType>({
      message: 'Choose an ORM',
      name: 'orm',
      choices: Object.values(DbType).map((x) => ({ name: x, value: x })),
      default: DbType.TYPEORM,
    })

    const config = this.ctx.config.getConfig()
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
      const reflectPatch = patchAtAnchor(
        path.join(this.ctx.cwd, 'src/main.ts'),
        'imports',
        "import 'reflect-metadata'",
        { sort: true }
      )
      if (reflectPatch.status === 'anchor-missing' || reflectPatch.status === 'file-missing') {
        this.ctx.logger.warn(reflectPatch.message ?? 'Could not add reflect-metadata to src/main.ts')
      }

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
      const packageContent = fs.readFileSync('./package.json', 'utf-8')
      const packageJson = JSON.parse(packageContent)
      delete packageJson.prisma
      fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))

      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
      this.ctx.logger.success(`You need to create your first migration. Run ${this.ctx.config.getConfig().package_manger} run m:run`)
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    } else if (this.orm == DbType.MONGO) {
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
      this.ctx.logger.success('Now you need to import datasources.ts in your index.ts in order to connect with mongo')
      this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    }
  }

  async installDependencies(): Promise<void> {
    this.ctx.logger.info('================= Installing ORM =================')

    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @faker-js/faker`)

    if (this.orm == DbType.TYPEORM) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} typeorm reflect-metadata`)
      this.ctx.shell.exec('npm pkg set scripts.typeorm="npx typeorm -d build/database/datasources.js"')
      this.ctx.shell.exec('npm pkg set scripts.m:run="npm run build && npm run typeorm migration:run"')
      this.ctx.shell.exec('npm pkg set scripts.m:revert="npm run build && npm run typeorm migration:revert"')
      this.ctx.shell.exec('npm pkg set scripts.m:generate="npm run build && npm run typeorm migration:generate"')
      this.ctx.shell.exec('npm pkg set scripts.m:create="npx typeorm migration:create"')
      this.ctx.shell.exec('npm pkg set scripts.m:drop="npm run build && npm run typeorm schema:drop"')
      this.ctx.shell.exec('npm pkg set scripts.m:run:fresh="npm run build && npm run typeorm schema:drop && npm run typeorm migration:run"')
      this.ctx.shell.exec(
        'npm pkg set scripts.m:run:fresh:seed="npm run build && npm run typeorm schema:drop && npm run typeorm migration:run && node build/database/seeder.js"'
      )
    } else if (this.orm == DbType.SEQUELIZE) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} sequelize`)
      await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} sequelize-cli`)
      this.ctx.shell.exec('npm pkg set scripts.db:migrate="npx sequelize-cli db:migrate"')
      this.ctx.shell.exec('npm pkg set scripts.db:migrate:undo="npx sequelize-cli db:migrate:undo"')
      this.ctx.shell.exec('npm pkg set scripts.db:migrate:fresh="npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate"')
      this.ctx.shell.exec('npm pkg set scripts.db:make:migration="npx sequelize-cli migration:generate --name"')
    } else if (this.orm == DbType.PRISMA) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @prisma/client@^6`)
      await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} prisma@^6 @prisma/config@^6`)
      this.ctx.shell.exec('npm pkg delete prisma')
      this.ctx.shell.exec('npm pkg set scripts.m:run="npx prisma migrate dev"')
      this.ctx.shell.exec('npm pkg set scripts.m:run:deploy="npx prisma migrate deploy"')
      this.ctx.shell.exec('npm pkg set scripts.m:reset="npx prisma migrate reset"')
      this.ctx.shell.exec('npm pkg set scripts.m:generate="npx prisma generate"')
      await this.ctx.shell.execAsync('npx prisma generate')
    } else if (this.orm == DbType.MONGO) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} mongoose`)
    }

    this.ctx.shell.exec('npm pkg set scripts.db:seed="npm run build && node build/database/seeder.js"')
  }
}
