import 'colors'
import fs from 'fs-extra'
import path from 'path'
import { CodeGenerator } from '../interfaces/code.generator'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'

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

  protected async installDependencies(): Promise<void> {
    console.log('================= Installing dependencies ================='.yellow)
    await shellService.execAsync(
      `${configService.getInstallCommand()} app-root-path bcrypt cors dotenv express module-alias winston graphql graphql-tag @apollo/server @graphql-tools/schema`
    )
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} @types/app-root-path @types/bcrypt @types/cors @types/express @types/module-alias @types/node ts-node tsc-watch typescript`
    )
  }

  async init() {
    this.createDirStructure()
    this.copyCode()
    await this.installDependencies()
  }
}
