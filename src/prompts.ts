import { confirm, input, select } from '@inquirer/prompts'
import { CliError } from './errors'

export interface InputPromptOptions {
  message: string
  /** Flag name used by NonInteractivePrompter, e.g. `name` -> `--name` */
  name?: string
  default?: string
}

export interface Choice<T> {
  name: string
  value: T
}

export interface SelectPromptOptions<T> {
  message: string
  /** Flag name used by NonInteractivePrompter, e.g. `orm` -> `--orm` */
  name?: string
  choices: Choice<T>[]
  default?: T
}

export interface ConfirmPromptOptions {
  message: string
  /** Flag name used by NonInteractivePrompter, e.g. `yes` -> `--yes` */
  name?: string
  default?: boolean
}

export interface Prompter {
  input(options: InputPromptOptions): Promise<string>
  select<T>(options: SelectPromptOptions<T>): Promise<T>
  confirm(options: ConfirmPromptOptions): Promise<boolean>
}

export class InquirerPrompter implements Prompter {
  input(options: InputPromptOptions): Promise<string> {
    return input({ message: options.message, default: options.default })
  }

  select<T>(options: SelectPromptOptions<T>): Promise<T> {
    return select<T>({
      message: options.message,
      choices: options.choices,
      default: options.default,
    })
  }

  confirm(options: ConfirmPromptOptions): Promise<boolean> {
    return confirm({ message: options.message, default: options.default })
  }
}

/**
 * Prompter para CI/scripts: lee los valores de flags o de los argumentos
 * posicionales en lugar de preguntar.
 */
export class NonInteractivePrompter implements Prompter {
  private readonly positionals: string[]

  constructor(
    private readonly flags: Record<string, unknown>,
    positionals: string[] = []
  ) {
    this.positionals = [...positionals]
  }

  async input(options: InputPromptOptions): Promise<string> {
    const flag = options.name ? readFlag(this.flags, options.name) : undefined

    if (flag !== undefined) {
      return String(flag)
    }

    const positional = this.positionals.shift()
    if (positional !== undefined) {
      return positional
    }

    if (options.default !== undefined) {
      return options.default
    }

    throw new CliError(`Missing value for "${options.name ?? 'input'}"`, {
      hint: options.name
        ? `Pass --${options.name} <value> or provide it as a positional argument.`
        : 'Provide the value as a positional argument.',
    })
  }

  async select<T>(options: SelectPromptOptions<T>): Promise<T> {
    const flag = options.name ? readFlag(this.flags, options.name) : undefined
    const allowed = options.choices.map((choice) => choice.name).join(', ')

    if (flag === undefined) {
      if (options.default !== undefined) {
        return options.default
      }

      throw new CliError(`Missing value for "${options.name ?? 'select'}"`, {
        hint: options.name ? `Pass --${options.name} with one of: ${allowed}.` : `Use one of: ${allowed}.`,
      })
    }

    const match = options.choices.find(
      (choice) => choice.value === flag || String(choice.value) === String(flag) || choice.name === flag
    )

    if (!match) {
      throw new CliError(`Invalid value "${String(flag)}" for "${options.name ?? 'select'}"`, {
        hint: `Use one of: ${allowed}.`,
      })
    }

    return match.value
  }

  async confirm(options: ConfirmPromptOptions): Promise<boolean> {
    const flag = readFlag(this.flags, options.name ?? 'yes')
    if (typeof flag === 'boolean') {
      return flag
    }

    const yes = readFlag(this.flags, 'yes')
    if (typeof yes === 'boolean') {
      return yes
    }

    return options.default ?? false
  }
}

export function isNonInteractive(flags: Record<string, unknown>): boolean {
  return (
    readFlag(flags, 'no-interaction') === true ||
    readFlag(flags, 'non-interactive') === true ||
    flags['interaction'] === false ||
    readFlag(flags, 'ci') === true
  )
}

function readFlag(flags: Record<string, unknown>, name: string): unknown {
  if (Object.prototype.hasOwnProperty.call(flags, name)) {
    return flags[name]
  }

  const camel = name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
  if (Object.prototype.hasOwnProperty.call(flags, camel)) {
    return flags[camel]
  }

  const snake = name.replace(/-/g, '_')
  if (Object.prototype.hasOwnProperty.call(flags, snake)) {
    return flags[snake]
  }

  return undefined
}
