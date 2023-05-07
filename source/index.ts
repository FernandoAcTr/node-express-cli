#!/usr/bin/env node
import fs from 'fs'
import inquirer from 'inquirer'
import { argv } from './plugins/yargs'
import { ApiCodeGenerator } from './generators/api_code_generator'
import { DbType, ProjectType } from './generators/code_generator'
import { CliGenerator } from './generators/cli_generator'
import { GraphqlCodeGenerator } from './generators/graphql_code_generator'
import shell from 'shelljs'

const apiGenerator = new ApiCodeGenerator()
const grapqlGenerator = new GraphqlCodeGenerator()
const cliGenerator = new CliGenerator()

const getConfig = (): { project: string; orm?: DbType } => JSON.parse(fs.readFileSync('cli.config.json').toString())
const writeConfig = (config: any) => fs.writeFileSync('cli.config.json', JSON.stringify(config))

async function init() {
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
    grapqlGenerator.init()
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

  if (moduleName.resp)
    if (config.project === ProjectType.API) {
      const config = getConfig()
      const dbType = config.orm ?? DbType.TYPEORM
      apiGenerator.makeModule(moduleName.resp, dbType)
    } else if (config.project === ProjectType.GRAPH) grapqlGenerator.makeModule(moduleName.resp)
}

async function makeSeeder() {
  const seederName = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of seeder:',
  })

  if (seederName.resp) cliGenerator.makeSeeder(seederName.resp)
}

async function makeEntity() {
  const entityName = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of entity:',
  })
  const config = getConfig()
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
