import { Context, createContext } from './context'
import { CliError } from './errors'
import { InquirerPrompter, NonInteractivePrompter, Prompter, isNonInteractive } from './prompts'
import { CommandDefinition, commands } from './registry'
import { run } from './run'
import { CommandArgs, ParsedArgv } from './types'

/** Separa posicionales y flags del resultado crudo de yargs. */
export function splitArgs(raw: ParsedArgv): CommandArgs {
  const positionals = raw._.map(String)
  const flags: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (key === '_' || key === '$0') continue
    flags[key] = value
  }

  return { positionals, flags }
}

/**
 * El comando puede venir como posicional (`nec make:module`) o como flag
 * (`nec --init`, `nec -i`). Los aliases también resuelven.
 */
export function resolveCommandName(args: CommandArgs, commandList: CommandDefinition[] = commands): string | undefined {
  if (args.positionals[0]) {
    return args.positionals[0]
  }

  for (const command of commandList) {
    if (args.flags[command.name] === true) {
      return command.name
    }

    for (const alias of command.aliases ?? []) {
      if (args.flags[alias] === true) {
        return command.name
      }
    }
  }

  return undefined
}

export function findCommand(name: string | undefined, commandList: CommandDefinition[] = commands): CommandDefinition | undefined {
  if (!name) {
    return undefined
  }

  return commandList.find((command) => command.name === name || command.aliases?.includes(name))
}

/** Crea el prompter adecuado; `--no-interaction`/`--ci` leen los valores de flags. */
export function createPrompter(args: CommandArgs): Prompter {
  return isNonInteractive(args.flags) ? new NonInteractivePrompter(args.flags, args.positionals.slice(1)) : new InquirerPrompter()
}

/**
 * Valida que el comando pueda ejecutarse sin crear nada. `requiresProject` y
 * `requires` viven en el registry, así que un comando nuevo no obliga a tocar
 * el entrypoint.
 */
export function assertCommandCanRun(definition: CommandDefinition, ctx: Context): void {
  if (definition.requiresProject && !ctx.project.isProject()) {
    throw new CliError('This command must be run inside a generated project', {
      hint: 'Run "node-express-cli init" first, or change to the project directory.',
    })
  }

  const unmet = (definition.requires ?? []).filter((requirement) => !ctx.has(requirement.feature))

  if (unmet.length > 0) {
    throw new CliError(`"${definition.name}" requires: ${unmet.map((requirement) => requirement.feature).join(', ')}`, {
      hint: unmet
        .map((requirement) => requirement.hint)
        .filter(Boolean)
        .join(' '),
    })
  }
}

/** Ejecuta un comando ya resuelto con el lifecycle común. */
export async function executeCommand(definition: CommandDefinition, ctx: Context, args: CommandArgs): Promise<void> {
  assertCommandCanRun(definition, ctx)
  await run(definition.create(ctx, args), { ctx, feature: definition.feature })
}

export async function main(raw: ParsedArgv, commandList: CommandDefinition[] = commands): Promise<void> {
  const args = splitArgs(raw)
  const commandName = resolveCommandName(args, commandList)
  const prompter = createPrompter(args)
  const ctx = createContext({ prompter, args })
  const definition = findCommand(commandName, commandList)

  if (!definition) {
    if (!commandName) {
      ctx.logger.info('Please enter --help to see a list of commands')
      return
    }

    throw new CliError(`Unknown command "${commandName}"`, {
      hint: 'Run "node-express-cli --help" to see the available commands.',
    })
  }

  await executeCommand(definition, ctx, args)
}
