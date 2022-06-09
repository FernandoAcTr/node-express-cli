import fs from 'fs'
import path from 'path'
import shell from 'shelljs'

export enum DbType {
  MONGO = 'mongo',
  TYPEORM = 'typeorm',
}

export abstract class CodeGenerator {
  abstract createDirStructure(): void
  abstract copyCode(dbType: DbType): void
  abstract installDependencies(): void

  abstract init(dbType: DbType): void
  abstract makeModule(name: String): void

  installDatabase(dbType: DbType): void {
    if (dbType === DbType.TYPEORM) {
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i typeorm')

      shell.exec('npm set-script migration:run "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:run"')
      shell.exec(
        'npm set-script migration:revert "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:revert"'
      )
      shell.exec(
        'npm set-script migration:generate "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:generate --name"'
      )
    } else {
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i mongoose')
    }
  }
}
