#!/usr/bin/env node
import fs from 'fs'
import inquirer from 'inquirer'
import { argv } from './plugins/yargs'
import { ApiCodeGenerator } from './generators/api.generator'
import { DbType, ProjectType } from './interfaces/code.generator'
import { CliGenerator } from './generators/cli.generator'
import { GraphqlCodeGenerator } from './generators/graphql.generator'
import shell from 'shelljs'
import figlet from 'figlet'
import gradient from 'gradient-string'

const apiGenerator = new ApiCodeGenerator()
const graphqlGenerator = new GraphqlCodeGenerator()
const cliGenerator = new CliGenerator()

const getConfig = (): { project: ProjectType; orm?: DbType } =>
  JSON.parse(fs.readFileSync('cli.config.json').toString())
const writeConfig = (config: any) => fs.writeFileSync('cli.config.json', JSON.stringify(config))

async function init() {
  figlet('N-E-C', (err, data) => {
    console.log(gradient.pastel.multiline(data))
  })

  const type = await inquirer.prompt({
    type: 'list',
    name: 'resp',
    message: 'Choose type of project',
    choices: Object.values(ProjectType),
  })

  generate(type.resp)
  console.log("Cool! All ready. The next step is to create an .env file and run the command 'npm run dev'".green)
}

function generate(typeProject: ProjectType) {
  if (typeProject === ProjectType.API) {
    apiGenerator.init()
  } else if (typeProject === ProjectType.GRAPH) {
    graphqlGenerator.init()
  }

  writeConfig({
    project: typeProject,
  })
}

async function askForDatabase() {
  const question = await inquirer.prompt({
    type: 'list',
    name: 'database',
    message: 'Choose an ORM',
    choices: Object.values(DbType),
  })

  const config = getConfig()
  config.orm = question.database
  writeConfig(config)

  return question.database
}

async function makeModule() {
  const config = getConfig()
  const moduleName = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of module:',
  })

  if (moduleName.resp) {
    const dbType = config.orm ?? DbType.TYPEORM
    cliGenerator.makeModule(moduleName.resp, dbType, config.project)
  }
}

async function makeSeeder() {
  const config = getConfig()
  const seederName = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of seeder:',
  })

  const dbType = config.orm ?? DbType.TYPEORM
  if (seederName.resp) cliGenerator.makeSeeder(seederName.resp, dbType)
}

async function makeEntity() {
  const config = getConfig()

  if (config.orm == DbType.PRISMA) {
    console.log('================================'.yellow)
    console.log("Since you are using Prisma you don't need to make entities, Prisma generate them for you.".yellow)
    console.log('================================'.yellow)
    return
  }

  const entityName = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of entity:',
  })

  const dbType = config.orm ?? DbType.TYPEORM
  if (entityName.resp) cliGenerator.makeEntity(entityName.resp, dbType)
}

async function makeFactory() {
  const { resp: name } = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of the model that belongs to Factory:',
  })
  if (!name) return

  cliGenerator.makeFactory(name)
}

async function makeMigration() {
  const config = getConfig()
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

  const { resp: name } = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of migration:',
  })
  if (!name) return

  if (dbType == DbType.SEQUELIZE) {
    shell.exec(`npm run db:make:migration ${name}`)
  } else if (dbType == DbType.TYPEORM) {
    shell.exec(`npm run m:create ./src/database/migrations/${name}`)
  }
}

async function installSocket() {
  const confirm = await inquirer.prompt({
    type: 'confirm',
    message: 'Are you sure? This action will replace all your code in index.ts',
    name: 'resp',
  })
  if (confirm.resp) cliGenerator.installSocket()
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
    const config = getConfig()
    const dbType = config.orm ?? DbType.TYPEORM
    cliGenerator.installAuth(dbType)
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
