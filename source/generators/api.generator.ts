import 'colors'
import fs from 'fs-extra'
import path from 'path'
import shell from 'shelljs'
import { CodeGenerator } from '../interfaces/code.generator'
import { configService } from '../services/config.service'

export class ApiCodeGenerator extends CodeGenerator {
  protected createDirStructure() {
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

  protected copyCode(): void {
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'api'), './')
    fs.rename('./gitignore', './.gitignore')
  }

  protected installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec(
      `${configService.getInstallCommand()} app-root-path bcrypt cors dotenv express express-validator helmet module-alias morgan rate-limiter-flexible winston`
    )

    shell.exec(
      `${configService.getDevInstallCommand()} @types/app-root-path @types/bcrypt @types/cors @types/express @types/module-alias @types/morgan @types/node ts-node tsc-watch typescript`
    )
  }

  init() {
    this.createDirStructure()
    this.copyCode()
    this.installDependencies()
  }
}
