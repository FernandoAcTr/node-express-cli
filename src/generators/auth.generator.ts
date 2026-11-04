import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { OperationResult, Reporter, createResult } from '../report'
import { WritePolicy } from '../services/project.service'
import { PRISMA_ANCHOR } from '../patch/anchors'

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
    }
  }

  async post(): Promise<OperationResult> {
    const result = createResult()

    if (this.dbType == DbType.PRISMA) {
      const schema = this.mergePrismaSchema()
      this.merge(result, schema)

      // Si el schema no tiene el anchor, no se toca y no se genera un cliente
      // a partir de un modelo incompleto. El warning impide marcar la feature.
      // Si auth ya estaba instalada y el bloque no cambió, no hace falta volver
      // a generar el cliente.
      const shouldGenerate = schema.changed.length > 0 || !this.ctx.has('auth')

      if (schema.warnings.length === 0 && shouldGenerate) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getRunCommand()} m:generate`, this.ctx.cwd)
      }
    }

    this.merge(result, this.wireAuth())

    if (result.warnings.length > 0) {
      return result
    }

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success('Auth module was wired up: passport.initialize() and the JWT strategy are registered in src/main.ts')
    this.ctx.logger.success('The auth routes are already mounted by the app router')
    this.ctx.logger.success(
      'You need to run the database migrations. Depending on the ORM you chose it is necessary to run a specific command'
    )
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')

    return result
  }

  /**
   * Fusiona los modelos de auth en el schema de Prisma mediante un bloque
   * reemplazable. Así no se reemplaza el schema completo ni se pierden modelos
   * propios; en proyectos sin el anchor de Prisma el bloque no se escribe.
   */
  private mergePrismaSchema(): OperationResult {
    const models = this.ctx.project.readTemplate('generator/auth/prisma/auth.prisma')
    const reporter = new Reporter(this.ctx.logger)
    const result = this.ctx.wiring.transaction((wiring) => {
      wiring.block('src/database/prisma/schema.prisma', 'auth', models, {
        after: PRISMA_ANCHOR,
        // Proyectos antiguos ya tienen los modelos copiados sin bloque: no se
        // duplican y se consideran integrados.
        key: 'model Role {',
      })
    })

    reporter.add(result)

    return result
  }

  private merge(target: OperationResult, next: OperationResult): void {
    for (const file of next.changed) {
      if (!target.changed.includes(file)) {
        target.changed.push(file)
      }
    }

    for (const file of next.skipped) {
      if (!target.skipped.includes(file)) {
        target.skipped.push(file)
      }
    }

    for (const warning of next.warnings) {
      if (!target.warnings.includes(warning)) {
        target.warnings.push(warning)
      }
    }
  }

  private wireAuth(): OperationResult {
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

    return result
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
    this.ctx.project.record('package.json')
  }
}
