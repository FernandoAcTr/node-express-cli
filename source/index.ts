#!/usr/bin/env node
import inquirer from 'inquirer'
import shell from 'shelljs'
import { argv } from './plugins/yargs'
import { ApiCodeGenerator } from './generators/api_code_generator'
import { DbType } from './generators/code_generator'
import { WebCodeGenerator } from './generators/web_code_generator'
import { CliGenerator } from './generators/cli_generator'
import { GraphqlCodeGenerator } from './generators/graphql_code_generator'

const apiGenerator = new ApiCodeGenerator()
const webGenerator = new WebCodeGenerator()
const grapqlGenerator = new GraphqlCodeGenerator()
const cliGenerator = new CliGenerator()

enum typeChoices {
  API = 'REST API',
  GRAPH = 'GraphQL API',
  WEB = 'Web App',
}

enum dbChoices {
  MONGO = 'Mongo DB with Mongoose',
  TYPEORM = 'SQL with TypeOrm',
}

async function init() {
  const type = await inquirer.prompt({
    type: 'list',
    name: 'resp',
    message: 'Choose type of project',
    choices: Object.values(typeChoices),
  })

  const database = await inquirer.prompt({
    type: 'list',
    name: 'resp',
    message: 'Choose type of database',
    choices: Object.values(dbChoices),
  })

  generate(type.resp, database.resp)
}

function generate(typeProject: typeChoices, database: dbChoices) {
  const dbType = database === dbChoices.MONGO ? DbType.MONGO : DbType.TYPEORM

  shell.exec('npm init -y')
  if (typeProject === typeChoices.API) {
    apiGenerator.init(dbType)
  } else if (typeProject === typeChoices.WEB) {
    webGenerator.init(dbType)
  } else if (typeProject === typeChoices.GRAPH) {
    grapqlGenerator.init(dbType)
  }
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
    if (type.resp === typeChoices.API) apiGenerator.makeModule(moduleName.resp)
    else if (type.resp === typeChoices.WEB)
      webGenerator.makeModule(moduleName.resp)
    else if (type.resp === typeChoices.GRAPH)
      grapqlGenerator.makeModule(moduleName.resp)
}

async function installSocket() {
  const type = await inquirer.prompt({
    type: 'list',
    name: 'resp',
    message: 'Type of module',
    choices: Object.values(typeChoices),
  })
  cliGenerator.installSocket(type.resp === typeChoices.API)
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
  default:
    console.log('Please enter --help to see a list of commands')
}
