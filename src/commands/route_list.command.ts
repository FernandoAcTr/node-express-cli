import 'colors'
import path from 'path'
import fs from 'fs'
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import { Command } from '../interfaces/generator.interface'
import { Context } from '../context'
import { discoverFileRoutes, HTTP_METHODS } from '../utils/file_routes'
import { stringFlag } from '../utils/args'

interface Route {
  method: string
  path: string
}

function formatMethod(method: string): string {
  const name = method.toUpperCase().padEnd(8)

  switch (method.toUpperCase()) {
    case 'GET':
      return name.green
    case 'POST':
      return name.blue
    case 'PUT':
      return name.magenta
    case 'DELETE':
      return name.red
    case 'PATCH':
      return name.magenta
    default:
      return name.gray
  }
}

function printGroups(groups: Record<string, string[]>): void {
  Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .forEach((prefix) => {
      console.log('')
      console.log(`-----------------------`.green)
      console.log(`     ${prefix.toUpperCase()}    `.green)
      console.log(`-----------------------`.green)
      console.log('')
      groups[prefix].forEach((route) => {
        console.log(route)
      })
    })
}

/**
 * Lista las rutas file-based leyendo los métodos exportados con AST.
 * Ignora `GET`/`POST` que solo aparecen en comentarios o strings.
 */
async function listFilebasedRoutes(baseDir: string, omit?: string): Promise<void> {
  const routes = discoverFileRoutes(baseDir)
  const groups: Record<string, string[]> = {}

  for (const route of routes) {
    const printedUrl = omit ? route.url.replace(omit, '') || '/' : route.url
    let prefix = printedUrl
    prefix = prefix.split('/').filter((value) => !!value)[0] ?? ''

    groups[prefix] ??= []

    for (const method of route.methods) {
      groups[prefix].push(`${formatMethod(method)} ${printedUrl}`)
    }
  }

  printGroups(groups)
}

function joinRoutePath(prefix: string, routePath: string): string {
  // Older projects declare the /api prefix inside the route file itself.
  if (/^\/api(\/|$)/.test(routePath)) {
    return routePath
  }

  const segments = ['/api', prefix, routePath]
    .join('/')
    .split('/')
    .filter((value) => !!value)
  return `/${segments.join('/')}`
}

function extractRoutesFromFile(filePath: string): Route[] {
  const code = fs.readFileSync(filePath, 'utf-8')
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  })

  const routes: Route[] = []
  let prefix = ''

  traverse(ast, {
    ExportNamedDeclaration({ node }) {
      const declaration = node.declaration
      if (declaration?.type !== 'VariableDeclaration') return

      declaration.declarations.forEach((declarator) => {
        if (declarator.id.type !== 'Identifier' || declarator.id.name !== 'PREFIX') return
        const init = declarator.init
        if (init?.type === 'StringLiteral') {
          prefix = init.value
        }
      })
    },
    CallExpression({ node }) {
      // Detect calls like: router.get('/', ...)
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.property.type === 'Identifier' &&
        (HTTP_METHODS as readonly string[]).includes(node.callee.property.name.toUpperCase())
      ) {
        const method = node.callee.property.name
        const arg0 = node.arguments[0]

        if (arg0?.type === 'StringLiteral') {
          routes.push({
            method,
            path: arg0.value,
          })
        }
      }
    },
  })

  return routes.map((route) => ({ ...route, path: joinRoutePath(prefix, route.path) }))
}

async function listRoutes(
  baseDir: string,
  omit?: string,
  nestedPath: string[] = [],
  routeGroups: Record<string, Route[]> = {}
): Promise<void> {
  const currentDir = path.join(baseDir, ...nestedPath)

  if (!fs.existsSync(currentDir)) {
    return
  }

  const entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await listRoutes(baseDir, omit, [...nestedPath, entry.name], routeGroups)
    } else if (entry.name.includes('routes')) {
      const filePath = path.join(currentDir, entry.name)
      routeGroups[filePath] = extractRoutesFromFile(filePath)
    }
  }

  if (nestedPath.length === 0) {
    const modulesDir = path.resolve(baseDir, '..')
    const groups: Record<string, string[]> = {}

    Object.keys(routeGroups).forEach((prefix) => {
      const p = prefix.replace(modulesDir, '')
      groups[p] = routeGroups[prefix].map(({ method, path: routePath }) => {
        const printedPath = omit ? routePath.replace(omit, '') || '/' : routePath
        return `${formatMethod(method)} ${printedPath}`
      })
    })

    printGroups(groups)
  }
}

export interface RouteListOptions {
  /** Prefijo a quitar de las rutas mostradas, p. ej. `/api`. */
  omit?: string
}

export class RouteListCommand implements Command {
  constructor(
    private readonly ctx: Context,
    private readonly options: RouteListOptions = {}
  ) {}

  async run(): Promise<void> {
    const config = this.ctx.config.getConfig()
    const srcDir = path.join(this.ctx.cwd, 'src')
    const omit = this.options.omit ?? stringFlag(this.ctx.args, 'omit')

    if (config.fileBasedRouting) {
      await listFilebasedRoutes(path.join(srcDir, 'routes'), omit)
    } else {
      await listRoutes(path.join(srcDir, 'modules'), omit)
    }
  }
}
