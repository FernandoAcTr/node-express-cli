import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import 'colors'
import { CodeGenerator, DbType } from './code_generator'

export class ApiCodeGenerator extends CodeGenerator {
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

    fs.mkdirSync('./src/helpers', {
      recursive: true,
    })
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

    //logger helper
    const logguer = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'api', 'logger.ts')
      )
      .toString()
    fs.writeFileSync('./src/helpers/logger.ts', logguer)
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
      'npm i app-root-path winston express express-validator module-alias cors bcrypt jsonwebtoken dotenv passport passport-jwt morgan helmet rate-limiter-flexible'
    )
  }

  installDevDependencies(): void {
    console.log(
      '================= Installing dev dependencies ================='.yellow
    )
    shell.exec(
      'npm i -D @types/app-root-path @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/passport @types/passport-jwt @types/morgan @types/node typescript tsc-watch ts-node'
    )
  }

  addScripts(): void {
    shell.exec(
      `npm set-script dev 'tsc-watch --onSuccess \"node build/index\"'`
    )
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

  makeModule(name: String): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    //controller
    const controller = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'api',
          'module',
          'controller.ts'
        )
      )
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.controller.ts`, controller)

    //service
    const service = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'api',
          'module',
          'service.ts'
        )
      )
      .toString()
      .replace(
        '__ServiceName__',
        `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}Service`
      )
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.service.ts`, service)

    //router
    const routes = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'api',
          'module',
          'routes.ts'
        )
      )
      .toString()
      .replace(/__modulename__/g, name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)

    //validator
    const validator = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'api',
          'module',
          'validator.ts'
        )
      )
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.validator.ts`, validator)
  }
}
