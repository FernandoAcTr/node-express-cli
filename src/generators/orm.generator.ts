import { IGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType, FeatureMetadata } from '../types'
import { renderTemplate } from '../utils/template'
import { ormScripts } from '../utils/scripts'
import { OperationResult, Reporter } from '../report'
import { WritePolicy } from '../services/project.service'
import { WireStep, applyWireSteps } from '../installers'
import { ormWireSteps } from '../installers/specs/orm.spec'
import { CliError } from '../errors'

export class OrmGenerator implements IGenerator {
  private orm: DbType

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    // En proyectos existentes, `--no-interaction` debe conservar el ORM actual
    // en vez de volver siempre a TypeORM.
    const current = this.ctx.config.getConfig().orm

    const selected = await this.ctx.prompter.select<DbType>({
      message: 'Choose an ORM',
      name: 'orm',
      choices: Object.values(DbType).map((x) => ({ name: x, value: x })),
      default: current ?? DbType.TYPEORM,
    })

    // Cambiar de motor dejaría entidades, datasources y scripts del anterior.
    // La limpieza automática necesita un manifest con propietario por feature;
    // hasta entonces se bloquea antes de escribir nada.
    if (current && current !== selected) {
      throw new CliError(`Changing the ORM from "${current}" to "${selected}" is not supported`, {
        hint: 'Create a new project with "node-express-cli init", or remove the old ORM files and the "orm" feature from cli.config.json manually before installing another ORM.',
      })
    }

    this.orm = selected
  }

  /** `run()` persiste el ORM elegido junto con la feature al terminar todo. */
  installMetadata(): FeatureMetadata {
    return { orm: this.orm }
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/database/seeds')
    this.ctx.project.ensureDir('src/database/factories')
    this.ctx.project.ensureDir('src/entities')

    if (this.orm == DbType.TYPEORM || this.orm == DbType.SEQUELIZE) {
      this.ctx.project.ensureDir('src/database/migrations')
    }
    if (this.orm == DbType.PRISMA) {
      this.ctx.project.ensureDir('src/database/prisma')
      this.ctx.project.ensureDir('src/database/prisma/migrations')
    }
  }

  async copyFiles(): Promise<void> {
    const policy: WritePolicy = 'overwrite-if-unmodified'
    const project = this.ctx.project

    project.copy('src/database/seeder.ts', 'generator/common/seed/seeder.ts', policy)
    project.copy('src/database/seed.ts', 'generator/common/seed/seed.ts', policy)

    if (this.orm == DbType.TYPEORM) {
      project.copy('src/database/datasources.ts', 'generator/orm/typeorm/datasources.ts', policy)
      project.copyDir('src/entities/audit', 'generator/orm/typeorm/audit', policy)
    } else if (this.orm == DbType.SEQUELIZE) {
      project.copy('src/database/datasources.ts', 'generator/orm/sequelize/datasources.ts', policy)
      project.copy('src/database/sequelize-cli.json', 'generator/orm/sequelize/sequelize-cli.json', policy)
      project.copy('.sequelizerc', 'generator/orm/sequelize/.sequelizerc', policy)
    } else if (this.orm == DbType.PRISMA) {
      project.copy('src/database/prisma/schema.prisma', 'generator/orm/prisma/schema.prisma', policy)
      project.copy('src/database/client.ts', 'generator/orm/prisma/client.ts', policy)

      const prismaConfig = renderTemplate(project.template('generator/orm/prisma/prisma.config.ts'), {
        PRISMA_SEED_COMMAND: `${this.ctx.config.getTypeScriptExecutionCommand()} src/database/seeder.ts`,
      })
      project.write('prisma.config.ts', prismaConfig, policy)
    } else if (this.orm == DbType.MONGO) {
      project.copy('src/database/datasources.ts', 'generator/orm/mongo/datasources.ts', policy)
    }
  }

  async post(): Promise<OperationResult> {
    const reporter = new Reporter(this.ctx.logger)
    const steps: WireStep[] = []

    if (this.orm == DbType.TYPEORM) {
      steps.push({ kind: 'import', statement: "import 'reflect-metadata'" })
    }

    // La configuración y el `.env.example` de la base de datos pertenecen al
    // ORM, no al template base. Se escriben en el mismo wiring que el resto.
    steps.push(...ormWireSteps())

    const result = this.ctx.wiring.transaction((wiring) => applyWireSteps(wiring, steps, this.ctx.config))
    reporter.add(result)

    if (result.warnings.length > 0) {
      return result
    }

    if (this.orm == DbType.TYPEORM) {
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

    return result
  }

  async installDependencies(): Promise<void> {
    // `has('orm')` se apoya en `features`; comparar con el ORM guardado evita
    // reinstalar dependencias al repetir el mismo motor. Cambiar de ORM está
    // bloqueado en `pre()`: un proyecto no puede tener dos motores a la vez.
    const alreadyInstalled = this.ctx.has('orm') && this.ctx.config.getConfig().orm === this.orm
    const runner = this.ctx.config.getPackageRunnerCommand()
    const cwd = this.ctx.cwd

    if (alreadyInstalled) {
      this.ctx.logger.info(`${this.orm} is already installed; skipping dependency installation`)
    } else {
      this.ctx.logger.info('================= Installing ORM =================')

      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @faker-js/faker`, cwd)

      if (this.orm == DbType.TYPEORM) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} typeorm reflect-metadata`, cwd)
      } else if (this.orm == DbType.SEQUELIZE) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} sequelize`, cwd)
        await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} sequelize-cli`, cwd)
      } else if (this.orm == DbType.PRISMA) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} @prisma/client@^6`, cwd)
        await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} prisma@^6 @prisma/config@^6`, cwd)

        if (this.ctx.config.deletePackageField('prisma')) {
          this.ctx.project.record('package.json')
        }

        await this.ctx.shell.execAsync(`${runner} prisma generate`, cwd)
      } else if (this.orm == DbType.MONGO) {
        await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} mongoose`, cwd)
      }

      // El package manager modifica package.json al instalar; registrarlo antes
      // de setScripts mantiene el manifest en sincronía con el disco.
      this.ctx.project.record('package.json')
    }

    const scripts = this.ctx.config.setScripts(ormScripts(this.orm, this.ctx.config))

    if (scripts.changed.length > 0) {
      this.ctx.project.record('package.json')
    }
  }
}
