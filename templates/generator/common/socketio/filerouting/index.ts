import 'module-alias/register.js'
import fs from 'fs'
import express, { Router } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import logger from './utils/logger'
import rateLimiter from './middlewares/rate_limiter.js'
import handleErrorMiddleware from './middlewares/error_handler'
import { config } from './config'
import SocketIO from './socket'

console.debug('Applied config: ', config)

function buildURLPath(path: string[]) {
  const final = path.map((val) => (val.startsWith('[') && val.endsWith(']') ? `:${val.slice(1, val.length - 1)}` : val))
  return ('/' + final.join('/').replace('//', '')).replace('//', '/')
}

async function initFileBasedRoutes(router: Router, path: string[]) {
  const BASE_FILE_PATH = `${__dirname}/routes`
  const currentDir = [BASE_FILE_PATH, ...path].join('/').replace('//', '/')
  for await (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      initFileBasedRoutes(router, [...path, entry.name])
    } else if (entry.name.endsWith('.js')) {
      const controller = (await import(`${currentDir}/${entry.name}` + '')).default as RestController
      if (!controller) {
        continue
      }
      const resourceName = entry.name == 'index.js' ? '/' : entry.name.slice(0, entry.name.length - 3)
      const url = buildURLPath([...path, resourceName])
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

const app = express()
const router = express.Router()

initFileBasedRoutes(router, [])

app.use(morgan('[:date[iso]] (:status) ":method :url HTTP/:http-version" :response-time ms - [:res[content-length]]'))
app.use(cors({ origin: '*' }))
app.use(rateLimiter)
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(router)
app.use(handleErrorMiddleware)

export const server = app.listen(config.PORT, () => {
  logger.info(`🚀 Server listen on port ${config.PORT}`)
})

const socket = new SocketIO(server)
