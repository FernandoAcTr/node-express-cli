#!/usr/bin/env node
import 'colors'
import { ContextFeature, createContext } from './context'
import { CliError, handleError } from './errors'
import { InquirerPrompter, NonInteractivePrompter, Prompter, isNonInteractive } from './prompts'
import { CommandArgs, commands } from './registry'
import { run } from './run'
import { ParsedArgv, argv } from './utils/yargs'

function splitArgs(raw: ParsedArgv): CommandArgs {
  const positionals = raw._.map(String)
  const flags: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (key === '_' || key === '$0') continue
    flags[key] = value
  }

  return { positionals, flags }
}

function requiresHint(feature: ContextFeature): string {
  if (feature === 'orm') {
    return 'Run "node-express-cli install:orm" first.'
  }

  if (feature === 'fileBasedRouting') {
    return 'Run "node-express-cli init" and enable file-based routing.'
  }

  return ''
}

function resolveCommandName(args: CommandArgs): string | undefined {
  if (args.positionals[0]) {
    return args.positionals[0]
  }

  // `nec -i` / `nec --init` have no positional command.
  for (const command of commands) {
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

async function main(): Promise<void> {
  const args = splitArgs(argv)
  const commandName = resolveCommandName(args)

  const prompter: Prompter = isNonInteractive(args.flags)
    ? new NonInteractivePrompter(args.flags, args.positionals.slice(1))
    : new InquirerPrompter()

  const ctx = createContext({ prompter, force: args.flags['force'] === true })

  const definition = commands.find(
    (command) => command.name === commandName || (commandName !== undefined && command.aliases?.includes(commandName))
  )

  if (!definition) {
    if (!commandName) {
      ctx.logger.info('Please enter --help to see a list of commands')
      return
    }

    throw new CliError(`Unknown command "${commandName}"`, {
      hint: 'Run "node-express-cli --help" to see the available commands.',
    })
  }

  if (definition.requiresProject !== false && !ctx.project.isProject()) {
    throw new CliError('This command must be run inside a generated project', {
      hint: 'Run "node-express-cli init" first, or change to the project directory.',
    })
  }

  const unmet = (definition.requires ?? []).filter((feature) => !ctx.has(feature))
  if (unmet.length > 0) {
    throw new CliError(`"${definition.name}" requires: ${unmet.join(', ')}`, {
      hint: unmet.map(requiresHint).join(' '),
    })
  }

  await run(definition.create(ctx, args), { ctx, feature: definition.feature })
}

main().catch(handleError)
