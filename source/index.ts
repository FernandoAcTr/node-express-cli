import inquirer from 'inquirer'
import { ApiCodeGenerator } from './generators/api_code_generator'
import { DbType } from './generators/code_generator'
import { WebCodeGenerator } from './generators/web_code_generator'

import { argv } from './config/yargs'

const apiGenerator = new ApiCodeGenerator()
const webGenerator = new WebCodeGenerator()

enum typeChoices {
  API = 'API',
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

  if (typeProject === typeChoices.API) {
    apiGenerator.init(dbType)
  } else {
    webGenerator.init(dbType)
  }
}

let command = (argv as any)._[0]
switch (command) {
  case 'init':
    init()

  default:
    console.log('No reconized command')
}
