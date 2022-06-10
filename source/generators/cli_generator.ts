import fs from 'fs-extra'
import shell from 'shelljs'
import 'colors'
import path from 'path'
import { DbType } from './code_generator'

export class CliGenerator {
  installPrettier() {
    console.log('================= Installing Prettier ================='.yellow)
    shell.exec('npm i -D prettier')

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prettier'), './')
    shell.exec('npm set-script prettier:fix "prettier --config .prettierrc.json --write src/**/**/*.ts"')
  }

  installEslint() {
    console.log('================= Installing Eslint ================='.yellow)
    shell.exec(
      'npm install -D eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin'
    )

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'eslint'), './')

    shell.exec('npm set-script lint "eslint . --ext .ts"')
    shell.exec('npm set-script lint:fix "eslint . --ext .ts --fix"')
  }

  installSocket() {
    console.log('================= Installing Socket.io ================='.yellow)
    shell.exec('npm i socket.io')

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'socketio'), './src')
  }

  installDatabase(dbType: DbType): void {
    if (dbType === DbType.TYPEORM) {
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i typeorm reflect-metadata')

      shell.exec(
        'npm set-script typeorm "ts-node -r ./src/alias ./node_modules/typeorm/cli.js -d ./src/database/datasources.ts"'
      )
      shell.exec('npm set-script m:run "npm run typeorm migration:run"')
      shell.exec('npm set-script m:revert "npm run typeorm migration:revert"')
      shell.exec('npm set-script m:generate "npm run typeorm migration:generate"')

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

      console.log('Please import package reflect-metadata at tht top of your index.ts'.yellow)
      console.log('You must install specific database driver like mysql or pg'.bgYellow)
      console.log(
        'You need to initialize the AppDataSource manually. A greet place is in start() method in your index.ts'.yellow
      )
    } else {
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i mongoose')

      fs.mkdirSync('./src/models', {
        recursive: true,
      })

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'database.ts'),
        './src/database/database.ts'
      )

      console.log('Now you need to import database.ts in your index.ts in order to connect with mongo'.yellow)
    }
  }

  installAuth(dbType: DbType) {
    console.log('================= Installing auth dependencies ================='.yellow)
    shell.exec('npm i bcrypt passport passport-jwt jsonwebtoken')
    shell.exec('npm i -D @types/bcrypt @types/passport @types/passport-jwt @types/jsonwebtoken')

    if (dbType === DbType.TYPEORM) {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'user.entity.ts'),
        './src/entities/user.entity.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'auth'), './src/modules/auth')
    } else {
      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'user.model.ts'),
        './src/models/user.model.ts'
      )

      fs.copyFile(
        path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'passport.ts'),
        './src/middlewares/passport.ts'
      )

      fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'auth'), './src/modules/auth')
    }

    console.log("Now you need to add passport.initialize() and passport.use(JWTStrategy) in your middlewares section on index.ts".bgYellow)
    console.log("You need to add auth module routes to the app router".green)
  }
}
