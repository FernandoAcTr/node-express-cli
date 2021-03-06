import fs from 'fs-extra'
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

  copyCode(): void {
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'api'), './')
  }

  installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec(
      'yarn add app-root-path bcrypt cors dotenv dotenv-parse-variables express express-validator helmet module-alias morgan rate-limiter-flexible winston'
    )

    shell.exec(
      'yarn add -D @types/app-root-path @types/bcrypt @types/cors @types/dotenv-parse-variables @types/express @types/module-alias @types/morgan @types/node ts-node tsc-watch typescript'
    )
  }

  init() {
    this.createDirStructure()
    this.copyCode()
    this.installDependencies()
  }

  makeModule(name: String, dbType: DbType): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    const servicesDir = `./src/modules/${name.toLowerCase()}/services`
    const codeDir = dbType == DbType.MONGO ? 'mongo' : 'typeorm'

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
    const destroyer = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'service_destroyer.ts')
      )
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_destroyer.ts`, destroyer)

    const finder = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'service_finder.ts')
      )
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_finder.ts`, finder)

    const saver = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'service_saver.ts')
      )
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_saver.ts`, saver)

    const updater = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'service_updater.ts')
      )
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_updater.ts`, updater)

    const index = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', codeDir, 'module', 'services', 'index.ts'))
      .toString()
      .replace(/__service__/g, name.toLowerCase())
    fs.writeFileSync(`${servicesDir}/index.ts`, index)
  }
}
