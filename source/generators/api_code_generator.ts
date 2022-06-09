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

  copyCode(dbType: DbType): void {
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'api'), './')

    if (dbType === DbType.TYPEORM) {
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'database.ts'), './src/database/database.ts')
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'user.entity.ts'), './src/entities/user.entity.ts')
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'ormconfig.json'), './ormconfig.json')
    } else {
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'database.ts'), './src/database/database.ts')
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'user.model.ts'), './src/entities/user.model.ts')
    }
  }

  installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec('npm install')
  }


  init(dbType: DbType) {
    this.createDirStructure()
    this.copyCode(dbType)
    this.installDependencies()
    this.installDatabase(dbType)
  }

  makeModule(name: String): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    const servicesDir = `./src/modules/${name.toLowerCase()}/services`
    fs.mkdirSync(dir, {
      recursive: true,
    })

    fs.mkdirSync(servicesDir, {
      recursive: true,
    })

    const serviceName = `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}`

    //router
    const routes = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'routes.ts'))
      .toString()
      .replace(/__modulename__/g, name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)

    //validator
    const validator = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'validator.ts'))
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.validator.ts`, validator)

    //controller
    const controller = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'controller.ts'))
      .toString()
      .replace(/__ServiceName__/g, serviceName)
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.controller.ts`, controller)

    //services
    const destroyer = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'services', 'service_destroyer.ts'))
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_destroyer.ts`, destroyer)

    const finder = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'services', 'service_finder.ts'))
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_finder.ts`, finder)

    const saver = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'services', 'service_saver.ts'))
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_saver.ts`, saver)

    const updater = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'services', 'service_updater.ts'))
      .toString()
      .replace('__ServiceName__', serviceName)
    fs.writeFileSync(`${servicesDir}/${name.toLowerCase()}_updater.ts`, updater)

    const index = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'module', 'services', 'index.ts'))
      .toString()
      .replace(/__service__/g, name.toLowerCase())
    fs.writeFileSync(`${servicesDir}/index.ts`, index)
  }


}
