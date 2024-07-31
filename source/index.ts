#!/usr/bin/env node
import * as inquirer from '@inquirer/prompts'
import figlet from 'figlet'
import gradient from 'gradient-string'
import { argv } from './plugins/yargs'
import { ApiCodeGenerator } from './generators/api.generator'
import { DbType, PackageManager, ProjectType } from './interfaces/code.generator'
import { CliGenerator } from './generators/cli.generator'
import { GraphqlCodeGenerator } from './generators/graphql.generator'

import { ConfigService } from './services/config.service'
import { shellService } from './services/shell.service'

const apiGenerator = new ApiCodeGenerator()
const graphqlGenerator = new GraphqlCodeGenerator()
const cliGenerator = new CliGenerator()
const configService = new ConfigService()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function init() {
  figlet.text('Node-Express-CLI', { font: 'Standard' }, (err, data) => {
    console.log(gradient.pastel.multiline(data))
  })

  await sleep(500)

  const type = await inquirer.select({
    message: 'Choose type of project',
    choices: Object.values(ProjectType).map((x) => ({ name: x, value: x })),
  })

  const manager = await inquirer.select({
    message: 'Choose package manager',
    choices: Object.values(PackageManager).map((x) => ({ name: x, value: x })),
  })

  await generate(type, manager)
  console.log('-------------------------------------------------------------------------------------------'.green)
  console.log("Cool! All ready. The next step is to create an .env file and run the command 'npm run dev'".green)
  console.log('-------------------------------------------------------------------------------------------'.green)
}

async function generate(typeProject: ProjectType, manager: PackageManager) {
  configService.writeConfig({
    project: typeProject,
    package_manger: manager,
  })

  if (typeProject === ProjectType.API) {
    await apiGenerator.init()
  } else if (typeProject === ProjectType.GRAPH) {
    await graphqlGenerator.init()
  }
}

async function askForDatabase() {
  const question = await inquirer.select({
    message: 'Choose an ORM',
    choices: Object.values(DbType).map((x) => ({ name: x, value: x })),
  })

  const config = configService.getConfig()
  config.orm = question
  configService.writeConfig(config)

  return question
}

async function makeModule() {
  const config = configService.getConfig()
  const moduleName = await inquirer.input({
    message: 'Name of module:',
  })

  if (moduleName) {
    const dbType = config.orm ?? DbType.TYPEORM
    cliGenerator.makeModule(moduleName, dbType, config.project)
  }
}

async function makeSeeder() {
  const config = configService.getConfig()
  const seederName = await inquirer.input({
    message: 'Name of seeder:',
  })

  const dbType = config.orm ?? DbType.TYPEORM
  if (seederName) cliGenerator.makeSeeder(seederName, dbType)
}

async function makeEntity() {
  const config = configService.getConfig()

  if (config.orm == DbType.PRISMA) {
    console.log('================================'.yellow)
    console.log("Since you are using Prisma you don't need to make entities, Prisma generate them for you.".yellow)
    console.log('================================'.yellow)
    return
  }

  const entityName = await inquirer.input({
    message: 'Name of entity:',
  })

  const dbType = config.orm ?? DbType.TYPEORM
  if (entityName) cliGenerator.makeEntity(entityName, dbType)
}

async function makeFactory() {
  const name = await inquirer.input({
    message: 'Name of the model that belongs to Factory:',
  })
  if (!name) return

  cliGenerator.makeFactory(name)
}

async function makeMigration() {
  const config = configService.getConfig()
  const dbType = config.orm ?? DbType.TYPEORM
  if (dbType == DbType.MONGO) {
    console.log('================================'.yellow)
    console.log("Mongoose doesn't have migrations".yellow)
    console.log('================================'.yellow)
    return
  }
  if (dbType == DbType.PRISMA) {
    console.log('================================'.yellow)
    console.log("Prisma doesn't need custom migrations, please use the command to generate them.".yellow)
    console.log('================================'.yellow)
    return
  }

  const name = await inquirer.input({
    message: 'Name of migration:',
  })
  if (!name) return

  if (dbType == DbType.SEQUELIZE) {
    shellService.exec(`npm run db:make:migration ${name}`)
  } else if (dbType == DbType.TYPEORM) {
    shellService.exec(`npm run m:create ./src/database/migrations/${name}`)
  }
}

async function installSocket() {
  const confirm = await inquirer.confirm({
    message: 'Are you sure? This action will replace all your code in index.ts',
  })
  if (confirm) cliGenerator.installSocket()
}

async function installTests() {
  cliGenerator.installTests()
}

let command = (argv as any)._[0]
switch (command) {
  case 'init':
    init()
    break

  case 'make:module':
    makeModule()
    break

  case 'install:prettier':
    cliGenerator.installPrettier()
    break

  case 'install:eslint':
    cliGenerator.installEslint()
    break

  case 'install:socket':
    installSocket()
    break

  case 'install:database':
    askForDatabase().then((dbType) => {
      cliGenerator.installDatabase(dbType)
    })
    break

  case 'install:auth':
    const config = configService.getConfig()
    if (!config.orm) {
      console.log('================================'.yellow)
      console.log('Install first the orm. Please exec node-express-cli install:database'.yellow)
      console.log('================================'.yellow)
    } else {
      cliGenerator.installAuth(config.orm)
    }
    break

  case 'install:mailer':
    cliGenerator.installMailer()
    break

  case 'make:seeder':
    makeSeeder()
    break

  case 'make:entity':
    makeEntity()
    break

  case 'make:migration':
    makeMigration()
    break

  case 'make:factory':
    makeFactory()
    break

  case 'install:tests':
    installTests()
    break

  default:
    console.log('Please enter --help to see a list of commands')
}
