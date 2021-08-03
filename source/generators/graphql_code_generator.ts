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

    fs.mkdirSync('./src/graphql/modules/default', {
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
    const schemaIndex = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'schema.index.ts'
        )
      )
      .toString()
    fs.writeFileSync('./src/index.ts', index)
    fs.writeFileSync('./src/graphql/index.ts', schemaIndex)
  }

  installDependencies(): void {
    console.log(
      '================= Installing dependencies ================='.yellow
    )
    shell.exec(
      'npm i express cors dotenv bcrypt jsonwebtoken @graphql-tools/schema apollo-server-express graphql lodash'
    )
  }

  installDevDependencies(): void {
    console.log(
      '================= Installing dev dependencies ================='.yellow
    )
    shell.exec(
      'npm i -D @types/express @types/bcrypt @types/jsonwebtoken @types/lodash @types/node ts-node tsc-watch typescript'
    )
  }

  addScripts(): void {
    shell.exec(`npm set-script dev 'tsc-watch --onSuccess "node build/index"'`)
    shell.exec('npm set-script clean "rm -rf build"')
    shell.exec('npm set-script build "tsc"')
    shell.exec('npm set-script start "node build"')
  }

  createDefaultModule() {
    const schema = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'default',
          'default.schema.ts'
        )
      )
      .toString()
    const resolver = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'default',
          'default.resolver.ts'
        )
      )
      .toString()
    const index = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'default',
          'index.ts'
        )
      )
      .toString()
    fs.writeFileSync('./src/graphql/modules/default/default.schema.ts', schema)
    fs.writeFileSync(
      './src/graphql/modules/default/default.resolver.ts',
      resolver
    )
    fs.writeFileSync('./src/graphql/modules/default/index.ts', index)
  }

  init(dbType: DbType): void {
    this.createDirStructure()
    this.createConfigFiles()
    this.fillDatabase(dbType)
    this.fillMiddlewares()
    this.fillSettings()
    this.fillRouter()
    this.fillIndex()
    this.createDefaultModule()
    this.installDependencies()
    this.installDevDependencies()
    this.addScripts()
  }
}
