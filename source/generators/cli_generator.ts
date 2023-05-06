import fs from 'fs-extra'
import shell from 'shelljs'
import 'colors'
import path from 'path'
import { DbType } from './code_generator'

export class CliGenerator {
  installPrettier() {
    console.log('================= Installing Prettier ================='.yellow)
    shell.exec('yarn add -D prettier')

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prettier'), './')
    shell.exec('npm pkg set scripts.prettier:fix="prettier --config .prettierrc.json --write src/**/**/*.ts"')
  }

  installEslint() {
    console.log('================= Installing Eslint ================='.yellow)
    shell.exec(
      'yarn add -D eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin'
    )

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'eslint'), './')

    shell.exec('npm pkg set scripts.lint="eslint . --ext .ts"')
    shell.exec('npm pkg set scripts.lint:fix="eslint . --ext .ts --fix"')
  }

  installSocket() {
    console.log('================= Installing Socket.io ================='.yellow)
    shell.exec('yarn add socket.io')

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'socketio'), './src')
  }

  installDatabase(dbType: DbType): void {
    console.log('================= Installing ORM ================='.yellow)
    shell.exec('yarn add @faker-js/faker')
    shell.exec('npm pkg set scripts.db:seed="ts-node ./src/database/seeder.ts"')

    fs.mkdirSync('./src/database/seeds', {
      recursive: true,
    })

    fs.mkdirSync('./src/database/factories', {
      recursive: true,
    })

    fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'seeds', 'seed.ts'), './src/database/seed.ts')

    if (dbType === DbType.TYPEORM) {
      shell.exec('yarn add typeorm reflect-metadata')

      shell.exec(
        'npm pkg set scripts.typeorm="ts-node -r ./src/alias ./node_modules/typeorm/cli.js -d ./src/database/datasources.ts"'
      )
      shell.exec('npm pkg set scripts.m:run="npm run typeorm migration:run"')
      shell.exec('npm pkg set scripts.m:revert="npm run typeorm migration:revert"')
      shell.exec('npm pkg set scripts.m:generate="npm run typeorm migration:generate"')
      shell.exec('npm pkg set scripts.m:create="npx typeorm migration:create"')
      shell.exec('npm pkg set scripts.m:drop="npm run typeorm schema:drop"')
      shell.exec('npm pkg set scripts.m:run:fresh="npm run m:drop && npm run m:run && npm run db:seed"')

      fs.mkdirSync('./src/entities', {
        recursive: true,
      })

      fs.mkdirSync('./src/database/migrations', {
        recursive: true,
      })

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
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', '0000000000000-seeds.ts'),
        './src/database/migrations/0000000000000-seeds.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', 'index.ts'),
        './src/database/migrations/index.ts'
      )

      console.log("Please add the line 'import reflect-metadata' at the top of your index.ts".green)
      console.log('You must install specific database driver like mysql or pg'.green)
      console.log(
        'You need to initialize the AppDataSource manually. A greet place is in start() method in your index.ts'.green
      )
    } else if (dbType === DbType.MONGO) {
      shell.exec('yarn add mongoose')

      fs.mkdirSync('./src/models', {
        recursive: true,
      })

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'database.ts'),
        './src/database/database.ts'
      )

      console.log('Now you need to import database.ts in your index.ts in order to connect with mongo'.green)
    } else if (dbType === DbType.SEQUELIZE) {
      shell.exec('yarn add sequelize')
      shell.exec('yarn add -D sequelize-cli')

      shell.exec('npm pkg set scripts.db:migrate="npx sequelize-cli db:migrate"')
      shell.exec('npm pkg set scripts.db:migrate:undo="npx sequelize-cli db:migrate:undo"')
      shell.exec('npm pkg set scripts.db:migrate:fresh="npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate"')
      shell.exec('npm pkg set scripts.db:make:migration="npx sequelize-cli migration:generate"')

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

      console.log('You must install specific database driver like mysql2 or pg'.green)
      console.log(
        `You can use the .authenticate() function to test if the connection is OK. A greet place is in start() method in your index.ts`
          .green
      )
      console.log(`sequelize.authenticate().then((x) => logger.info('🚀 Database is ready'))`.green)
    }
  }

  installAuth(dbType: DbType) {
    console.log('================= Installing auth dependencies ================='.yellow)
    shell.exec('yarn add bcrypt passport passport-jwt jsonwebtoken')
    shell.exec('yarn add -D @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken')

    if (dbType === DbType.TYPEORM) {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'entities', 'user.entity.ts'),
        './src/entities/user.entity.ts'
      )
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'entities', 'token.entity.ts'),
        './src/entities/token.entity.ts'
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
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'migrations', '1677304667455-tokens.ts'),
        './src/database/migrations/1677304667455-tokens.ts'
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
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'user.model.ts'),
        './src/models/user.model.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'auth'), './src/modules/auth')
    } else if (dbType === DbType.SEQUELIZE) {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'user.entity.ts'),
        './src/entities/user.entity.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', '20230216034845-users.js'),
        './src/database/migrations/20230216034845-users.js'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'sequelize', 'auth'), './src/modules/auth')
    }

    console.log(
      'Now you need to add passport.initialize() and passport.use(JWTStrategy) in your middlewares section on index.ts'
        .green
    )
    console.log('You need to add auth module routes to the app router'.green)
    console.log(
      'You need to run the database migrations. Depending on the ORM you chose it is necessary to run an specific command'
        .green
    )
  }

  installMailer() {
    console.log('================= Installing Mail dependencies ================='.yellow)
    shell.exec('yarn add handlebars nodemailer')
    shell.exec('yarn add -D @types/nodemailer')

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

  makeSeeder(name: string) {
    const filename = `${name[0].toLowerCase()}${name.substring(1)}.seeder.ts`
    const seederName = `${name[0].toUpperCase()}${name.substring(1)}Seeder`

    const seeder = fs
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
      const model = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'model.ts'))
        .toString()
        .replace(/__EntityName__/g, entityName)
      fs.writeFileSync(`./src/models/${name.toLowerCase()}.model.ts`, model)
    } else {
      const entity = fs
        .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'entity.ts'))
        .toString()
        .replace(/__EntityName__/g, entityName)
      fs.writeFileSync(`./src/entities/${name.toLowerCase()}.entity.ts`, entity)
    }
  }
}
