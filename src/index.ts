#!/usr/bin/env node
import 'colors'
import { AuthGenerator } from './generators/auth.generator'
import { BaseGenerator } from './generators/base.generator'
import { EslintGenerator } from './generators/eslint.generator'
import { ModuleGenerator } from './generators/module.generator'
import { OrmGenerator } from './generators/orm.generator'
import { PrettierGenerator } from './generators/prettier.generator'
import { run } from './generators/run'
import { SocketsGenerator } from './generators/sockets.generator'
import { Generator } from './interfaces/generator.interface'
import { configService } from './services/config.service'
import { argv } from './utils/yargs'
import { MailerGenerator } from './generators/mailer.generator'
import { SeederGenerator } from './generators/seeder.generator'
import { EntityGenerator } from './generators/entity.generator'
import { MigrationGenerator } from './generators/migration.generator'
import { FactoryGenerator } from './generators/factory.generator'
import { TestGenerator } from './generators/tests.generator'

let command = (argv as any)._[0]

let g: Generator | null = null

switch (command) {
  case 'init':
    g = new BaseGenerator()
    break

  case 'make:module':
    g = new ModuleGenerator()
    break

  case 'install:prettier':
    g = new PrettierGenerator()
    break

  case 'install:eslint':
    g = new EslintGenerator()
    break

  case 'install:socket':
    g = new SocketsGenerator()
    break

  case 'install:orm':
    g = new OrmGenerator()
    break

  case 'install:auth':
    const config = configService.getConfig()
    if (!config.orm) {
      console.log('================================'.yellow)
      console.log('Install first the orm. Please exec node-express-cli install:database'.yellow)
      console.log('================================'.yellow)
    } else {
      g = new AuthGenerator()
    }
    break

  case 'install:mailer':
    g = new MailerGenerator()
    break

  case 'make:seeder':
    g = new SeederGenerator()
    break

  case 'make:entity':
    g = new EntityGenerator()
    break

  case 'make:migration':
    g = new MigrationGenerator()
    break

  case 'make:factory':
    g = new FactoryGenerator()
    break

  case 'install:tests':
    g = new TestGenerator()
    break

  default:
    console.log('Please enter --help to see a list of commands')
}

if (g) {
  run(g)
}
