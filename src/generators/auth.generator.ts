import path from 'path'
import fs from 'fs'
import {
  IFileSystemGenerator,
  IInstallerGenerator,
  IPostGenerator,
} from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { PatchResult, patchAtAnchor } from '../patch/anchor'

export class AuthGenerator implements IFileSystemGenerator, IPostGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  private get dbType(): DbType {
    return this.ctx.config.getConfig().orm as DbType
  }

  async createDirectories(): Promise<void> {
    const config = this.ctx.config.getConfig()

    fs.mkdirSync(`./src/entities`, { recursive: true })
    fs.mkdirSync(`./src/modules/auth`, { recursive: true })
    fs.mkdirSync(`./src/modules/auth/services`, { recursive: true })
    fs.mkdirSync(`./src/utils`, { recursive: true })
    fs.mkdirSync(`./src/middlewares`, { recursive: true })

    if (config.fileBasedRouting) {
      fs.mkdirSync(`./src/routes/auth`, { recursive: true })
    }
  }

  async copyFiles(): Promise<void> {
    const config = this.ctx.config.getConfig()

    fs.copyFileSync(
      path.resolve(__dirname, '../../templates/generator/auth/common/auth.controller.ts'),
      `./src/modules/auth/auth.controller.ts`
    )
    if (config.fileBasedRouting) {
      const routes = path.resolve(__dirname, '../../templates/generator/auth/common/filerouting')
      const files = fs.readdirSync(routes)
      files.forEach((file) => fs.copyFileSync(path.resolve(routes, file), `./src/routes/auth/${file}`))
    } else {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/auth/common/auth.routes.ts'), `./src/modules/auth/routes.ts`)
    }

    fs.copyFileSync(
      path.resolve(__dirname, '../../templates/generator/auth/common/auth.validator.ts'),
      `./src/modules/auth/auth.validator.ts`
    )
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/auth/common/hash.ts'), `./src/utils/hash.ts`)
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/auth/common/passport.ts'), `./src/middlewares/passport.ts`)

    if (this.dbType == DbType.TYPEORM) {
      const entitiesDir = path.resolve(__dirname, '../../templates/generator/auth/typeorm/entities')
      const migrationsDir = path.resolve(__dirname, '../../templates/generator/auth/typeorm/migrations')
      const servicesDir = path.resolve(__dirname, '../../templates/generator/auth/typeorm/services')
      const entities = fs.readdirSync(entitiesDir)
      const migrations = fs.readdirSync(migrationsDir)
      const services = fs.readdirSync(servicesDir)

      entities.forEach((file) => fs.copyFileSync(path.resolve(entitiesDir, file), `./src/entities/${file}`))
      migrations.forEach((file) => fs.copyFileSync(path.resolve(migrationsDir, file), `./src/database/migrations/${file}`))
      services.forEach((file) => fs.copyFileSync(path.resolve(servicesDir, file), `./src/modules/auth/services/${file}`))
    } else if (this.dbType == DbType.SEQUELIZE) {
      const entitiesDir = path.resolve(__dirname, '../../templates/generator/auth/sequelize/entities')
      const migrationsDir = path.resolve(__dirname, '../../templates/generator/auth/sequelize/migrations')
      const servicesDir = path.resolve(__dirname, '../../templates/generator/auth/sequelize/services')
      const entities = fs.readdirSync(entitiesDir)
      const migrations = fs.readdirSync(migrationsDir)
      const services = fs.readdirSync(servicesDir)

      entities.forEach((file) => fs.copyFileSync(path.resolve(entitiesDir, file), `./src/entities/${file}`))
      migrations.forEach((file) => fs.copyFileSync(path.resolve(migrationsDir, file), `./src/database/migrations/${file}`))
      services.forEach((file) => fs.copyFileSync(path.resolve(servicesDir, file), `./src/modules/auth/services/${file}`))
    } else if (this.dbType == DbType.MONGO) {
      const entitiesDir = path.resolve(__dirname, '../../templates/generator/auth/mongo/entities')
      const servicesDir = path.resolve(__dirname, '../../templates/generator/auth/mongo/services')
      const entities = fs.readdirSync(entitiesDir)
      const services = fs.readdirSync(servicesDir)

      entities.forEach((file) => fs.copyFileSync(path.resolve(entitiesDir, file), `./src/entities/${file}`))
      services.forEach((file) => fs.copyFileSync(path.resolve(servicesDir, file), `./src/modules/auth/services/${file}`))
    } else if (this.dbType == DbType.PRISMA) {
      const servicesDir = path.resolve(__dirname, '../../templates/generator/auth/prisma/services')
      const services = fs.readdirSync(servicesDir)
      services.forEach((file) => fs.copyFileSync(path.resolve(servicesDir, file), `./src/modules/auth/services/${file}`))

      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/auth/prisma/schema.prisma'), `./src/database/prisma/schema.prisma`)
    }
  }

  async post(): Promise<void> {
    if (this.dbType == DbType.PRISMA) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getRunCommand()} m:generate`)
    }

    this.wireAuth()

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success(
      'Auth module was wired up: passport.initialize() and the JWT strategy are registered in src/main.ts'
    )
    this.ctx.logger.success('The auth routes are already mounted by the app router')
    this.ctx.logger.success(
      'You need to run the database migrations. Depending on the ORM you chose it is necessary to run a specific command'
    )
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
  }

  private wireAuth(): void {
    const mainFile = path.join(this.ctx.cwd, 'src/main.ts')
    const imports: string[] = []

    if (this.dbType == DbType.MONGO) {
      imports.push("import './database/datasources'")
    }
    if (this.dbType == DbType.TYPEORM) {
      imports.push("import { AppDataSource } from './database/datasources'")
    }
    imports.push("import passport from 'passport'")
    imports.push("import { JWTStrategy } from './middlewares/passport'")

    const patches: PatchResult[] = imports.map((line) =>
      patchAtAnchor(mainFile, 'imports', line, { sort: true })
    )

    if (patches.some((patch) => patch.status === 'file-missing')) {
      this.warnPatches(patches)
      return
    }

    if (this.dbType == DbType.TYPEORM) {
      patches.push(
        patchAtAnchor(
          mainFile,
          'beforeApp',
          "AppDataSource.initialize()\n  .then(() => logger.info('🚀 Database connection is online...'))\n  .catch((error) => logger.error(error))",
          { dedupeKey: 'AppDataSource.initialize()' }
        )
      )
    }

    patches.push(
      patchAtAnchor(mainFile, 'beforeApp', "passport.use('jwt', JWTStrategy)", {
        dedupeKey: "passport.use('jwt'",
      })
    )
    patches.push(
      patchAtAnchor(mainFile, 'beforeJson', 'app.use(passport.initialize())', {
        dedupeKey: 'passport.initialize()',
      })
    )

    this.warnPatches(patches)
  }

  private warnPatches(patches: PatchResult[]): void {
    const seen = new Set<string>()

    for (const patch of patches) {
      if (patch.status !== 'anchor-missing' && patch.status !== 'file-missing') {
        continue
      }

      const message = patch.message ?? `Could not patch ${patch.file}`
      if (!seen.has(message)) {
        seen.add(message)
        this.ctx.logger.warn(message)
      }
    }
  }

  async installDependencies(): Promise<void> {
    this.ctx.logger.info('================= Installing auth dependencies =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} bcrypt passport passport-jwt jsonwebtoken`)
    await this.ctx.shell.execAsync(
      `${this.ctx.config.getDevInstallCommand()} @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken`
    )
  }
}
