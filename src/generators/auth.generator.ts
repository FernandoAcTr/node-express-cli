import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { OperationResult, createResult } from '../report'
import { WritePolicy } from '../services/project.service'
import { PRISMA_ANCHOR, AUTH_PRISMA_BLOCK_MARKERS } from '../patch/anchors'
import { CliError } from '../errors'

interface AuthOrmTemplates {
  /** Directorio de entidades dentro de `templates/generator/auth`. */
  entities?: string
  /** Directorio de migraciones dentro de `templates/generator/auth`. */
  migrations?: string
  /** Repositorio específico del ORM dentro de `templates/generator/auth`. */
  repository: string
}

/**
 * Única pieza que conoce las diferencias entre motores. Añadir un ORM nuevo
 * consiste en crear sus templates y sumar una entrada aquí; el servicio,
 * controller, validadores, rutas y passport son comunes.
 */
const AUTH_ORMS: Record<DbType, AuthOrmTemplates> = {
  [DbType.TYPEORM]: {
    entities: 'typeorm/entities',
    migrations: 'typeorm/migrations',
    repository: 'typeorm/auth.repository.ts',
  },
  [DbType.SEQUELIZE]: {
    entities: 'sequelize/entities',
    migrations: 'sequelize/migrations',
    repository: 'sequelize/auth.repository.ts',
  },
  [DbType.MONGO]: {
    entities: 'mongo/entities',
    repository: 'mongo/auth.repository.ts',
  },
  [DbType.PRISMA]: {
    repository: 'prisma/auth.repository.ts',
  },
}

type PrismaAuthLayout = 'file' | 'block' | 'models'

export class AuthGenerator implements IPreGenerator, IFileSystemGenerator, IPostGenerator, IInstallerGenerator {
  /** True si el archivo `schemas/auth.prisma` se creó o actualizó en esta ejecución. */
  private prismaFilesChanged = false

  constructor(private readonly ctx: Context) {}

  private get dbType(): DbType {
    return this.ctx.config.getConfig().orm as DbType
  }

  /**
   * `install:auth` necesita mailer para los correos de verificación y reset.
   * El registry también lo valida, pero esta guarda protege el uso directo del
   * generador (tests y llamadas internas).
   */
  async pre(): Promise<void> {
    if (!this.ctx.has('mailer')) {
      throw new CliError('"install:auth" requires: mailer', {
        hint: 'Run "node-express-cli install:mailer" first.',
      })
    }

    const orm = this.ctx.config.getConfig().orm as DbType | undefined

    if (!orm) {
      throw new CliError('"install:auth" requires: orm', {
        hint: 'Run "node-express-cli install:orm" first.',
      })
    }

    if (!AUTH_ORMS[orm]) {
      throw new CliError(`Auth is not supported for the ORM "${orm}"`, {
        hint: 'Install auth in a project created with one of the supported ORMs.',
      })
    }
  }

  async createDirectories(): Promise<void> {
    const config = this.ctx.config.getConfig()

    this.ctx.project.ensureDir('src/entities')
    this.ctx.project.ensureDir('src/modules/auth')
    this.ctx.project.ensureDir('src/utils')
    this.ctx.project.ensureDir('src/middlewares')

    if (config.fileBasedRouting) {
      this.ctx.project.ensureDir('src/routes/auth')
    }

    if (this.dbType == DbType.PRISMA) {
      this.ctx.project.ensureDir('src/database/prisma/schemas')
    }
  }

  async copyFiles(): Promise<void> {
    const config = this.ctx.config.getConfig()
    const policy: WritePolicy = 'overwrite-if-unmodified'
    const project = this.ctx.project
    const templates = AUTH_ORMS[this.dbType]

    // Dominio compartido: idéntico para todos los ORM.
    project.copy('src/modules/auth/auth.controller.ts', 'generator/auth/common/auth.controller.ts', policy)
    project.copy('src/modules/auth/auth.service.ts', 'generator/auth/common/auth.service.ts', policy)
    project.copy('src/modules/auth/auth.tokens.ts', 'generator/auth/common/auth.tokens.ts', policy)
    project.copy('src/modules/auth/auth.types.ts', 'generator/auth/common/auth.types.ts', policy)
    project.copy('src/modules/auth/auth.validator.ts', 'generator/auth/common/auth.validator.ts', policy)
    project.copy('src/modules/auth/auth.mailer.ts', 'generator/auth/common/auth.mailer.ts', policy)
    project.copy('src/utils/hash.ts', 'generator/auth/common/hash.ts', policy)
    project.copy('src/middlewares/passport.ts', 'generator/auth/common/passport.ts', policy)

    // Acceso a datos: única pieza distinta por ORM.
    project.copy('src/modules/auth/auth.repository.ts', `generator/auth/${templates.repository}`, policy)

    if (config.fileBasedRouting) {
      project.copyDir('src/routes/auth', 'generator/auth/common/filerouting', policy)
    } else {
      project.copy('src/modules/auth/auth.routes.ts', 'generator/auth/common/auth.routes.ts', policy)
    }

    if (templates.entities) {
      project.copyDir('src/entities', `generator/auth/${templates.entities}`, policy)
    }

    if (templates.migrations) {
      project.copyDir('src/database/migrations', `generator/auth/${templates.migrations}`, policy)
    }

    if (this.dbType == DbType.PRISMA) {
      // Proyectos nuevos usan un archivo multi-schema. Los proyectos antiguos
      // con el bloque o con modelos sueltos se resuelven en `post()`.
      const layout = this.prismaLayout()

      if (layout === 'file') {
        const result = project.copy('src/database/prisma/schemas/auth.prisma', 'generator/auth/prisma/schemas/auth.prisma', policy)

        this.prismaFilesChanged = result.status !== 'skipped'
      }
    }
  }

