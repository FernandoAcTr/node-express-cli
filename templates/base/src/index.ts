import fs from 'fs'
import express, { Router } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import logger from './utils/logger'
import rateLimiter from './middlewares/rate_limiter.js'
import handleErrorMiddleware from './middlewares/error_handler'
import { config } from './config'

console.debug('Applied config: ', config)

async function initRoutes(router: Router, path: string[]) {
  const BASE_FILE_PATH = `${__dirname}/modules`
  const currentDir = [BASE_FILE_PATH, ...path].join('/').replace('//', '/')
  for await (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      initRoutes(router, [...path, entry.name])
    } else if (entry.name.includes('routes')) {
      const r = (await import(`${currentDir}/${entry.name}` + '')).default as Router
      r.stack.forEach((layer) => {
        const controller = layer.route?.stack[layer.route?.stack.length - 1]
        const path = layer.route?.path
        logger.debug(`${controller?.method.toUpperCase()} ${path}`)
      })
      router.use(r)
    }
  }
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