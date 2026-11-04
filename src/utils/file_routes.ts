import fs from 'fs'
import path from 'path'
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export interface FileRoute {
  file: string
  url: string
  methods: HttpMethod[]
}

export function buildURLPath(segments: string[]): string {
  const final = segments.map((val) => (val.startsWith('[') && val.endsWith(']') ? `:${val.slice(1, val.length - 1)}` : val))
  const url = `/${final.join('/')}`.replace(/\/+/g, '/').replace(/\/+$/, '')

  return url === '' ? '/' : url
}

export function routeResourceName(fileName: string): string {
  return fileName === 'index.js' || fileName === 'index.ts' ? '/' : fileName.replace(/\.(js|ts)$/, '')
}

export function isRouteFile(fileName: string): boolean {
  return fileName.endsWith('.ts') || fileName.endsWith('.js')
}

/**
 * Detecta los métodos HTTP exportados por un archivo de rutas file-based.
 * Usa el AST, así que ignora métodos que solo aparecen en comentarios o strings.
 *
 * Formatos soportados:
 *   export default { GET, POST } satisfies RestController
 *   export const GET = ...
 *   export function POST(...) {}
 */
export function extractFileRouteMethods(code: string): HttpMethod[] {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  })

  const found = new Set<HttpMethod>()

  const add = (name: unknown) => {
    if (typeof name !== 'string') return
    const method = name.toUpperCase()

    if ((HTTP_METHODS as readonly string[]).includes(method)) {
      found.add(method as HttpMethod)
    }
  }

  const addObjectKeys = (node: any) => {
    for (const property of node.properties ?? []) {
      if (property.type === 'ObjectProperty' || property.type === 'ObjectMethod') {
        add(propertyKey(property.key))
      }
    }
  }

  traverse(ast, {
    ExportDefaultDeclaration({ node }) {
      const declaration = unwrapExpression(node.declaration)

      if (declaration?.type === 'ObjectExpression') {
        addObjectKeys(declaration)
      }
    },
    ExportNamedDeclaration({ node }) {
      const declaration = node.declaration

      if (declaration?.type === 'VariableDeclaration') {
        for (const declarator of declaration.declarations) {
          if (declarator.id.type === 'Identifier') {
            add(declarator.id.name)
          }
        }
      } else if ((declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') && declaration.id) {
        add(declaration.id.name)
      }
    },
  })

  return HTTP_METHODS.filter((method) => found.has(method))
}

/**
 * Recorre `src/routes` y devuelve cada archivo con su URL y métodos.
 * Es la fuente que usa `route:list` y refleja las mismas reglas que el router
 * file-based generado (`[id]` -> `:id`, `index` -> `/`).
 */
export function discoverFileRoutes(baseDir: string): FileRoute[] {
  const routes: FileRoute[] = []

  const walk = (segments: string[]) => {
    const currentDir = path.join(baseDir, ...segments)

    if (!fs.existsSync(currentDir)) {
      return
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort(compareEntries)

    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk([...segments, entry.name])
        continue
      }

      if (!isRouteFile(entry.name)) {
        continue
      }

      const file = path.join(currentDir, entry.name)
      const url = buildURLPath([...segments, routeResourceName(entry.name)])
      const methods = extractFileRouteMethods(fs.readFileSync(file, 'utf-8'))

      routes.push({ file, url, methods })
    }
  }

  walk([])
  return routes
}

function unwrapExpression(node: any): any {
  let current = node

  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'ParenthesizedExpression' ||
      current.type === 'TSNonNullExpression')
  ) {
    current = current.expression
  }

  return current
}

function propertyKey(key: any): string | undefined {
  if (!key) return undefined

  if (key.type === 'Identifier') return key.name
  if (key.type === 'StringLiteral') return key.value

  return undefined
}

/** Las rutas estáticas deben registrarse antes que las dinámicas ([id], [slug]). */
function compareEntries(a: { name: string; isDirectory(): boolean }, b: { name: string; isDirectory(): boolean }): number {
  const aDynamic = a.isDirectory() && a.name.startsWith('[')
  const bDynamic = b.isDirectory() && b.name.startsWith('[')

  return Number(aDynamic) - Number(bDynamic) || a.name.localeCompare(b.name)
}
