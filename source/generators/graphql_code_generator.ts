import 'colors'
import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import { CodeGenerator, DbType } from './code_generator'
import {
  createDatabaseConfig,
  createCommonConfigFiles,
  createSettingsFile,
} from '../utils/utils'

export class GraphqlCodeGenerator implements CodeGenerator {
  createDirStructure(): void {
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

    fs.mkdirSync('./src/config', {
      recursive: true,
    })

    fs.mkdirSync('./src/interfaces', {
      recursive: true,
    })
  }

  createConfigFiles(): void {
    createCommonConfigFiles()
  }

  fillDatabase(dbType: DbType) {
    createDatabaseConfig(dbType)
  }

  fillMiddlewares(): void {
    //
  }

  fillSettings(): void {
    createSettingsFile()
  }

  fillRouter(): void {
    //
  }

  fillIndex(): void {
    const index = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'graphql', 'index.ts')
      )
      .toString()
    fs.writeFileSync('./src/index.ts', index)
  }

  installDependencies(): void {
    console.log(
      '================= Installing dependencies ================='.yellow
    )
    shell.exec(
      'npm i express cors dotenv @graphql-tools/schema apollo-server-express graphql lodash'
    )
  }

  installDevDependencies(): void {
    console.log(
      '================= Installing dev dependencies ================='.yellow
    )
    shell.exec(
      'npm i -D @types/express @types/lodash @types/node ts-node tsc-watch typescript'
    )
  }

  addScripts(): void {
    shell.exec(`npm set-script dev 'tsc-watch --onSuccess "node build/index"'`)
    shell.exec('npm set-script clean "rm -rf build"')
    shell.exec('npm set-script build "tsc"')
    shell.exec('npm set-script start "node build"')
  }

  init(dbType: DbType): void {
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
