import fs from 'fs'
import { CliError } from '../errors'

const PLACEHOLDER = /__([A-Za-z0-9_]+)__/g

/**
 * Sustituye todos los placeholders `__Name__` del template.
 * Falla si el template usa un placeholder que no fue provisto: mejor un error
 * explícito al generar que un archivo con `__Name__` dentro.
 */
export function renderTemplateString(
  template: string,
  vars: Record<string, string>,
  source = '<template>'
): string {
  return template.replace(PLACEHOLDER, (placeholder, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) {
      throw new CliError(`Missing template variable "${key}"`, {
        hint: `Add "${key}" to the variables when rendering ${source}`,
      })
    }

    return vars[key]
  })
}

/** Lee `templatePath` y renderiza sus placeholders con `vars`. */
export function renderTemplate(templatePath: string, vars: Record<string, string>): string {
  const template = fs.readFileSync(templatePath, 'utf-8')
  return renderTemplateString(template, vars, templatePath)
}
