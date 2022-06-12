#!/usr/bin/env node
import inquirer from 'inquirer'
import { argv } from './plugins/yargs'
import { ApiCodeGenerator } from './generators/api_code_generator'
import { DbType } from './generators/code_generator'
import { CliGenerator } from './generators/cli_generator'
import { GraphqlCodeGenerator } from './generators/graphql_code_generator'

const apiGenerator = new ApiCodeGenerator()
const grapqlGenerator = new GraphqlCodeGenerator()
const cliGenerator = new CliGenerator()

enum typeChoices {
  API = 'REST API',
  GRAPH = 'GraphQL API',
}

enum dbChoices {
  MONGO = 'Mongoose',
  TYPEORM = 'TypeOrm',
}

async function init() {
  const type = await inquirer.prompt({
    type: 'list',
    name: 'resp',
    message: 'Choose type of project',
    choices: Object.values(typeChoices),
  })

  generate(type.resp)
  console.log("Cool! All ready. The next step is to create an .env file and run the command 'npm run dev'".green)
}

function generate(typeProject: typeChoices) {
  if (typeProject === typeChoices.API) {
    apiGenerator.init()
  } else if (typeProject === typeChoices.GRAPH) {
    grapqlGenerator.init()
  }
}

async function askForDatabase() {
  const question = await inquirer.prompt({
    type: 'list',
    name: 'database',
    message: 'Choose an ORM',
    choices: Object.values(dbChoices),
  })
  const dbType = question.database === dbChoices.MONGO ? DbType.MONGO : DbType.TYPEORM
  return dbType
}

async function makeModule() {
  const type = await inquirer.prompt({
    type: 'list',
    name: 'resp',
    message: 'Type of module',
    choices: Object.values(typeChoices),
  })

  const moduleName = await inquirer.prompt({
    type: 'input',
    name: 'resp',
    message: 'Name of module:',
  })

  if (moduleName.resp)
    if (type.resp === typeChoices.API) {
      const dbType = await askForDatabase()
      apiGenerator.makeModule(moduleName.resp, dbType)
    } else if (type.resp === typeChoices.GRAPH) grapqlGenerator.makeModule(moduleName.resp)
}

async function installSocket() {
  const confirm = await inquirer.prompt({
    type: 'confirm',
    message: 'Are you sure? This action will replace all your code in index.ts',
    name: 'resp',
  })
  if (confirm.resp) cliGenerator.installSocket()
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
    askForDatabase().then((dbType) => {
      cliGenerator.installAuth(dbType)
    })
    break

  case 'install:mailer':
    cliGenerator.installMailer()
    break

  default:
    console.log('Please enter --help to see a list of commands')
}
