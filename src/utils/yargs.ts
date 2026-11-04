import yargs from 'yargs'
import { CommandDefinition, CommandOptionDefinition, commands } from '../registry'

export type ParsedArgv = Record<string, unknown> & { _: (string | number)[] }

function buildOptions(commandList: CommandDefinition[]): Record<string, any> {
  const options: Record<string, any> = {
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
  }

  for (const command of commandList) {
    options[command.name] = {
      description: command.description,
      ...(command.aliases?.length ? { alias: command.aliases } : {}),
    }

    for (const [name, definition] of Object.entries(command.options ?? {})) {
      const option: CommandOptionDefinition = definition

      options[name] = {
        type: option.type ?? 'string',
        description: option.description,
        ...(option.default !== undefined ? { default: option.default } : {}),
        ...(option.alias ? { alias: option.alias } : {}),
      }
    }
  }

  return options
}

/** El --help se genera desde `src/registry.ts`; este archivo no conoce comandos concretos. */
export const argv = yargs.options(buildOptions(commands)).argv as ParsedArgv
