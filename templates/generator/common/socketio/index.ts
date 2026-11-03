import fs from 'fs'
import express, { Router } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import logger from './utils/logger'
import rateLimiter from './middlewares/rate_limiter.js'
import handleErrorMiddleware, { NotFound } from './middlewares/error_handler'
import { colorize } from './utils/colorize'
import { config } from './config'
import SocketIO from './socket'

console.debug('Applied config: ', config)

async function initRoutes(router: Router, path: string[]) {
  const BASE_FILE_PATH = `${__dirname}/modules`
  const currentDir = [BASE_FILE_PATH, ...path].join('/').replace('//', '/')
  const colors = {
    GET: 'GREEN',
    POST: 'YELLOW',
    PUT: 'BLUE',
    DELETE: 'RED',
    PATCH: 'CYAN'
  }
  const normalizeRoute = (route: string) => {
    let r = route.replaceAll('//', '/')
    if (!r.startsWith('/')) r = `/${r}`
    if (r.endsWith('/')) r = r.slice(0, -1)
    return r
  }

  // Anonymous routers must precede siblings whose MIDDLEWARES protect the entire shared prefix.
  // Otherwise /projects/public/:token is intercepted by /projects activity/cards auth first.
  const entries = fs.readdirSync(currentDir, { withFileTypes: true }).sort((a, b) => {
    const publicPriority = Number(b.isDirectory() && b.name === 'public') - Number(a.isDirectory() && a.name === 'public')
    return publicPriority || a.name.localeCompare(b.name)
  })

  // First, recurse into subdirectories (routes from inside out).
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await initRoutes(router, [...path, entry.name])
    }
  }

  // Then mount the route files from the current directory.
  for (const entry of entries) {
    if (entry.isDirectory()) continue
    if (!(entry.name.endsWith('.routes.ts') || entry.name.endsWith('.router.ts')) && entry.name !== 'routes.ts' && entry.name !== 'router.ts') continue

    const file = await import(`${currentDir}/${entry.name}` + '')
    const r = file.default as Router
    const middlewares: express.RequestHandler[] = file.MIDDLEWARES || []
    if (middlewares && !Array.isArray(middlewares)) {
      throw new Error(`MIDDLEWARES export in ${[...path, entry.name].join('/')} must be an array of express middlewares`)
    }
    const prefix = file.PREFIX || ''
    if (prefix) console.log('')
    r.stack.forEach((layer) => {
      const controller = layer.route?.stack[layer.route?.stack.length - 1]
      const path = normalizeRoute(`/api/${prefix}${layer.route?.path}`)
      const method = controller?.method.toUpperCase()
      if (method) logger.debug(`${colorize(method, colors[method] || 'WHITE')} ${path}`)
    })

    const route = prefix ? `/api/${prefix}` : '/api'
    router.use(normalizeRoute(route), ...middlewares, r)
  }

  router.use((req, res, next) => {
    if (req.baseUrl.startsWith('/')) return next(NotFound('Route not found'))
    next()
  })
}

const app = express()
const router = express.Router()

initRoutes(router, [])

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