  async post(): Promise<OperationResult> {
    const result = createResult()

    if (this.dbType == DbType.PRISMA) {
      this.merge(result, await this.installPrismaModels())
    }

    if (result.warnings.length > 0) {
      return result
    }

    this.merge(result, this.wireAuth())

    if (result.warnings.length > 0) {
      return result
    }

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success('Auth module was wired up: passport.initialize() and the JWT strategy are registered in src/main.ts')
    this.ctx.logger.success('The auth routes are already mounted by the app router')
    this.ctx.logger.success('Run the database migrations for your ORM before using the endpoints')
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')

    return result
  }

  /**
   * Prisma 7 usa multi-file schema (`src/database/prisma/schemas/*.prisma`).
   * Los proyectos generados antes de este cambio conservan su bloque de auth
   * o sus modelos sueltos y no se duplican.
   */
  private async installPrismaModels(): Promise<OperationResult> {
    const layout = this.prismaLayout()

    if (layout === 'block') {
      return this.mergePrismaBlock()
    }

    if (layout === 'models') {
      this.ctx.logger.warn(
        'Found auth models inside src/database/prisma/schema.prisma; skipped schemas/auth.prisma to avoid duplicate models. Move them to src/database/prisma/schemas/auth.prisma when convenient.'
      )
    }

    const shouldGenerate = this.prismaFilesChanged || !this.ctx.has('auth')

    await this.generatePrismaClient(shouldGenerate)

    return createResult()
  }

  private prismaLayout(): PrismaAuthLayout {
    const file = 'src/database/prisma/schema.prisma'

    if (!this.ctx.project.exists(file)) {
      return 'file'
    }

    const schema = this.ctx.project.read(file)

    if (schema.includes(AUTH_PRISMA_BLOCK_MARKERS.start) || schema.includes(AUTH_PRISMA_BLOCK_MARKERS.end)) {
      return 'block'
    }

    if (/\bmodel\s+User\s*\{/.test(schema) && /\bmodel\s+RefreshToken\s*\{/.test(schema)) {
      return 'models'
    }

    return 'file'
  }

  /**
   * Compatibilidad con proyectos anteriores: fusiona los modelos en el bloque
   * reemplazable del schema único. Nunca reemplaza el resto del schema.
   */
  private async mergePrismaBlock(): Promise<OperationResult> {
    const models = this.ctx.project.readTemplate('generator/auth/prisma/schemas/auth.prisma')
    const result = this.ctx.wiring.transaction((wiring) => {
      wiring.block('src/database/prisma/schema.prisma', 'auth', models, {
        after: PRISMA_ANCHOR,
        key: 'model Role {',
      })
    })

    const shouldGenerate = result.warnings.length === 0 && (result.changed.length > 0 || !this.ctx.has('auth'))
    await this.generatePrismaClient(shouldGenerate)

    return result
  }

  private async generatePrismaClient(shouldGenerate: boolean): Promise<void> {
    if (!shouldGenerate) {
      return
    }

    if (!this.hasDatabaseUrl()) {
      this.ctx.logger.warn('Skipped "prisma generate" because DB_URL is not set. Create .env with DB_URL and run the "m:generate" script.')
      return
    }

    // `m:generate` usa el runner del package manager y lee prisma.config.ts.
    await this.ctx.shell.execAsync(`${this.ctx.config.getRunCommand()} m:generate`, this.ctx.cwd)
  }

  private hasDatabaseUrl(): boolean {
    if (process.env.DB_URL) {
      return true
    }

    if (!this.ctx.project.exists('.env')) {
      return false
    }

    return /^DB_URL=\S+/m.test(this.ctx.project.read('.env'))
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
        this.ctx.logger.warn(warning)
      }
    }
  }

  private wireAuth(): OperationResult {
    const imports: string[] = []
    const result = createResult()

    if (this.dbType == DbType.MONGO) {
      imports.push("import './database/datasources'")
    }
    if (this.dbType == DbType.TYPEORM) {
      imports.push("import { AppDataSource } from './database/datasources'")
    }
    imports.push("import passport from 'passport'")
    imports.push("import { JWTStrategy } from './middlewares/passport'")

    // Primero main.ts: si falta un anchor no se escribe config/env de una
    // feature que quedaría desconectada.
    const mainResult = this.ctx.wiring.transaction((wiring) => {
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

    this.merge(result, mainResult)

    if (mainResult.warnings.length > 0) {
      return result
    }

    const configResult = this.ctx.wiring.transaction((wiring) => {
      wiring.config("  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',", {
        key: 'FRONTEND_URL:',
      })
      wiring.env('FRONTEND_URL=', { key: 'FRONTEND_URL=' })
    })

    this.merge(result, configResult)

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
