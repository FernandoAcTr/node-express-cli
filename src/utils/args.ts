import { CommandArgs } from '../types'

/** yargs expande `--dry-run` a `dry-run` y `dryRun`; aceptamos ambas. */
function keys(name: string): string[] {
  const camel = name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
  return camel === name ? [name] : [name, camel]
}

/** True si el flag booleano está presente (o vale `"true"`). */
export function booleanFlag(args: CommandArgs, name: string): boolean {
  return keys(name).some((key) => args.flags[key] === true || args.flags[key] === 'true')
}

/** Valor de un flag de texto, o `undefined` si no se pasó. */
export function stringFlag(args: CommandArgs, name: string): string | undefined {
  for (const key of keys(name)) {
    const value = args.flags[key]

    if (typeof value === 'string') {
      return value
    }
  }

  return undefined
}
