import { CliError } from '../errors'
import { kebabCase, pascalCase } from './naming'

const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/
const COMMAND_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const RESERVED_NAMES = new Set(['node_modules', 'favicon.ico'])
const MAX_LENGTH = 214
const MAX_COMMAND_NAME_LENGTH = 120
const MAX_IDENTIFIER_LENGTH = 80

/**
 * Valida el nombre del proyecto antes de crear el directorio.
 *
 * Se usa el mismo valor como nombre de carpeta y como `name` de package.json,
 * así que debe ser un nombre de paquete npm válido y no contener separadores de
 * ruta. Los espacios exteriores se recortan; el resto se valida sin normalizar
 * para no sorprender al usuario.
 */
export function validateProjectName(value: string): string {
  const name = value.trim()

  if (!name) {
    throw new CliError('Project name is required', {
      hint: 'Run "node-express-cli init" again and enter a name.',
    })
  }

  if (name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    throw new CliError(`Invalid project name "${value}"`, {
      hint: 'Use a simple directory name without path separators.',
    })
  }

  if (!PACKAGE_NAME_PATTERN.test(name)) {
    throw new CliError(`Invalid project name "${value}"`, {
      hint: 'Use lowercase letters, numbers, hyphens, underscores or dots; the name must start with a letter or number.',
    })
  }

  if (RESERVED_NAMES.has(name)) {
    throw new CliError(`Invalid project name "${value}"`, {
      hint: `"${name}" is reserved by npm. Choose another name.`,
    })
  }

  if (name.length > MAX_LENGTH) {
    throw new CliError('Project name is too long', {
      hint: `Use at most ${MAX_LENGTH} characters.`,
    })
  }

  return name
}

/**
 * Valida nombres que se usan en rutas y, en el caso de las migraciones, como
 * argumento de un comando de shell. Evita espacios, separadores de ruta y
 * metacaracteres (`;`, `$`, backticks, etc.).
 */
export function validateCommandName(value: string, label = 'Name'): string {
  const name = value.trim()

  if (!name) {
    throw new CliError(`${label} is required`, {
      hint: `Run the command again and enter a ${label.toLowerCase()}.`,
    })
  }

  if (name.length > MAX_COMMAND_NAME_LENGTH) {
    throw new CliError(`${label} is too long`, {
      hint: `Use at most ${MAX_COMMAND_NAME_LENGTH} characters.`,
    })
  }

  if (!COMMAND_NAME_PATTERN.test(name)) {
    throw new CliError(`Invalid ${label.toLowerCase()} "${value}"`, {
      hint: 'Use letters, numbers, hyphens or underscores; no spaces or shell characters.',
    })
  }

  return name
}

/**
 * Valida nombres que se normalizan con `kebabCase`/`pascalCase` (módulos,
 * entidades, seeders y factories).
 *
 * A diferencia de `validateCommandName`, permite espacios y símbolos que el
 * normalizador sanea; lo que no permite es que el resultado quede vacío ni que
 * el nombre incluya separadores de ruta. La validación ocurre en `pre()`, antes
 * de crear directorios o archivos.
 */
export function validateIdentifier(value: string, label = 'Name'): string {
  const name = value.trim()

  if (!name) {
    throw new CliError(`${label} is required`, {
      hint: `Run the command again and enter a ${label.toLowerCase()}.`,
    })
  }

  if (name.length > MAX_IDENTIFIER_LENGTH) {
    throw new CliError(`${label} is too long`, {
      hint: `Use at most ${MAX_IDENTIFIER_LENGTH} characters.`,
    })
  }

  if (name.includes('/') || name.includes('\\')) {
    throw new CliError(`Invalid ${label.toLowerCase()} "${value}"`, {
      hint: 'Use a name without path separators.',
    })
  }

  if (!kebabCase(name) || !pascalCase(name)) {
    throw new CliError(`Invalid ${label.toLowerCase()} "${value}"`, {
      hint: 'Use letters or numbers; the name cannot be made only of symbols.',
    })
  }

  return name
}
