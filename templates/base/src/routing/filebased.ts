import fs from 'fs'
import path from 'path'
import { Router } from 'express'
import logger from '../utils/logger'
import { buildURLPath, routeResourceName } from '../utils/file_routes'

export function registerRoutes(router: Router): void {
  void initFileBasedRoutes(router, [])
}

async function initFileBasedRoutes(router: Router, segments: string[]) {
  const BASE_FILE_PATH = path.resolve(__dirname, '../routes')
  const currentDir = path.join(BASE_FILE_PATH, ...segments)

  for await (const entry of fs.readdirSync(currentDir, { withFileTypes: true }).sort(compareEntries)) {
    if (entry.isDirectory()) {
      initFileBasedRoutes(router, [...segments, entry.name])
    } else if (entry.name.endsWith('.js')) {
      const controller = (await import(`${currentDir}/${entry.name}` + '')).default as RestController
      if (!controller) {
        continue
      }

      const resourceName = routeResourceName(entry.name)
      const url = buildURLPath([...segments, resourceName])

      if (controller.GET) {
        logger.debug(`GET ${url}`)
        router.get(url, controller.GET)
      }
      if (controller.POST) {
        logger.debug(`POST ${url}`)
        router.post(url, controller.POST)
      }
      if (controller.PUT) {
        logger.debug(`PUT ${url}`)
        router.put(url, controller.PUT)
      }
      if (controller.DELETE) {
        logger.debug(`DELETE ${url}`)
        router.delete(url, controller.DELETE)
      }
      if (controller.HEAD) {
        logger.debug(`HEAD ${url}`)
        router.head(url, controller.HEAD)
      }
      if (controller.OPTIONS) {
        logger.debug(`OPTIONS ${url}`)
        router.options(url, controller.OPTIONS)
      }
      if (controller.PATCH) {
        logger.debug(`PATCH ${url}`)
        router.patch(url, controller.PATCH)
      }
    }
  }
}

/** Las rutas estáticas deben registrarse antes que las dinámicas ([id], [slug]). */
function compareEntries(a: { name: string; isDirectory(): boolean }, b: { name: string; isDirectory(): boolean }): number {
  const aDynamic = a.isDirectory() && a.name.startsWith('[')
  const bDynamic = b.isDirectory() && b.name.startsWith('[')

  return Number(aDynamic) - Number(bDynamic) || a.name.localeCompare(b.name)
}
