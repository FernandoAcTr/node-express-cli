import 'colors'
import fs from 'fs-extra'
import path from 'path'
import shell from 'shelljs'
import { CodeGenerator } from '../interfaces/code.generator'
import { configService } from '../services/config.service'

export class GraphqlCodeGenerator extends CodeGenerator {
  protected createDirStructure(): void {
    fs.mkdirSync('./src', {
      recursive: true,
    })

    fs.mkdirSync('./src/database', {
      recursive: true,
    })

    fs.mkdirSync('./src/graphql', {
      recursive: true,
    })

    fs.mkdirSync('./src/graphql/modules', {
      recursive: true,
    })

    fs.mkdirSync('./src/graphql/modules/hello-world', {
      recursive: true,
    })

    fs.mkdirSync('./src/config', {
      recursive: true,
    })
  }

  protected copyCode(): void {
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'graphql_api'), './')
    fs.rename('./gitignore', './.gitignore')
  }

  protected installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec(
      `${configService.getInstallCommand()} app-root-path bcrypt cors dotenv express module-alias winston graphql graphql-tag @apollo/server @graphql-tools/schema`
    )
    shell.exec(
      `${configService.getDevInstallCommand()} @types/app-root-path @types/bcrypt @types/cors @types/express @types/module-alias @types/node ts-node tsc-watch typescript`
    )
  }

  init() {
    this.createDirStructure()
    this.copyCode()
    this.installDependencies()
  }
}
