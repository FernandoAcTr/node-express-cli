import { Command, Generator } from './interfaces/generator.interface'
import { Context, ContextFeature } from './context'
import { Feature } from './types'
import { AuthGenerator } from './generators/auth.generator'
import { BaseGenerator } from './generators/base.generator'
import { EslintGenerator } from './generators/eslint.generator'
import { EntityGenerator } from './generators/entity.generator'
import { FactoryGenerator } from './generators/factory.generator'
import { MailerGenerator } from './generators/mailer.generator'
import { MigrationGenerator } from './generators/migration.generator'
import { ModuleGenerator } from './generators/module.generator'
import { OrmGenerator } from './generators/orm.generator'
import { PrettierGenerator } from './generators/prettier.generator'
import { PushGenerator } from './generators/push.generator'
import { SeederGenerator } from './generators/seeder.generator'
import { SocketsGenerator } from './generators/sockets.generator'
import { TestGenerator } from './generators/tests.generator'
import { RouteListCommand } from './commands/route_list.command'

export interface CommandArgs {
  positionals: string[]
  flags: Record<string, unknown>
}

export interface CommandOptionDefinition {
  type?: 'string' | 'boolean' | 'number'
  description: string
  default?: string | number | boolean
  alias?: string
}

export interface CommandDefinition {
  name: string
  description: string
  aliases?: string[]
  requires?: ContextFeature[]
  /** Si es false, el comando puede ejecutarse fuera de un proyecto generado. */
  requiresProject?: boolean
  /** Feature que se marca en cli.config.json cuando el comando termina bien. */
  feature?: Feature
  options?: Record<string, CommandOptionDefinition>
  create(ctx: Context, args: CommandArgs): Generator | Command
}

const NAME_OPTION: CommandOptionDefinition = {
  type: 'string',
  description: 'Name to use instead of the interactive prompt',
}

/**
 * Única fuente de verdad de los comandos. `src/utils/yargs.ts` genera el --help
 * a partir de esta lista y `src/index.ts` resuelve el comando por nombre.
 */
export const commands: CommandDefinition[] = [
  {
    name: 'init',
    description: 'Init a new Express project',
    aliases: ['i'],
    requiresProject: false,
    options: {
      name: NAME_OPTION,
      'package-manager': {
        type: 'string',
        description: 'Package manager: npm, yarn, pnpm or bun',
      },
      'file-based-routing': {
        type: 'boolean',
        description: 'Use file-based routing',
      },
    },
    create: (ctx) => new BaseGenerator(ctx),
  },
  {
    name: 'make:module',
    description: 'Generate a new resource module',
    options: { name: NAME_OPTION },
    create: (ctx) => new ModuleGenerator(ctx),
  },
  {
    name: 'install:prettier',
    description: 'Add prettier to the project',
    feature: 'prettier',
    create: (ctx) => new PrettierGenerator(ctx),
  },
  {
    name: 'install:eslint',
    description: 'Add eslint to the project',
    feature: 'eslint',
    create: (ctx) => new EslintGenerator(ctx),
  },
  {
    name: 'install:socket',
    description: 'Add Socket.io to the project',
    feature: 'socket',
    create: (ctx) => new SocketsGenerator(ctx),
  },
  {
    name: 'install:orm',
    description: 'Add Database support using an orm',
    feature: 'orm',
    options: {
      orm: {
        type: 'string',
        description: 'ORM to install: mongoose, typeorm, sequelize or prisma',
      },
    },
    create: (ctx) => new OrmGenerator(ctx),
  },
  {
    name: 'install:auth',
    description: 'Add basic scaffolding to auth with jwt and passport',
    requires: ['orm'],
    feature: 'auth',
    create: (ctx) => new AuthGenerator(ctx),
  },
  {
    name: 'install:mailer',
    description: 'Add support for send mails via nodemailer library',
    feature: 'mailer',
    create: (ctx) => new MailerGenerator(ctx),
  },
  {
    name: 'install:push',
    description: 'Add web push notifications support via web-push',
    feature: 'push',
    create: (ctx) => new PushGenerator(ctx),
  },
  {
    name: 'make:seeder',
    description: 'Generate a new seeder class',
    options: { name: NAME_OPTION },
    create: (ctx) => new SeederGenerator(ctx),
  },
  {
    name: 'make:entity',
    description: 'Generate a new entity class',
    options: { name: NAME_OPTION },
    create: (ctx) => new EntityGenerator(ctx),
  },
  {
    name: 'make:migration',
    description: 'Generate a new database migration',
    options: { name: NAME_OPTION },
    create: (ctx) => new MigrationGenerator(ctx),
  },
  {
    name: 'make:factory',
    description: 'Generate a new Factory class for a Model',
    options: { name: NAME_OPTION },
    create: (ctx) => new FactoryGenerator(ctx),
  },
  {
    name: 'install:tests',
    description: 'Add a library to do testing and some examples',
    feature: 'tests',
    create: (ctx) => new TestGenerator(ctx),
  },
  {
    name: 'route:list',
    description: 'List all routes in the project. Use --omit to remove a prefix from the routes. Example: --omit /api',
    options: {
      omit: {
        type: 'string',
        description: 'Prefix to remove from the listed routes, e.g. /api',
      },
    },
    create: (ctx, args) => new RouteListCommand(ctx, args.flags['omit'] as string | undefined),
  },
]
