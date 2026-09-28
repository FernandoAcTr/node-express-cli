import path from 'path'
import fs from 'fs'
import { IGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'
import { DbType } from '../types'

export class AuthGenerator implements IGenerator {
  private dbType: DbType

  async pre(): Promise<void> {
    const config = configService.getConfig()
    if (!config.orm) {
      console.log('================================'.yellow)
      console.log('Install first the orm. Please exec node-express-cli install:orm'.yellow)
      console.log('================================'.yellow)
      process.exit(0)
    }

    this.dbType = config.orm
  }

  async createDirectories(): Promise<void> {
    const config = configService.getConfig()

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
    const config = configService.getConfig()

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
      await shellService.execAsync(`${configService.getRunCommand()} m:generate`)
    }

    this.wireAuth()

    console.log('-------------------------------------------------------------------------------------------'.green)
    console.log('Auth module was wired up: passport.initialize() and the JWT strategy are registered in src/main.ts'.green)
    console.log('The auth routes are already mounted by the app router'.green)
    console.log('You need to run the database migrations. Depending on the ORM you chose it is necessary to run a specific command'.green)
    console.log('-------------------------------------------------------------------------------------------'.green)
  }

  private wireAuth(): void {
    const mainFile = './src/main.ts'
    if (!fs.existsSync(mainFile)) {
      return
    }

    let content = fs.readFileSync(mainFile, 'utf-8')

    const imports: string[] = []
    if (this.dbType == DbType.MONGO) {
      imports.push("import './database/datasources'")
    }
    if (this.dbType == DbType.TYPEORM) {
      imports.push("import { AppDataSource } from './database/datasources'")
    }
    imports.push("import passport from 'passport'")
    imports.push("import { JWTStrategy } from './middlewares/passport'")

    const missingImports = imports.filter((line) => !content.includes(line)).join('\n')
    if (missingImports) {
      content = `${missingImports}\n${content}`
    }

    if (this.dbType == DbType.TYPEORM) {
      content = content.replace(/\n?import 'reflect-metadata'\n?/g, '\n')
      content = `import 'reflect-metadata'\n${content.replace(/^\n+/, '')}`
    }

    const dbBoot: string[] = []
    if (this.dbType == DbType.TYPEORM) {
      dbBoot.push(
        "AppDataSource.initialize()\n  .then(() => logger.info('🚀 Database connection is online...'))\n  .catch((error) => logger.error(error))\n"
      )
    }

    const passportSetup = "passport.use('jwt', JWTStrategy)\n\n"

    if (!content.includes("passport.use('jwt'")) {
      content = content.replace(/(const app = express\(\))/, `${passportSetup}$1`)
    }

    if (dbBoot.length && !content.includes('AppDataSource.initialize()')) {
      content = content.replace(/(const app = express\(\))/, `${dbBoot.join('')}$1`)
    }

    if (!content.includes('passport.initialize()')) {
      content = content.replace(/(app\.use\(express\.json\(\)\))/, `app.use(passport.initialize())\n$1`)
    }

    fs.writeFileSync(mainFile, content)
  }

  async installDependencies(): Promise<void> {
    console.log('================= Installing auth dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} bcrypt passport passport-jwt jsonwebtoken`)
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken`
    )
  }
}
