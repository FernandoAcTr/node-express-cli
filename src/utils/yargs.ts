import yargs, { Argv } from 'yargs'
import { CommandDefinition, CommandOptionDefinition, commands } from '../registry'
import { ParsedArgv } from '../types'

function globalOptions(): Record<string, CommandOptionDefinition> {
  return {
    'no-interaction': {
      type: 'boolean',
      description: 'Disable prompts and read answers from flags or positional arguments',
    },
    ci: {
      type: 'boolean',
      description: 'Alias of --no-interaction',
    },
    force: {
      type: 'boolean',
      description: 'Overwrite files that the CLI did not generate or that you modified',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show the files and commands that would change without writing anything',
    },
  }
}

/** Opciones propias de un comando; el --help de cada comando solo muestra las suyas. */
export function commandOptions(command: CommandDefinition): Record<string, CommandOptionDefinition> {
  return command.options ?? {}
}

function registerCommand(cli: Argv, command: CommandDefinition): void {
  cli.command({
    command: command.name,
    aliases: command.aliases,
    describe: command.description,
    builder: (instance) => instance.options(commandOptions(command)),
    handler: () => undefined,
  })
}

/**
 * Construye el parser. Las opciones globales son solo las documentadas
 * (`--force`, `--dry-run`, `--no-interaction`, `--ci`); las de cada comando se
 * registran en su propio `command()` para que no colisionen ni ensucien el help.
 */
export function buildCli(rawArgv: string[] = process.argv.slice(2), commandList: CommandDefinition[] = commands): Argv {
  const cli = yargs(rawArgv)
    .scriptName('node-express-cli')
    .usage('Usage: $0 <command> [options]')
    .options(globalOptions())
    .wrap(null)
    .help()
    .version()

  for (const command of commandList) {
    registerCommand(cli, command)
  }

  return cli
}

/** Parsea los argumentos reales del proceso. */
export function parseArgv(rawArgv: string[] = process.argv.slice(2)): ParsedArgv {
  return buildCli(rawArgv).parse() as ParsedArgv
}

/** Texto estable para el snapshot de `--help`. */
export function helpText(): Promise<string> {
  return buildCli([]).getHelp()
}
