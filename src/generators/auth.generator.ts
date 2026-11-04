import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { Reporter } from '../report'
import { WritePolicy } from '../services/project.service'

export class AuthGenerator implements IFileSystemGenerator, IPostGenerator, IInstallerGenerator {
  constructor(private readonly ctx: Context) {}

  private get dbType(): DbType {
    return this.ctx.config.getConfig().orm as DbType
  }

  async createDirectories(): Promise<void> {
    const config = this.ctx.config.getConfig()

    this.ctx.project.ensureDir('src/entities')
    this.ctx.project.ensureDir('src/modules/auth')
    this.ctx.project.ensureDir('src/modules/auth/services')
    this.ctx.project.ensureDir('src/utils')
    this.ctx.project.ensureDir('src/middlewares')

    if (config.fileBasedRouting) {
      this.ctx.project.ensureDir('src/routes/auth')
    }
  }

  async copyFiles(): Promise<void> {
    const config = this.ctx.config.getConfig()
    const policy: WritePolicy = 'overwrite-if-unmodified'
    const project = this.ctx.project

    project.copy('src/modules/auth/auth.controller.ts', 'generator/auth/common/auth.controller.ts', policy)

    if (config.fileBasedRouting) {
      project.copyDir('src/routes/auth', 'generator/auth/common/filerouting', policy)
    } else {
      project.copy('src/modules/auth/routes.ts', 'generator/auth/common/auth.routes.ts', policy)
    }

    project.copy('src/modules/auth/auth.validator.ts', 'generator/auth/common/auth.validator.ts', policy)
    project.copy('src/utils/hash.ts', 'generator/auth/common/hash.ts', policy)
    project.copy('src/middlewares/passport.ts', 'generator/auth/common/passport.ts', policy)

    if (this.dbType == DbType.TYPEORM) {
      project.copyDir('src/entities', 'generator/auth/typeorm/entities', policy)
      project.copyDir('src/database/migrations', 'generator/auth/typeorm/migrations', policy)
      project.copyDir('src/modules/auth/services', 'generator/auth/typeorm/services', policy)
    } else if (this.dbType == DbType.SEQUELIZE) {
      project.copyDir('src/entities', 'generator/auth/sequelize/entities', policy)
      project.copyDir('src/database/migrations', 'generator/auth/sequelize/migrations', policy)
      project.copyDir('src/modules/auth/services', 'generator/auth/sequelize/services', policy)
    } else if (this.dbType == DbType.MONGO) {
      project.copyDir('src/entities', 'generator/auth/mongo/entities', policy)
      project.copyDir('src/modules/auth/services', 'generator/auth/mongo/services', policy)
    } else if (this.dbType == DbType.PRISMA) {
      project.copyDir('src/modules/auth/services', 'generator/auth/prisma/services', policy)

      // El schema puede contener modelos propios: no se sobrescribe nunca sin
      // `--force`. El merge por anchors queda para una fase posterior.
      const schema = project.copy('src/database/prisma/schema.prisma', 'generator/auth/prisma/schema.prisma', 'skip')

      if (schema.status === 'skipped' && schema.reason === 'exists') {
        this.ctx.logger.warn('src/database/prisma/schema.prisma already exists; merge the auth models manually. Use --force to replace it.')
      }
    }
  }

  async post(): Promise<void> {
    if (this.dbType == DbType.PRISMA) {
      await this.ctx.shell.execAsync(`${this.ctx.config.getRunCommand()} m:generate`, this.ctx.cwd)
    }

    this.wireAuth()

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success('Auth module was wired up: passport.initialize() and the JWT strategy are registered in src/main.ts')
    this.ctx.logger.success('The auth routes are already mounted by the app router')
    this.ctx.logger.success(
      'You need to run the database migrations. Depending on the ORM you chose it is necessary to run a specific command'
    )
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
  }

  private wireAuth(): void {
    const reporter = new Reporter(this.ctx.logger)
    const imports: string[] = []

    if (this.dbType == DbType.MONGO) {
      imports.push("import './database/datasources'")
    }
    if (this.dbType == DbType.TYPEORM) {
      imports.push("import { AppDataSource } from './database/datasources'")
    }
    imports.push("import passport from 'passport'")
    imports.push("import { JWTStrategy } from './middlewares/passport'")

    // Todo el wiring de `main.ts` se aplica de forma atómica: si falta un
    // anchor, no se escribe ninguno de los imports ni del runtime.
    const result = this.ctx.wiring.transaction((wiring) => {
      for (const statement of imports) {
        wiring.import(statement)
      }

      if (this.dbType == DbType.TYPEORM) {
        wiring.main(
          'beforeApp',
          "AppDataSource.initialize()\n  .then(() => logger.info('🚀 Database connection is online...'))\n  .catch((error) => logger.error(error))",
          { key: 'AppDataSource.initialize()' }
        )
      }

      wiring.main('beforeApp', "passport.use('jwt', JWTStrategy)", { key: "passport.use('jwt'" })
      wiring.main('beforeJson', 'app.use(passport.initialize())', { key: 'passport.initialize()' })
    })

    reporter.add(result)
  }

  async installDependencies(): Promise<void> {
    if (this.ctx.has('auth')) {
      this.ctx.logger.info('Auth is already installed; skipping dependency installation')
      return
    }

    this.ctx.logger.info('================= Installing auth dependencies =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} bcrypt passport passport-jwt jsonwebtoken`, this.ctx.cwd)
    await this.ctx.shell.execAsync(
      `${this.ctx.config.getDevInstallCommand()} @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken`,
      this.ctx.cwd
    )
  }
}
