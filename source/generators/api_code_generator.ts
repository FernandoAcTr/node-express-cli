import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import 'colors'
import { CodeGenerator, DbType } from './code_generator'

export class ApiCodeGenerator implements CodeGenerator {
  createDirStructure() {
    fs.mkdirSync('./src', {
      recursive: true,
    })

    fs.mkdirSync('./src/database', {
      recursive: true,
    })

    fs.mkdirSync('./src/middlewares', {
      recursive: true,
    })

    fs.mkdirSync('./src/modules', {
      recursive: true,
    })

    fs.mkdirSync('./src/config', {
      recursive: true,
    })
  }

  createConfigFiles() {
    //gitignore
    const gitignore = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'gitignore'))
      .toString()
    fs.writeFileSync('.gitignore', gitignore)
    //env
    const env = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'env'))
      .toString()
    fs.writeFileSync('.env', env)
    //readme
    fs.writeFileSync('README.md', '')
    //tsconfig
    const tsconfig = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'tsconfig.json')
      )
      .toString()
    fs.writeFileSync('tsconfig.json', tsconfig)
  }

  fillDatabase(dbType: DbType) {
    if (dbType === DbType.TYPEORM) {
      //migrations dir
      fs.mkdirSync('./src/database/migrations', {
        recursive: true,
      })
      //entities dir
      fs.mkdirSync('./src/entities', {
        recursive: true,
      })

      //ormconfig
      const ormconfig = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'ormconfig.json'
          )
        )
        .toString()
      fs.writeFileSync('ormconfig.json', ormconfig)

      //database
      const database = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'database', 'database.ts')
        )
        .toString()
      fs.writeFileSync('./src/database/database.ts', database)

      //create user entity
      const user = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'user.typeorm.ts'
          )
        )
        .toString()
      fs.writeFileSync('./src/entities/user.entity.ts', user)

      //Install db
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i typeorm')

      //Add scripts
      shell.exec(
        'npm set-script migration:run "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:run"'
      )
      shell.exec(
        'npm set-script migration:revert "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:revert"'
      )
      shell.exec(
        'npm set-script migration:generate "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:generate --name"'
      )
    } else {
      //Install db
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i mongoose')
      //models dir
      fs.mkdirSync('./src/models', {
        recursive: true,
      })
      //database
      const database = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'database.mongo.ts'
          )
        )
        .toString()
      fs.writeFileSync('./src/database/database.ts', database)

      //create user model
      const user = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'user.mongo.ts'
          )
        )
        .toString()
      fs.writeFileSync('./src/models/user.model.ts', user)
    }
  }

  fillMiddlewares() {
    //validator
    const validator = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'api', 'validator.ts')
      )
      .toString()
    fs.writeFileSync('./src/middlewares/validator.ts', validator)

    //express-validators
    const express_validators = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'api',
          'express_validators.ts'
        )
      )
      .toString()
    fs.writeFileSync(
      './src/middlewares/express_validators.ts',
      express_validators
    )

    //error handler
    const error_handler = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'api', 'error_handler.ts')
      )
      .toString()
    fs.writeFileSync('./src/middlewares/error_handler.ts', error_handler)

    //rate limiter
    const rate_limiter = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'api', 'rate_limiter.ts')
      )
      .toString()
    fs.writeFileSync('./src/middlewares/rate_limiter.ts', rate_limiter)
  }

  fillSettings(): void {
    const settings = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'settings.ts'))
      .toString()
    fs.writeFileSync('./src/config/settings.ts', settings)
  }

  fillRouter(): void {
    const router = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'api', 'router.ts')
      )
      .toString()
    fs.writeFileSync('./src/router.ts', router)
  }

  fillIndex(): void {
    const index = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'api', 'index.ts')
      )
      .toString()
    fs.writeFileSync('./src/index.ts', index)
  }

  installDependencies(): void {
    console.log(
      '================= Installing dependencies ================='.yellow
    )
    shell.exec(
      'npm i express express-validator cors bcrypt jsonwebtoken dotenv passport passport-jwt morgan helmet rate-limiter-flexible'
    )
  }

  installDevDependencies(): void {
    console.log(
      '================= Installing dev dependencies ================='.yellow
    )
    shell.exec(
      'npm i -D @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/passport @types/passport-jwt @types/morgan @types/node typescript tsc-watch ts-node'
    )
  }

  addScripts(): void {
    shell.exec(`npm set-script dev 'tsc-watch --onSuccess "node build/index"'`)
    shell.exec('npm set-script clean "rm -rf build"')
    shell.exec('npm set-script build "tsc"')
    shell.exec('npm set-script start "node build"')
  }

  init(dbType: DbType) {
    this.createDirStructure()
    this.createConfigFiles()
    this.fillDatabase(dbType)
    this.fillMiddlewares()
    this.fillSettings()
    this.fillRouter()
    this.fillIndex()
    this.installDependencies()
    this.installDevDependencies()
    this.addScripts()
  }
}
