import fs from 'fs'
import path from 'path'
import { Router } from 'express'
import logger from '../utils/logger'

export function registerRoutes(router: Router): void {
  void initFileBasedRoutes(router, [])
}

function buildURLPath(segments: string[]) {
  const final = segments.map((val) => (val.startsWith('[') && val.endsWith(']') ? `:${val.slice(1, val.length - 1)}` : val))
  return ('/' + final.join('/').replace('//', '')).replace('//', '/')
}

async function initFileBasedRoutes(router: Router, segments: string[]) {
  const BASE_FILE_PATH = path.resolve(__dirname, '../routes')
  const currentDir = path.join(BASE_FILE_PATH, ...segments)

  for await (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      initFileBasedRoutes(router, [...segments, entry.name])
    } else if (entry.name.endsWith('.js')) {
      const controller = (await import(`${currentDir}/${entry.name}` + '')).default as RestController
      if (!controller) {
        continue
      }

      const resourceName = entry.name == 'index.js' ? '/' : entry.name.slice(0, entry.name.length - 3)
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
