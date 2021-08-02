import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import { DbType } from '../generators/code_generator'

export function createDatabaseConfig(dbType: DbType) {
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
        path.resolve(__dirname, '..', '..', 'code', 'database', 'user.mongo.ts')
      )
      .toString()
    fs.writeFileSync('./src/models/user.model.ts', user)
  }
}

export function createCommonConfigFiles() {
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
    .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'tsconfig.json'))
    .toString()
  fs.writeFileSync('tsconfig.json', tsconfig)
}

export function createSettingsFile() {
  const settings = fs
    .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'settings.ts'))
    .toString()
  fs.writeFileSync('./src/config/settings.ts', settings)
}
