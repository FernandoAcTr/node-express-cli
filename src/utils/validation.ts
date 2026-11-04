import { CliError } from '../errors'

const PACKAGE_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/
const RESERVED_NAMES = new Set(['node_modules', 'favicon.ico'])
const MAX_LENGTH = 214

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
