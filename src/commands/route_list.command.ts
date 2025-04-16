import path from 'path'
import fs from 'fs'
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'
import { Command } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'

interface Route {
  method: string
  path: string
}

function buildURLPath(path: string[]) {
  const final = path.map((val) => (val.startsWith('[') && val.endsWith(']') ? `:${val.slice(1, val.length - 1)}` : val))
  return ('/' + final.join('/').replace('//', '')).replace('//', '/')
}

async function listFilebasedRoutes(paths: string[] = [], routeGroups: Record<string, string[]> = {}, omit?: string) {
  const BASE_FILE_PATH = path.resolve('src', 'routes')
  const currentDir = [BASE_FILE_PATH, ...paths].join('/').replace('//', '/')
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await listFilebasedRoutes([...paths, entry.name], routeGroups, omit)
    } else if (entry.name.endsWith('.ts')) {
      const fileContent = fs.readFileSync(path.join(currentDir, entry.name), 'utf-8')
      const resourceName = entry.name.includes('index') ? '/' : entry.name.slice(0, entry.name.length - 3)
      const url = buildURLPath([...paths, resourceName])

      let prefix = url
      if (omit) prefix = prefix.replace(omit, '')
      prefix = prefix.split('/').filter((v) => !!v)[0]

      if (!routeGroups[prefix]) {
        routeGroups[prefix] = []
      }

      if (fileContent.includes('GET')) {
        routeGroups[prefix].push(`GET     `.green + url)
      }
      if (fileContent.includes('POST')) {
        routeGroups[prefix].push(`POST    `.blue + url)
      }
      if (fileContent.includes('PUT')) {
        routeGroups[prefix].push(`PUT     `.magenta + url)
      }
      if (fileContent.includes('DELETE')) {
        routeGroups[prefix].push(`DELETE  `.red + url)
      }
      if (fileContent.includes('HEAD')) {
        routeGroups[prefix].push(`HEAD    `.gray + url)
      }
      if (fileContent.includes('OPTIONS')) {
        routeGroups[prefix].push(`OPTIONS `.gray + url)
      }
      if (fileContent.includes('PATCH')) {
        routeGroups[prefix].push(`PATCH   `.magenta + url)
      }
    }
  }

  if (paths.length === 0) {
    Object.keys(routeGroups).forEach((prefix) => {
      console.log('')
      console.log(`-----------------------`.green)
      console.log(`     ${prefix.toUpperCase()}    `.green)
      console.log(`-----------------------`.green)
      console.log('')
      routeGroups[prefix].forEach((route) => {
        console.log(route)
      })
    })
  }
}

function extractRoutesFromFile(filePath: string): Route[] {
  const code = fs.readFileSync(filePath, 'utf-8')
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript'],
  })

  const routes: Route[] = []

  traverse(ast, {
    CallExpression({ node }) {
      // Detect calls like: router.get('/api/products', ...)
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name.match(/^(get|post|put|delete|patch|head|options)$/)
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

  return routes
}

async function listRoutes(nestedPath: string[] = [], routeGroups: Record<string, Route[]> = {}): Promise<void> {
  const baseDir = path.resolve('src', 'modules')
  const currentDir = path.join(baseDir, ...nestedPath)
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await listRoutes([...nestedPath, entry.name], routeGroups)
    } else if (entry.name.includes('routes')) {
      const filePath = path.join(currentDir, entry.name)
      const routes = extractRoutesFromFile(filePath)

      routeGroups[filePath] = routes
    }
  }

  if (nestedPath.length === 0) {
    const modulesDir = path.resolve('src')
    Object.keys(routeGroups).forEach((prefix) => {
      const p = prefix.replace(modulesDir, '')
      console.log('')
      console.log(`--------------------------------`.green)
      console.log(`  ${p}    `.green)
      console.log(`--------------------------------`.green)
      console.log('')
      routeGroups[prefix].forEach(({ method, path: routePath }) => {
        const m = method.toUpperCase()
        if (m == 'GET') {
          console.log(`GET     `.green + routePath)
        }
        if (m == 'POST') {
          console.log(`POST    `.blue + routePath)
        }
        if (m == 'PUT') {
          console.log(`PUT     `.magenta + routePath)
        }
        if (m == 'DELETE') {
          console.log(`DELETE  `.red + routePath)
        }
        if (m == 'HEAD') {
          console.log(`HEAD    `.gray + routePath)
        }
        if (m == 'OPTIONS') {
          console.log(`OPTIONS `.gray + routePath)
        }
        if (m == 'PATCH') {
          console.log(`PATCH   `.magenta + routePath)
        }
      })
    })
  }
}

export class RouteListCommand implements Command {
  constructor(private readonly omit?: string) {}

  async run(): Promise<void> {
    const config = configService.getConfig()
    if (config.fileBasedRouting) {
      await listFilebasedRoutes([], {}, this.omit)
    } else {
      await listRoutes()
    }
  }
}
