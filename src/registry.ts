import { Command, Generator } from './interfaces/generator.interface'
import { Context, ContextFeature } from './context'
import { Feature } from './types'
import { AuthGenerator } from './generators/auth.generator'
import { BaseGenerator } from './generators/base.generator'
import { EntityGenerator } from './generators/entity.generator'
import { FactoryGenerator } from './generators/factory.generator'
import { MigrationGenerator } from './generators/migration.generator'
import { ModuleGenerator } from './generators/module.generator'
import { OrmGenerator } from './generators/orm.generator'
import { SeederGenerator } from './generators/seeder.generator'
import { RouteListCommand } from './commands/route_list.command'
import { InstallerSpec, SpecGenerator } from './installers'
import { eslintSpec } from './installers/specs/eslint.spec'
import { mailerSpec } from './installers/specs/mailer.spec'
import { prettierSpec } from './installers/specs/prettier.spec'
import { pushSpec } from './installers/specs/push.spec'
import { socketSpec } from './installers/specs/socket.spec'
import { testsSpec } from './installers/specs/tests.spec'

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
 * Convierte un `InstallerSpec` en un comando `install:*`. Añadir un instalador
 * simple es crear el spec y agregar una línea aquí.
 */
export function installer(spec: InstallerSpec): CommandDefinition {
  return {
    name: `install:${spec.feature}`,
    description: spec.description,
    requires: spec.requires,
    feature: spec.feature,
    create: (ctx) => new SpecGenerator(ctx, spec),
  }
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
  installer(prettierSpec),
  installer(eslintSpec),
  installer(socketSpec),
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
  installer(mailerSpec),
  installer(pushSpec),
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
  installer(testsSpec),
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
