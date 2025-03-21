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
      console.log('Install first the orm. Please exec node-express-cli install:database'.yellow)
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
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/auth/common/auth.routes.ts'), `./src/routes/auth.routes.ts`)
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
      shellService.exec(`${configService.getRunCommand()} m:run --name auth`)
    }

    console.log('-------------------------------------------------------------------------------------------'.green)
    console.log('Now you need to add passport.initialize() and passport.use(JWTStrategy) in your middlewares section on index.ts'.green)
    console.log('You need to add auth module routes to the app router'.green)
    console.log('You need to run the database migrations. Depending on the ORM you chose it is necessary to run an specific command'.green)
    console.log('-------------------------------------------------------------------------------------------'.green)
  }

  async installDependencies(): Promise<void> {
    console.log('================= Installing auth dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} bcrypt passport passport-jwt jsonwebtoken`)
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken`
    )
  }
}
