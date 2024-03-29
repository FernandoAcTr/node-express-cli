import fs from 'fs-extra'
import 'colors'
import path from 'path'
import { DbType, ProjectType } from '../interfaces/code.generator'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'

export class CliGenerator {
  installPrettier() {
    console.log('================= Installing Prettier ================='.yellow)
    shellService.exec(`${configService.getDevInstallCommand()} prettier`)

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prettier'), './')
    shellService.exec('npm pkg set scripts.prettier:fix="prettier --config .prettierrc.json --write src/**/**/*.ts"')
  }

  async installEslint() {
    console.log('================= Installing Eslint ================='.yellow)
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`
    )

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'eslint'), './')

    shellService.exec('npm pkg set scripts.lint="eslint . --ext .ts"')
    shellService.exec('npm pkg set scripts.lint:fix="eslint . --ext .ts --fix"')
  }

  installSocket() {
    console.log('================= Installing Socket.io ================='.yellow)

    shellService.execAsync(`${configService.getInstallCommand()} socket.io`).then(() => {
      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'socketio'), './src')
    })
  }

  async installDatabase(dbType: DbType): Promise<void> {
    console.log('================= Installing ORM ================='.yellow)

    await shellService.execAsync(`${configService.getInstallCommand()} @faker-js/faker`)
    shellService.exec('npm pkg set scripts.db:seed="ts-node ./src/database/seeder.ts"')

    fs.mkdirSync('./src/database/seeds', {
      recursive: true,
    })

    fs.mkdirSync('./src/database/factories', {
      recursive: true,
    })

    if (dbType === DbType.TYPEORM) {
      await shellService.execAsync(`${configService.getInstallCommand()} typeorm reflect-metadata`)

      shellService.exec(
        'npm pkg set scripts.typeorm="ts-node -r ./src/alias ./node_modules/typeorm/cli.js -d ./src/database/datasources.ts"'
      )
      shellService.exec('npm pkg set scripts.m:run="npm run typeorm migration:run"')
      shellService.exec('npm pkg set scripts.m:revert="npm run typeorm migration:revert"')
      shellService.exec('npm pkg set scripts.m:generate="npm run typeorm migration:generate"')
      shellService.exec('npm pkg set scripts.m:create="npx typeorm migration:create"')
      shellService.exec('npm pkg set scripts.m:drop="npm run typeorm schema:drop"')
      shellService.exec('npm pkg set scripts.m:run:fresh="npm run m:drop && npm run m:run && npm run db:seed"')

      fs.mkdirSync('./src/entities', {
        recursive: true,
      })

      fs.mkdirSync('./src/database/migrations', {
        recursive: true,
      })

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'seed.ts'),
        './src/database/seed.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'datasources.ts'),
        './src/database/datasources.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'seeder.ts'),
        './src/database/seeder.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'entities', 'seed.entity.ts'),
        './src/entities/seed.entity.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', '1677294697200-seeds.ts'),
        './src/database/migrations/1677294697200-seeds.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', 'index.ts'),
        './src/database/migrations/index.ts'
      )

      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log("Please add the line: import 'reflect-metadata' at the top of your index.ts".green)
      console.log('You must install specific database driver like mysql or pg'.green)
      console.log(
        'You need to initialize the AppDataSource manually. A greet place is in start() method in your index.ts'.green
      )
      console.log('-------------------------------------------------------------------------------------------'.green)
    } else if (dbType === DbType.MONGO) {
      await shellService.execAsync(`${configService.getInstallCommand()} mongoose`)

      fs.mkdirSync('./src/models', {
        recursive: true,
      })

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'datasources.ts'),
        './src/database/datasources.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'seed.ts'),
        './src/database/seed.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'seeder.ts'),
        './src/database/seeder.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'models', 'seed.model.ts'),
        './src/models/seed.model.ts'
      )

      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log('Now you need to import datasources.ts in your index.ts in order to connect with mongo'.green)
      console.log('-------------------------------------------------------------------------------------------'.green)
    } else if (dbType === DbType.SEQUELIZE) {
      await shellService.execAsync(`${configService.getInstallCommand()} sequelize`)
      await shellService.execAsync(`${configService.getDevInstallCommand()} sequelize-cli`)

      shellService.exec('npm pkg set scripts.db:migrate="npx sequelize-cli db:migrate"')
      shellService.exec('npm pkg set scripts.db:migrate:undo="npx sequelize-cli db:migrate:undo"')
      shellService.exec(
        'npm pkg set scripts.db:migrate:fresh="npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate"'
      )
      shellService.exec('npm pkg set scripts.db:make:migration="npx sequelize-cli migration:generate --name"')

      fs.mkdirSync('./src/entities', {
        recursive: true,
      })

      fs.mkdirSync('./src/database/migrations', {
        recursive: true,
      })

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'datasources.ts'),
        './src/database/datasources.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'sequelize-cli.json'),
        './src/database/sequelize-cli.json'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', '.sequelizerc'),
        './.sequelizerc'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'seeder.ts'),
        './src/database/seeder.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'entities', 'seed.entity.ts'),
        './src/entities/seed.entity.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'seed.ts'),
        './src/database/seed.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'migrations', '00000000000000-seeds.js'),
        './src/database/migrations/00000000000000-seeds.js'
      )

      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log('You must install specific database driver like mysql2 or pg'.green)
      console.log(
        `You can use the .authenticate() function to test if the connection is OK. A greet place is in start() method in your index.ts`
          .green
      )
      console.log(`sequelize.authenticate().then((x) => logger.info('🚀 Database is ready'))`.green)
      console.log('-------------------------------------------------------------------------------------------'.green)
    } else if (dbType == DbType.PRISMA) {
      await shellService.execAsync(`${configService.getInstallCommand()} @prisma/client`)
      await shellService.execAsync(`${configService.getDevInstallCommand()} prisma`)

      shellService.exec('npm pkg set scripts.m:run="npx prisma migrate dev --schema src/database/prisma/schema.prisma"')
      shellService.exec(
        'npm pkg set scripts.m:run:deploy="npx prisma migrate deploy --schema src/database/prisma/schema.prisma"'
      )
      shellService.exec(
        'npm pkg set scripts.m:reset="npx prisma migrate reset --schema src/database/prisma/schema.prisma"'
      )
      shellService.exec(
        'npm pkg set scripts.m:generate="npx prisma generate --schema src/database/prisma/schema.prisma"'
      )

      fs.mkdirSync('./src/database/prisma', {
        recursive: true,
      })

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'seed.ts'),
        './src/database/seed.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'schema.prisma'),
        './src/database/prisma/schema.prisma'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'seeder.ts'),
        './src/database/seeder.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'client.ts'),
        './src/database/client.ts'
      )

      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log(
        `You need to create your first migration. Run ${configService.getConfig().package_manger} run m:run`.green
      )
      console.log('Please add the next configuration in your package.json'.green)
      console.log(
        `prisma: ${JSON.stringify(
          {
            schema: './src/database/prisma/schema.prisma',
            seed: 'ts-node src/database/prisma/seed.ts',
          },
          null,
          2
        )}`.green
      )
      console.log('-------------------------------------------------------------------------------------------'.green)
    }
  }

  async installAuth(dbType: DbType) {
    console.log('================= Installing auth dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} bcrypt passport passport-jwt jsonwebtoken`)
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken`
    )

    if (dbType === DbType.TYPEORM) {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'entities', 'user.entity.ts'),
        './src/entities/user.entity.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'entities', 'refresh_token.entity.ts'),
        './src/entities/refresh_token.entity.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'entities', 'role.entity.ts'),
        './src/entities/role.entity.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'auth'), './src/modules/auth')
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', '1677294697210-users.ts'),
        './src/database/migrations/1677294697210-users.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', '1677304667455-refresh-tokens.ts'),
        './src/database/migrations/1677304667455-refresh-tokens.ts'
      )
      fs.copyFile(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'generated',
          'typeorm',
          'migrations',
          '1677458918277-reset-password-tokens.ts'
        ),
        './src/database/migrations/1677458918277-reset-password-tokens.ts'
      )
    } else if (dbType == DbType.MONGO) {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'models', 'user.model.ts'),
        './src/models/user.model.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'models', 'refresh_token.model.ts'),
        './src/models/refresh_token.model.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'auth'), './src/modules/auth')
    } else if (dbType === DbType.SEQUELIZE) {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'entities', 'user.entity.ts'),
        './src/entities/user.entity.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'entities', 'refresh_token.entity.ts'),
        './src/entities/refresh_token.entity.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'entities', 'role.entity.ts'),
        './src/entities/role.entity.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'migrations', '20230216034845-users.js'),
        './src/database/migrations/20230216034845-users.js'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'migrations', '20230506165613-refresh-tokens.js'),
        './src/database/migrations/20230506165613-refresh-tokens.js'
      )

      fs.copyFile(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'generated',
          'sequelize',
          'migrations',
          '20230506170031-reset-password-tokens.js'
        ),
        './src/database/migrations/20230506170031-reset-password-tokens.js'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'auth'), './src/modules/auth')
    } else if (dbType == DbType.PRISMA) {
      //TODO modify PRISMA
      const authContent = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'schema.prisma.auth'))
        .toString()

      fs.appendFileSync('./src/database/prisma/schema.prisma', authContent)

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'auth'), './src/modules/auth')

      shellService.exec('yarn m:run --name auth')
    }

    console.log('-------------------------------------------------------------------------------------------'.green)
    console.log(
      'Now you need to add passport.initialize() and passport.use(JWTStrategy) in your middlewares section on index.ts'
        .green
    )
    console.log('You need to add auth module routes to the app router'.green)
    console.log(
      'You need to run the database migrations. Depending on the ORM you chose it is necessary to run an specific command'
        .green
    )
    console.log('-------------------------------------------------------------------------------------------'.green)
  }

  async installMailer() {
    console.log('================= Installing Mail dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} handlebars nodemailer`)
    await shellService.execAsync(`${configService.getDevInstallCommand()} @types/nodemailer`)

    fs.copyFileSync(
      path.resolve(__dirname, '..', '..', 'code', 'generated', 'mailer', 'mailer.ts'),
      './src/helpers/mailer.ts'
    )
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mailer', 'templates'), './src/templates')
    console.log(
      "A new class called mailer has been installed inside helpers directory. You can use it to send emails and notifications via the notification template or create your own email's templates"
        .green
    )
  }

  makeSeeder(name: string, dbType: DbType) {
    if (!fs.existsSync('./src/database/seeds')) {
      fs.mkdirSync('./src/database/seeds', {
        recursive: true,
      })
    }

    const filename = `${name[0].toLowerCase()}${name.substring(1)}.seeder.ts`
    const seederName = `${name[0].toUpperCase()}${name.substring(1)}Seeder`

    const seeder =
      dbType == DbType.PRISMA
        ? fs
            .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prisma', 'seedTemplate.ts'))
            .toString()
            .replace(/__ClassName__/g, seederName)
        : fs
            .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'seeds', 'seedTemplate.ts'))
            .toString()
            .replace(/__ClassName__/g, seederName)

    fs.writeFileSync(`./src/database/seeds/${filename}`, seeder)
  }

  makeEntity(name: String, dbType: DbType) {
    const codeDirs = {
      [DbType.MONGO]: 'mongo',
      [DbType.TYPEORM]: 'typeorm',
      [DbType.SEQUELIZE]: 'sequelize',
    }
    const codeDir = codeDirs[dbType]

    const entityName = `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}`

    if (dbType == DbType.MONGO) {
      if (!fs.existsSync('./src/models')) fs.mkdirSync('./src/models')

      const model = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'model.ts'))
        .toString()
        .replace(/__EntityName__/g, entityName)
      fs.writeFileSync(`./src/models/${name.toLowerCase()}.model.ts`, model)
    } else {
      if (!fs.existsSync('./src/entities')) fs.mkdirSync('./src/entities')

      const entity = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'entity.ts'))
        .toString()
        .replace(/__EntityName__/g, entityName)
      fs.writeFileSync(`./src/entities/${name.toLowerCase()}.entity.ts`, entity)
    }
  }

  makeFactory(name: String) {
    if (!fs.existsSync('./src/database/factories')) {
      fs.mkdirSync('./src/database/factories', {
        recursive: true,
      })
    }

    const factoryName = `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}`

    const entity = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'factory', 'factoryTemplate.ts'))
      .toString()
      .replace(/__ClassName__/g, factoryName)
    fs.writeFileSync(`./src/database/factories/${name.toLowerCase()}.factory.ts`, entity)
  }

  makeModule(name: string, dbType: DbType, projectType: ProjectType) {
    if (projectType == ProjectType.API) {
      const dir = `./src/modules/${name.toLowerCase()}`
      const servicesDir = `./src/modules/${name.toLowerCase()}/services`
      const codeDirs = {
        [DbType.MONGO]: 'mongo',
        [DbType.TYPEORM]: 'typeorm',
        [DbType.SEQUELIZE]: 'sequelize',
        [DbType.PRISMA]: 'prisma',
      }
      const codeDir = codeDirs[dbType]

      fs.mkdirSync(dir, {
        recursive: true,
      })

      fs.mkdirSync(servicesDir, {
        recursive: true,
      })

      const serviceName = `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}`

      //router
      const routes = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'routes.ts'))
        .toString()
        .replace(/__modulename__/g, name.toLowerCase())
      fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)

      //validator
      const validator = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'validator.ts'))
        .toString()
      fs.writeFileSync(`${dir}/${name.toLowerCase()}.validator.ts`, validator)

      //controller
      const controller = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'controller.ts'))
        .toString()
        .replace(/__ServiceName__/g, serviceName)
      fs.writeFileSync(`${dir}/${name.toLowerCase()}.controller.ts`, controller)

      //services
      const service = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'service.ts')
        )
        .toString()
        .replace('__ServiceName__', serviceName)
      fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}.service.ts`, service)

      const index = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'index.ts')
        )
        .toString()
        .replace(/__service__/g, name.toLowerCase())
      fs.writeFileSync(`${servicesDir}/index.ts`, index)
    } else {
      const modulename = name.toLowerCase()
      const entityName = name[0].toUpperCase() + name.substring(1).toLowerCase()
      const moduleDir = `./src/graphql/modules/${modulename}s`

      fs.mkdirSync(moduleDir, { recursive: true })
      fs.mkdirSync(`${moduleDir}/services`, { recursive: true })

      const service = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'services', 'module.service.ts')
        )
        .toString()
        .replace(new RegExp('__EntityName__', 'g'), entityName)

      const schema = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'module.schema.ts'))
        .toString()
        .replace(new RegExp('__EntityName__', 'g'), entityName)
        .replace(new RegExp('__modulename__', 'g'), modulename)

      const resolver = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'module.resolver.ts')
        )
        .toString()
        .replace(new RegExp('__EntityName__', 'g'), entityName)
        .replace(new RegExp('__modulename__', 'g'), modulename)

      const index = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'index.ts'))
        .toString()
        .replace(new RegExp('__EntityName__', 'g'), entityName)
        .replace(new RegExp('__modulename__', 'g'), modulename)

      fs.writeFileSync(`${moduleDir}/${modulename}.schema.ts`, schema)
      fs.writeFileSync(`${moduleDir}/${modulename}.resolver.ts`, resolver)
      fs.writeFileSync(`${moduleDir}/services/${modulename}.service.ts`, service)
      fs.writeFileSync(`${moduleDir}/index.ts`, index)
    }
  }

  async installTests() {
    console.log('================= Installing Test dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} @faker-js/faker`)
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} jest @types/jest ts-jest supertest @types/supertest`
    )

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'tests', 'tests'), './src/tests')
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'tests', 'jest.config.js'), './jest.config.js')
    shellService.exec('npm pkg set scripts.test="npx jest"')
  }
}
